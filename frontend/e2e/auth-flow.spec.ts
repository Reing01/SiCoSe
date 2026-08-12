import { expect, test } from "@playwright/test";

test.describe("E2E Integration Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Basic route mocking for authentication state checks
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

    await page.route(
      "**/api/ciudadanos?pagina=1&limite=6&incluir_inactivos=false*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "citizen-1",
                nombre: "Juan",
                apellido: "Perez",
                email: "juan@test.com",
                telefono: "5512345678",
                direccion: "Calle Agua 123",
                zona: "Centro",
                clave_catastral: "CATA-123",
                activo: true,
                created_at: "2026-08-12T00:00:00.000Z",
                updated_at: "2026-08-12T00:00:00.000Z",
              },
            ],
            metadata: {
              total: 1,
              pagina: 1,
              limite: 6,
              totalPaginas: 1,
            },
          }),
        })
      },
    )

    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 204,
      });
    });
  });

  test("login, refresh and logout flow", async ({ page }) => {
    // Mock login endpoint
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

    // Mock dashboard metrics
    await page.route("**/api/dashboard/metricas**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            periodo: "2026-06",
            totalRecaudadoMes: 18450.5,
            totalPendienteMes: 2950,
            porcentajeCobertura: 86.2,
            numeroMorosos: 4,
            comparativoMesAnterior: 12.5,
            totalAdeudosMes: 28,
            adeudosPagadosMes: 19,
            pagosRegistradosMes: 19,
            historicoRecaudacion: [],
            variacion: {
              direccion: "mejora",
              color: "verde",
              montoMesAnterior: 16384.2,
            },
            ultimaActualizacion: new Date().toISOString(),
            cache: { hit: false, ttlSegundos: 300 },
          },
        }),
      });
    });

    // 1. Visit Login
    await page.goto("/login");
    await page
      .getByLabel("Correo institucional", { exact: true })
      .fill("tesorero@sicose.test");
    await page.getByLabel(/Contrase/).fill("Password123!");
    await page.getByRole("button", { name: "Ingresar al panel" }).click();

    // 2. Land on Dashboard
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: /situaci[oó]n financiera del cobro de agua/i }),
    ).toBeVisible();

    // 3. Refresh Page to test session persistence
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: /situaci[oó]n financiera del cobro de agua/i }),
    ).toBeVisible();

    // 4. Logout
    await page.getByRole("button", { name: /Cerrar sesi/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("leads submission from the landing page", async ({ page }) => {
    // Mock leads persistence endpoint
    type LeadPayload = {
      nombre: string;
      comite: string;
      contacto: string;
    };

    const capturedLead: { payload?: LeadPayload } = {};
    await page.route("**/api/leads", async (route) => {
      const requestPayload = route.request().postDataJSON() as LeadPayload;
      capturedLead.payload = requestPayload;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Lead received",
          data: {
            id: "lead-uuid-123",
            ...requestPayload,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    // 1. Visit Landing Page
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Dile adiós/i }),
    ).toBeVisible();

    // 2. Scroll to contact form and fill details
    await page.locator("#landing-contact-nombre").fill("Vecino Vigilante");
    await page
      .locator("#landing-contact-comite")
      .fill("Comité de Agua Potable");
    await page.locator("#landing-contact-contacto").fill("2223334455");

    // 3. Submit Lead Form
    await page.getByRole("button", { name: /Enviar Datos/i }).click();

    // 4. Verify Success message and payload
    await expect(page.getByText(/¡Datos recibidos!/i)).toBeVisible();
    const leadPayload = capturedLead.payload;
    if (!leadPayload) throw new Error("The leads request was not captured");
    expect(leadPayload.nombre).toBe("Vecino Vigilante");
    expect(leadPayload.contacto).toBe("2223334455");
  });

  test("partial payments and double submission resistance", async ({
    page,
  }) => {
    // 1. Login session cookies/storage setup
    await page.goto("/login");
    await page.evaluate(() => {
      window.sessionStorage.setItem("sicose.auth.token", "token-demo");
      window.sessionStorage.setItem(
        "sicose.auth.user",
        JSON.stringify({ email: "tesorero@sicose.test", rol: "tesorero" }),
      );
    });

    // 2. Mock pending debts list: returns $100 initially, and $60 after payment registers
    let paymentRegistered = false;
    await page.route("**/api/adeudos/pendientes*", async (route) => {
      const amount = paymentRegistered ? 60 : 100;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "debt-1",
              ciudadanoId: "citizen-1",
              servicioId: "service-water",
              monto: amount,
              periodo: "2026-06",
              vencimiento: "2026-06-30",
              estado: paymentRegistered ? "parcial" : "pendiente",
              ciudadano: {
                nombre: "Juan",
                apellido: "Perez",
                email: "juan@test.com",
                clave_catastral: "CATA-123",
              },
              servicio: { nombre: "Agua Potable", tarifa: 100 },
            },
          ],
          metadata: {
            total: 1,
            totalPendiente: amount,
          },
        }),
      });
    });

    await page.route("**/api/ciudadanos/citizen-1/historial*", async (route) => {
      const amount = paymentRegistered ? 60 : 100;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            ciudadanoId: "citizen-1",
            adeudos: [
              {
                id: "debt-1",
                periodo: "2026-06",
                monto: amount,
                estado: paymentRegistered ? "parcial" : "pendiente",
                pagado: paymentRegistered,
                servicio: {
                  nombre: "Agua potable",
                },
              },
            ],
            pagos: paymentRegistered
              ? [
                  {
                    id: "payment-folio-1",
                    ciudadanoId: "citizen-1",
                    adeudoId: "debt-1",
                    monto: 40,
                    fecha: new Date().toISOString(),
                    metodo: "efectivo",
                    folio: "SCS-2026-000001",
                    recibo: "SCS-2026-000001",
                    creado_por: "user-1",
                    adeudo: {
                      id: "debt-1",
                      periodo: "2026-06",
                      monto: 100,
                      servicio: {
                        id: "service-water",
                        nombre: "Agua potable",
                        tarifa: 100,
                      },
                    },
                    comprobantes: [],
                  },
                ]
              : [],
            historial: [],
          },
          metadata: {
            totalAdeudos: 1,
            totalPagos: paymentRegistered ? 1 : 0,
            totalMovimientos: paymentRegistered ? 2 : 1,
            filtros: {},
          },
        }),
      });
    });

    // Mock register payment endpoint
    let registerCount = 0;
    await page.route("**/api/pagos", async (route) => {
      const isPost = route.request().method() === "POST";
      if (isPost) {
        registerCount++;
        paymentRegistered = true;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: `payment-folio-${registerCount}`,
            folio: `SCS-2026-00000${registerCount}`,
            monto: 40,
            metodo: "efectivo",
            fecha: new Date().toISOString(),
          },
        }),
      });
    });

    // 3. Navigate to Payments Page
    await page.goto("/pagos");
    await expect(page).toHaveURL(/\/pagos$/);
    await expect(
      page.getByRole("heading", { name: /cobro de agua, historial y comprobantes/i }),
    ).toBeVisible({ timeout: 15000 });

    // Verify select option shows full $100 amount
    const select = page.locator("select#debt");
    await expect(select).toContainText(/100\.00/);

    // 4. Fill in partial payment amount: $40
    const amountInput = page.locator("input#amount");
    await amountInput.fill("40");

    // 5. Submit form and verify button becomes disabled immediately
    const submitBtn = page.getByRole("button", { name: /confirm/i });

    await submitBtn.click();
    await page.waitForTimeout(100);
    await expect(submitBtn).toBeDisabled();

    // Wait for success confirmation
    await expect(page.getByText(/Pago confirmado con folio/i)).toBeVisible();

    // 6. Verify that only one network request was fired to `/api/pagos`
    expect(registerCount).toBe(1);

    // 7. Verify select option was refreshed and now displays the correct remaining $60 balance!
    await expect(select).toContainText(/60\.00/);
  });
});
