import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const namespace = process.env.SICOSE_NAMESPACE ?? 'sicose-prod'
const release = process.env.SICOSE_RELEASE ?? 'sicose'
const chartPath = process.env.SICOSE_CHART_PATH ?? './helm/sicose'
const baseValuesPath =
  process.env.SICOSE_BASE_VALUES_PATH ?? './helm/sicose/values-practica-4-nodos.yaml'
const ingressHost = process.env.SICOSE_INGRESS_HOST ?? 'sicose-practica.local'
const corsOrigin = process.env.SICOSE_CORS_ORIGIN ?? `http://${ingressHost}`
const jwtSecret = process.env.SICOSE_JWT_SECRET
const postgresPassword = process.env.SICOSE_POSTGRES_PASSWORD
const supabaseUrl = process.env.SICOSE_SUPABASE_URL
const supabaseServiceKey = process.env.SICOSE_SUPABASE_SERVICE_KEY
const ghcrUsername = process.env.GHCR_USERNAME
const ghcrToken = process.env.GHCR_TOKEN
const ghcrServer = process.env.GHCR_SERVER ?? 'ghcr.io'
const imagePullSecret = process.env.SICOSE_IMAGE_PULL_SECRET ?? 'ghcr-secret'

const requiredEnv = [
  'SICOSE_JWT_SECRET',
  'SICOSE_POSTGRES_PASSWORD',
  'SICOSE_SUPABASE_URL',
  'SICOSE_SUPABASE_SERVICE_KEY',
]

const missing = requiredEnv.filter((key) => !process.env[key])
let tempDir = ''

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    input: options.input,
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(`Falló el comando: ${command} ${args.join(' ')}`)
  }

  return result.stdout?.trim() ?? ''
}

function yamlQuote(value) {
  return JSON.stringify(value ?? '')
}

function buildOverrideYaml() {
  const lines = []

  if (ghcrUsername && ghcrToken) {
    lines.push('imagePullSecrets:')
    lines.push(`  - name: ${imagePullSecret}`)
  } else {
    lines.push('imagePullSecrets: []')
  }

  lines.push('ingress:')
  lines.push(`  host: ${yamlQuote(ingressHost)}`)
  lines.push('config:')
  lines.push(`  corsOrigin: ${yamlQuote(corsOrigin)}`)
  lines.push('secrets:')
  lines.push(`  jwtSecret: ${yamlQuote(jwtSecret)}`)
  lines.push(`  postgresPassword: ${yamlQuote(postgresPassword)}`)
  lines.push(`  supabaseUrl: ${yamlQuote(supabaseUrl)}`)
  lines.push(`  supabaseServiceKey: ${yamlQuote(supabaseServiceKey)}`)

  return `${lines.join('\n')}\n`
}

function ensureCommandAvailable(command) {
  const probe = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: false,
  })

  if (probe.error) {
    throw new Error(`No se encontró el comando requerido: ${command}`)
  }
}

if (missing.length > 0) {
  console.error(
    `Faltan variables obligatorias: ${missing.join(', ')}.\n` +
      'Defínelas en tu sesión local antes de ejecutar el bootstrap.',
  )
  process.exit(1)
}

if ((ghcrUsername && !ghcrToken) || (!ghcrUsername && ghcrToken)) {
  console.error(
    'Para crear el imagePullSecret de GHCR debes definir `GHCR_USERNAME` y `GHCR_TOKEN` al mismo tiempo.',
  )
  process.exit(1)
}

try {
  ensureCommandAvailable('kubectl')
  ensureCommandAvailable('helm')

  console.log(`Validando acceso al clúster para el namespace ${namespace}...`)
  const nodeOutput = run('kubectl', ['get', 'nodes', '--no-headers'])
  const nodeCount = nodeOutput ? nodeOutput.split(/\r?\n/).filter(Boolean).length : 0
  if (nodeCount < 4) {
    console.warn(
      `Aviso: solo se detectaron ${nodeCount} nodos. La práctica está pensada para 4 máquinas.`,
    )
  }

  try {
    run('kubectl', ['get', 'namespace', namespace])
  } catch {
    console.log(`Creando namespace ${namespace}...`)
    run('kubectl', ['create', 'namespace', namespace])
  }

  if (ghcrUsername && ghcrToken) {
    console.log(`Actualizando imagePullSecret ${imagePullSecret}...`)
    const secretYaml = run('kubectl', [
      '-n',
      namespace,
      'create',
      'secret',
      'docker-registry',
      imagePullSecret,
      `--docker-server=${ghcrServer}`,
      `--docker-username=${ghcrUsername}`,
      `--docker-password=${ghcrToken}`,
      '--dry-run=client',
      '-o',
      'yaml',
    ])

    run('kubectl', ['apply', '-f', '-'], { input: secretYaml })
  }

  tempDir = mkdtempSync(join(tmpdir(), 'sicose-4nodos-'))
  const overridePath = join(tempDir, 'values.local.yaml')
  writeFileSync(overridePath, buildOverrideYaml(), 'utf8')

  console.log('Aplicando despliegue de Helm para la práctica de 4 nodos...')
  run('helm', [
    'upgrade',
    '--install',
    release,
    chartPath,
    '--namespace',
    namespace,
    '--create-namespace',
    '-f',
    baseValuesPath,
    '-f',
    overridePath,
    '--wait',
    '--wait-for-jobs',
    '--atomic',
    '--timeout',
    '15m',
  ])

  console.log('Despliegue completado correctamente.')
  console.log(`Namespace: ${namespace}`)
  console.log(`Release: ${release}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  if (tempDir) {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Limpieza no crítica.
    }
  }
}
