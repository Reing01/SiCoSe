import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  replicasConverged,
  updateFailed,
  updateSettled,
} from "./swarm-deploy-utils.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stackFile = resolve(projectRoot, "swarm/stack.yml");
const proxyConfigFile = resolve(projectRoot, "swarm/nginx.conf");

const stackName = process.env.SICOSE_STACK_NAME ?? "sicose";
const backendImage =
  process.env.SICOSE_BACKEND_IMAGE ?? "ghcr.io/reing01/sicose-backend:latest";
const frontendImage =
  process.env.SICOSE_FRONTEND_IMAGE ?? "ghcr.io/reing01/sicose-frontend:latest";
const edgeImage = process.env.SICOSE_EDGE_IMAGE ?? frontendImage;
const postgresDb = process.env.SICOSE_POSTGRES_DB ?? "sicose_prod";
const postgresUser = process.env.SICOSE_POSTGRES_USER ?? "sicose_user";
const backendReplicas = Number(process.env.SICOSE_BACKEND_REPLICAS ?? 12);
const frontendReplicas = Number(process.env.SICOSE_FRONTEND_REPLICAS ?? 12);
const edgeReplicas = Number(process.env.SICOSE_EDGE_REPLICAS ?? 4);
const postgresPassword = process.env.SICOSE_POSTGRES_PASSWORD;
const jwtSecret = process.env.SICOSE_JWT_SECRET;
const supabaseUrl = process.env.SICOSE_SUPABASE_URL;
const supabaseServiceKey = process.env.SICOSE_SUPABASE_SERVICE_KEY;
const ghcrUsername = process.env.GHCR_USERNAME;
const ghcrToken = process.env.GHCR_TOKEN;
const ghcrServer = process.env.GHCR_SERVER ?? "ghcr.io";
const httpPort = Number(process.env.SICOSE_HTTP_PORT ?? 80);
const publicOriginValue =
  process.env.SICOSE_PUBLIC_ORIGIN ?? "http://localhost";

const requiredEnvironment = [
  "SICOSE_POSTGRES_PASSWORD",
  "SICOSE_JWT_SECRET",
  "SICOSE_SUPABASE_URL",
  "SICOSE_SUPABASE_SERVICE_KEY",
];

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    stdio: options.quiet
      ? ["pipe", "pipe", "pipe"]
      : ["pipe", "inherit", "inherit"],
  });

  if (result.error) {
    throw new Error(`No se pudo ejecutar ${command}: ${result.error.message}`);
  }

  if (result.status !== 0 && !options.allowFailure) {
    const detail = result.stderr?.trim();
    throw new Error(
      `Fallo el comando: ${command} ${args.join(" ")}${detail ? `\n${detail}` : ""}`,
    );
  }

  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function resourceName(kind, value) {
  const safeStackName = stackName.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `${safeStackName}_${kind}_${digest(value)}`;
}

function ensureSecret(kind, value) {
  const name = resourceName(kind, value);
  const current = execute("docker", ["secret", "inspect", name], {
    allowFailure: true,
    quiet: true,
  });

  if (current.status !== 0) {
    execute(
      "docker",
      ["secret", "create", "--label", "com.sicose.managed=true", name, "-"],
      { input: value },
    );
  }

  return name;
}

function ensureConfig(kind, value) {
  const name = resourceName(kind, value);
  const current = execute("docker", ["config", "inspect", name], {
    allowFailure: true,
    quiet: true,
  });

  if (current.status !== 0) {
    execute(
      "docker",
      ["config", "create", "--label", "com.sicose.managed=true", name, "-"],
      { input: value },
    );
  }

  return name;
}

function inspectContainerSpec(serviceName) {
  const rawSpec = execute(
    "docker",
    [
      "service",
      "inspect",
      "--format",
      "{{json .Spec.TaskTemplate.ContainerSpec}}",
      serviceName,
    ],
    { quiet: true },
  ).stdout;

  return JSON.parse(rawSpec);
}

function environmentMap(values = []) {
  return new Map(
    values.map((entry) => {
      const separator = entry.indexOf("=");
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    }),
  );
}

function validatePersistentDatabaseConfig(serviceName, deploymentEnvironment) {
  const containerSpec = inspectContainerSpec(serviceName);
  const currentEnvironment = environmentMap(containerSpec.Env);
  const currentPasswordSecret = containerSpec.Secrets?.find(
    (secret) => secret.File?.Name === "postgres_password",
  )?.SecretName;

  if (
    currentEnvironment.get("POSTGRES_DB") !== postgresDb ||
    currentEnvironment.get("POSTGRES_USER") !== postgresUser
  ) {
    throw new Error(
      "No se puede cambiar SICOSE_POSTGRES_DB o SICOSE_POSTGRES_USER sobre el volumen existente. Migra los datos o usa un stack nuevo.",
    );
  }

  if (
    currentPasswordSecret !==
    deploymentEnvironment.SICOSE_POSTGRES_PASSWORD_SECRET
  ) {
    throw new Error(
      "SICOSE_POSTGRES_PASSWORD no coincide con el volumen existente. Rota primero la clave dentro de PostgreSQL o restaura el valor anterior.",
    );
  }
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

async function waitForMigration(serviceName) {
  const deadline = Date.now() + 6 * 60 * 1000;

  while (Date.now() < deadline) {
    const tasks = execute(
      "docker",
      [
        "service",
        "ps",
        "--no-trunc",
        "--format",
        "{{.CurrentState}}|{{.Error}}",
        serviceName,
      ],
      { quiet: true },
    ).stdout;

    if (tasks.split(/\r?\n/).some((line) => line.startsWith("Complete"))) {
      return;
    }

    const terminalFailure = tasks
      .split(/\r?\n/)
      .find((line) => /^(Failed|Rejected)/.test(line));

    if (terminalFailure) {
      throw new Error(`La migracion fallo: ${terminalFailure}`);
    }

    await sleep(3000);
  }

  throw new Error("La migracion no termino dentro de 6 minutos.");
}

async function waitForStack() {
  const expectedServices = [
    `${stackName}_edge`,
    `${stackName}_frontend`,
    `${stackName}_backend`,
    `${stackName}_postgres`,
    `${stackName}_redis`,
  ];
  const deadline = Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline) {
    const output = execute(
      "docker",
      ["stack", "services", "--format", "{{.Name}}|{{.Replicas}}", stackName],
      { quiet: true },
    ).stdout;
    const services = new Map(
      output
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.split("|")),
    );

    const converged = expectedServices.every((name) => {
      const replicas = services.get(name);
      if (!replicas) return false;
      return replicasConverged(replicas);
    });

    if (services.size === expectedServices.length) {
      const updateOutput = execute(
        "docker",
        [
          "service",
          "inspect",
          "--format",
          "{{.Spec.Name}}|{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}",
          ...expectedServices,
        ],
        { quiet: true },
      ).stdout;
      const updateStates = new Map(
        updateOutput
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => line.split("|")),
      );
      const failedService = expectedServices.find((name) =>
        updateFailed(updateStates.get(name)),
      );

      if (failedService) {
        throw new Error(
          `La actualizacion de ${failedService} fallo o fue revertida (${updateStates.get(failedService)}).`,
        );
      }

      const updatesSettled = expectedServices.every((name) =>
        updateSettled(updateStates.get(name)),
      );

      if (converged && updatesSettled) return;
    }

    await sleep(5000);
  }

  throw new Error(
    `El stack no convergio dentro de 10 minutos. Revisa: docker stack services ${stackName}`,
  );
}

async function waitForHttp(path, description, validateResponse) {
  const baseUrl =
    process.env.SICOSE_VERIFY_URL ?? `http://127.0.0.1:${httpPort}`;
  const url = new URL(path, `${baseUrl.replace(/\/+$/, "")}/`);
  const deadline = Date.now() + 3 * 60 * 1000;
  let lastFailure = "sin respuesta";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json, text/html;q=0.9, */*;q=0.8" },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok && (await validateResponse(response))) return;
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    await sleep(3000);
  }

  throw new Error(
    `${description} no quedo saludable en ${url.toString()}: ${lastFailure}`,
  );
}

async function verifyPublishedApplication() {
  await waitForHttp(
    "/routing-mesh-health",
    "El routing mesh",
    async (response) => (await response.text()).trim() === "ok",
  );
  await waitForHttp("/", "El frontend", async (response) =>
    (response.headers.get("content-type") ?? "").includes("text/html"),
  );
  await waitForHttp("/api/health/ready", "El backend", async (response) => {
    const payload = await response.json();
    return payload?.status === "ready";
  });
}

const missing = requiredEnvironment.filter(
  (name) => !process.env[name]?.trim(),
);
if (missing.length > 0) {
  console.error(`Faltan variables obligatorias: ${missing.join(", ")}`);
  process.exit(1);
}

if (
  postgresPassword.length < 12 ||
  /change-me|replace-me/i.test(postgresPassword)
) {
  console.error(
    "SICOSE_POSTGRES_PASSWORD debe tener al menos 12 caracteres y no puede ser un placeholder.",
  );
  process.exit(1);
}

if (jwtSecret.length < 32 || /change-me|replace-me/i.test(jwtSecret)) {
  console.error(
    "SICOSE_JWT_SECRET debe contener al menos 32 caracteres y no puede ser un placeholder.",
  );
  process.exit(1);
}

if (
  supabaseServiceKey.length < 16 ||
  /change-me|replace-me/i.test(supabaseServiceKey)
) {
  console.error(
    "SICOSE_SUPABASE_SERVICE_KEY no puede ser corto ni usar un placeholder.",
  );
  process.exit(1);
}

if ((ghcrUsername && !ghcrToken) || (!ghcrUsername && ghcrToken)) {
  console.error("GHCR_USERNAME y GHCR_TOKEN deben definirse juntos.");
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9_-]*$/.test(stackName)) {
  console.error(
    "SICOSE_STACK_NAME debe usar minusculas, numeros, guiones o guiones bajos.",
  );
  process.exit(1);
}

if (!Number.isInteger(httpPort) || httpPort < 1 || httpPort > 65535) {
  console.error("SICOSE_HTTP_PORT debe ser un puerto valido entre 1 y 65535.");
  process.exit(1);
}

let publicOrigin;
try {
  publicOrigin = new URL(publicOriginValue);
  if (!["http:", "https:"].includes(publicOrigin.protocol)) throw new Error();
} catch {
  console.error("SICOSE_PUBLIC_ORIGIN debe ser una URL HTTP o HTTPS valida.");
  process.exit(1);
}

if (
  ![backendReplicas, frontendReplicas, edgeReplicas].every(
    (replicas) => Number.isInteger(replicas) && replicas > 0,
  )
) {
  console.error(
    "SICOSE_BACKEND_REPLICAS, SICOSE_FRONTEND_REPLICAS y SICOSE_EDGE_REPLICAS deben ser enteros positivos.",
  );
  process.exit(1);
}

let migrationService = "";

try {
  const swarmState = execute(
    "docker",
    [
      "info",
      "--format",
      "{{.Swarm.LocalNodeState}}|{{.Swarm.ControlAvailable}}",
    ],
    { quiet: true },
  ).stdout;

  if (swarmState !== "active|true") {
    throw new Error(
      "Ejecuta este despliegue desde un nodo manager activo de Docker Swarm.",
    );
  }

  const nodes = execute(
    "docker",
    ["node", "ls", "--format", "{{.Status}}|{{.Availability}}"],
    { quiet: true },
  )
    .stdout.split(/\r?\n/)
    .filter((node) => node.toLowerCase() === "ready|active");

  const requiredNodes = Math.max(
    Math.ceil(backendReplicas / 3),
    Math.ceil(frontendReplicas / 3),
    edgeReplicas,
  );

  if (nodes.length < requiredNodes) {
    throw new Error(
      `Hay ${nodes.length} nodos Ready/Active, pero la distribucion configurada requiere ${requiredNodes}.`,
    );
  }

  if (ghcrUsername && ghcrToken) {
    console.log(`Autenticando el manager en ${ghcrServer}...`);
    execute(
      "docker",
      ["login", ghcrServer, "--username", ghcrUsername, "--password-stdin"],
      { input: ghcrToken },
    );
  }

  const encodedUser = encodeURIComponent(postgresUser);
  const encodedPassword = encodeURIComponent(postgresPassword);
  const encodedDatabase = encodeURIComponent(postgresDb);
  const databaseUrl = `postgresql://${encodedUser}:${encodedPassword}@postgres:5432/${encodedDatabase}`;
  const proxyConfig = readFileSync(proxyConfigFile, "utf8");

  const deploymentEnvironment = {
    ...process.env,
    SICOSE_PUBLIC_ORIGIN: publicOriginValue,
    SICOSE_COOKIE_SECURE: String(publicOrigin.protocol === "https:"),
    SICOSE_BACKEND_IMAGE: backendImage,
    SICOSE_FRONTEND_IMAGE: frontendImage,
    SICOSE_EDGE_IMAGE: edgeImage,
    SICOSE_POSTGRES_PASSWORD_SECRET: resourceName(
      "postgres_password",
      postgresPassword,
    ),
    SICOSE_DATABASE_URL_SECRET: resourceName("database_url", databaseUrl),
    SICOSE_JWT_SECRET_NAME: resourceName("jwt_secret", jwtSecret),
    SICOSE_SUPABASE_URL_SECRET: resourceName("supabase_url", supabaseUrl),
    SICOSE_SUPABASE_SERVICE_KEY_SECRET: resourceName(
      "supabase_service_key",
      supabaseServiceKey,
    ),
    SICOSE_EDGE_PROXY_CONFIG: resourceName("edge_proxy", proxyConfig),
  };

  const databaseIdentity = JSON.stringify({
    database: postgresDb,
    user: postgresUser,
    passwordSecret: deploymentEnvironment.SICOSE_POSTGRES_PASSWORD_SECRET,
  });
  const databaseIdentityConfig = resourceName(
    "database_identity",
    databaseIdentity,
  );

  const postgresService = `${stackName}_postgres`;
  const stackExists =
    execute("docker", ["service", "inspect", postgresService], {
      allowFailure: true,
      quiet: true,
    }).status === 0;
  const postgresVolumeExists =
    execute("docker", ["volume", "inspect", `${stackName}_postgres_data`], {
      allowFailure: true,
      quiet: true,
    }).status === 0;
  const databaseIdentityExists =
    execute("docker", ["config", "inspect", databaseIdentityConfig], {
      allowFailure: true,
      quiet: true,
    }).status === 0;

  if (stackExists) {
    validatePersistentDatabaseConfig(postgresService, deploymentEnvironment);
  } else if (postgresVolumeExists && !databaseIdentityExists) {
    throw new Error(
      `El volumen ${stackName}_postgres_data existe sin un servicio o metadato de identidad verificable. Recupera el stack con sus credenciales originales o usa otro SICOSE_STACK_NAME.`,
    );
  }

  ensureSecret("postgres_password", postgresPassword);
  ensureSecret("database_url", databaseUrl);
  ensureSecret("jwt_secret", jwtSecret);
  ensureSecret("supabase_url", supabaseUrl);
  ensureSecret("supabase_service_key", supabaseServiceKey);
  ensureConfig("edge_proxy", proxyConfig);
  ensureConfig("database_identity", databaseIdentity);

  if (!stackExists) {
    console.log("Creando las redes y los servicios de datos...");
    execute("docker", ["stack", "deploy", "-c", stackFile, stackName], {
      env: {
        ...deploymentEnvironment,
        SICOSE_EDGE_REPLICAS: "0",
        SICOSE_FRONTEND_REPLICAS: "0",
        SICOSE_BACKEND_REPLICAS: "0",
      },
    });
  }

  migrationService = `${stackName}_migrate_${Date.now()}`;
  console.log("Ejecutando una unica migracion de base de datos...");
  const migrationScript = [
    'export DATABASE_URL="$(cat /run/secrets/database_url)"',
    'export DIRECT_URL="$DATABASE_URL"',
    "attempt=0",
    "until node node_modules/prisma/build/index.js migrate deploy; do",
    "  attempt=$((attempt + 1))",
    '  if [ "$attempt" -ge 60 ]; then exit 1; fi',
    "  sleep 5",
    "done",
  ].join("\n");
  const migrationArgs = [
    "service",
    "create",
    "--detach",
    "--quiet",
    "--name",
    migrationService,
    "--network",
    `${stackName}_data`,
    "--secret",
    `source=${deploymentEnvironment.SICOSE_DATABASE_URL_SECRET},target=database_url`,
    "--restart-condition",
    "none",
    "--constraint",
    "node.role==manager",
  ];
  migrationArgs.push("--with-registry-auth");
  migrationArgs.push(backendImage, "/bin/sh", "-ec", migrationScript);
  execute("docker", migrationArgs);
  await waitForMigration(migrationService);
  execute("docker", ["service", "rm", migrationService]);
  migrationService = "";

  console.log("Desplegando SiCoSe sobre el routing mesh...");
  const deployArgs = [
    "stack",
    "deploy",
    "--prune",
    "--resolve-image",
    "always",
  ];
  deployArgs.push("--with-registry-auth");
  deployArgs.push("-c", stackFile, stackName);
  execute("docker", deployArgs, { env: deploymentEnvironment });

  console.log("Esperando a que todas las replicas esten disponibles...");
  await waitForStack();

  console.log(
    "Verificando routing mesh, frontend, backend, PostgreSQL y Redis...",
  );
  await verifyPublishedApplication();

  const port = deploymentEnvironment.SICOSE_HTTP_PORT ?? "80";
  console.log(
    `Despliegue completado. Routing mesh disponible en el puerto ${port} de cada nodo.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (migrationService) {
    console.error(
      `La tarea se conservo para diagnostico: docker service logs ${migrationService}`,
    );
  }
  process.exit(1);
}
