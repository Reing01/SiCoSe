import { expect, test } from '@playwright/test'

test('login, dashboard and export flow stays connected', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Sesion iniciada correctamente.',
        data: {
          token: 'token-demo',
          user: {
            email: 'tesorero@sicose.test',
            rol: 'tesorero',
          },
        },
      }),
    })
  })

  await page.route('**/api/dashboard/metricas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          periodo: '2026-06',
          totalRecaudadoMes: 18450.5,
          porcentajeCobertura: 86.2,
          numeroMorosos: 4,
          comparativoMesAnterior: 12.5,
          totalAdeudosMes: 28,
          pagosRegistradosMes: 19,
          variacion: {
            direccion: 'mejora',
            color: 'verde',
            montoMesAnterior: 16384.2,
          },
          ultimaActualizacion: new Date().toISOString(),
          cache: {
            hit: false,
            ttlSegundos: 300,
          },
        },
      }),
    })
  })

  await page.route('**/api/reportes/exportar', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Monthly report export generated',
        data: {
          periodo: '2026-06',
          formato: 'xlsx',
          archivo_url: 'https://example.test/reportes/reporte-mensual-2026-06.xlsx',
          archivo_path: 'reportes/2026-06/reporte-mensual-2026-06.xlsx',
        },
      }),
    })
  })

  await page.goto('/login')
  await expect(
    page.getByRole('heading', {
      name: 'Acceso seguro al panel principal de la junta auxiliar',
    }),
  ).toBeVisible()

  await page.getByLabel('Correo institucional', { exact: true }).fill('tesorero@sicose.test')
  await page.getByLabel(/Contrase/).fill('Password123!')
  await page.getByRole('button', { name: 'Ingresar al panel' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Situacion financiera del mes')).toBeVisible()

  await page.getByRole('button', { name: 'Exportar Excel' }).click()
  await expect(page.getByText(/Exportaci[oó]n Excel lista/)).toBeVisible()

  await page.getByRole('button', { name: /Cerrar sesi/ }).click()
  await expect(page).toHaveURL(/\/login$/)
})
