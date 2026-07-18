import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Helper function to ensure screenshots directory exists
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

test("login, dashboard and export flow stays connected", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Sesion iniciada correctamente.",
        data: {
          token: "token-demo",
          user: {
            email: "tesorero@sicose.test",
            rol: "tesorero",
          },
        },
      }),
    });
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "user-3",
          email: "tesorero@sicose.test",
          nombre: "Tesoreria",
          rol: "tesorero",
          activo: true,
        },
      }),
    });
  });

  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Sesion cerrada correctamente." }),
    });
  });

  await page.route("**/api/dashboard/metricas", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          periodo: "2026-06",
          totalRecaudadoMes: 18450.5,
          porcentajeCobertura: 86.2,
          numeroMorosos: 4,
          comparativoMesAnterior: 12.5,
          totalAdeudosMes: 28,
          pagosRegistradosMes: 19,
          variacion: {
            direccion: "mejora",
            color: "verde",
            montoMesAnterior: 16384.2,
          },
          ultimaActualizacion: new Date().toISOString(),
          cache: {
            hit: false,
            ttlSegundos: 300,
          },
        },
      }),
    });
  });

  await page.route("**/api/reportes/exportar", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Monthly report export generated",
        data: {
          periodo: "2026-06",
          formato: "xlsx",
          archivo_url:
            "https://example.test/reportes/reporte-mensual-2026-06.xlsx",
          archivo_path: "reportes/2026-06/reporte-mensual-2026-06.xlsx",
        },
      }),
    });
  });

  await page.goto("/login");
  await expect(
    page.getByRole("heading", {
      name: "Acceso seguro al panel principal de la junta auxiliar",
    }),
  ).toBeVisible();

  await page
    .getByLabel("Correo institucional", { exact: true })
    .fill("tesorero@sicose.test");
  await page.getByLabel(/Contrase/).fill("Password123!");
  await page.getByRole("button", { name: "Ingresar al panel" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Situacion financiera del mes")).toBeVisible();

  await page.getByRole("button", { name: "Exportar Excel" }).click();
  await expect(page.getByText(/Exportaci/)).toBeVisible();

  await page.getByRole("button", { name: /Cerrar sesi/ }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("UI fallback loading state is captured", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Intercept the login page JS chunk and delay it to guarantee fallback rendering
  await page.route("**/LoginPage-*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });

  // Navigate to login
  await page.goto("/login");

  // Wait 600ms to allow the dark layout and animated loading spinner to fully render
  await page.waitForTimeout(600);

  // Take high-resolution screenshot
  const filePath = "e2e/screenshots/fallback_loading_ui.png";
  ensureDirectoryExistence(filePath);
  await page.screenshot({ path: filePath });
});

test("Paginated citizens table UI is captured", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Sesion iniciada correctamente.",
        data: {
          token: "token-sec",
          user: {
            email: "secretaria@sicose.test",
            rol: "secretaria",
          },
        },
      }),
    });
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "user-2",
          email: "secretaria@sicose.test",
          nombre: "Secretaria",
          rol: "secretaria",
          activo: true,
        },
      }),
    });
  });

  // Mock returning a list of 15 citizens to trigger pagination (>10 records)
  await page.route("**/api/ciudadanos*", async (route) => {
    const list = Array.from({ length: 15 }, (_, i) => ({
      id: `CIUD-00${i + 1}`,
      nombre: `Ciudadano ${i + 1}`,
      apellido: `Test`,
      email: `ciudadano${i + 1}@sicose.test`,
      telefono: `22233344${i}`,
      direccion: `Calle Falsa ${i + 100}`,
      claveCatastral: `CATA-00${i + 1}`,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: list,
        metadata: {
          total: list.length,
          pagina: 1,
          limite: 100,
          totalPaginas: 1,
        },
      }),
    });
  });

  // Navigate to login and log in as secretaria
  await page.goto("/login");
  await page
    .getByLabel("Correo institucional", { exact: true })
    .fill("secretaria@sicose.test");
  await page.getByLabel(/Contrase/).fill("SiCoSe2026!");
  await page.getByRole("button", { name: "Ingresar al panel" }).click();

  // Wait to land on /ciudadanos
  await expect(page).toHaveURL(/\/ciudadanos$/);

  // Wait for network requests to finish and content to render under dark theme
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // Take high-resolution screenshot showing pagination footer
  const filePath = "e2e/screenshots/paginated_citizens_table.png";
  ensureDirectoryExistence(filePath);
  await page.screenshot({ path: filePath });
});
