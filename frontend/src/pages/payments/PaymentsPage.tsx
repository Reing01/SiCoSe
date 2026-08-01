import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import RoutePills from "../../components/RoutePills";
import ThemeToggle from "../../components/ThemeToggle";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { logout } from "../../features/auth/auth.api";
import {
  clearAuthSession,
  readAuthSession,
} from "../../features/auth/auth.session";
import { useTheme } from "../../features/theme/theme-context";
import {
  fetchPendingDebts,
  registerPayment,
  type PendingDebtRecord,
  type PaymentRecord,
} from "../../features/payments/payment.api";
import { cn } from "../../lib/utils";

type PaymentMethod = "efectivo" | "transferencia";
type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; debts: PendingDebtRecord[]; totalPending: number }
  | { kind: "error"; message: string };

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export default function PaymentsPage() {
  const { theme } = useTheme();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<PaymentRecord | null>(null);

  const selectedDebt = useMemo(() => {
    if (state.kind !== "ready") {
      return null;
    }

    return state.debts.find((debt) => debt.id === selectedDebtId) ?? null;
  }, [selectedDebtId, state]);

  useEffect(() => {
    const session = readAuthSession();

    if (!session) {
      setState({
        kind: "error",
        message: "Inicia sesion para registrar pagos.",
      });
      return;
    }

    fetchPendingDebts(session.token)
      .then((response) => {
        setState({
          kind: "ready",
          debts: response.data,
          totalPending: response.metadata.totalPendiente,
        });

        const firstDebt = response.data[0];
        if (firstDebt) {
          setSelectedDebtId(firstDebt.id);
          setAmount(String(firstDebt.monto));
        }
      })
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "No fue posible cargar los adeudos pendientes.",
        });
      });
  }, []);

  const handleLogout = async () => {
    const session = readAuthSession();

    try {
      if (session) {
        await logout(session.token);
      }
    } finally {
      clearAuthSession();
      window.location.assign("/login");
    }
  };

  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReceipt(event.target.files?.[0] ?? null);
    setMessage(null);
  };

  const handleDebtChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const debtId = event.target.value;
    setSelectedDebtId(debtId);

    if (state.kind === "ready") {
      const debt = state.debts.find((item) => item.id === debtId);
      setAmount(debt ? String(debt.monto) : "");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submitButton = event.currentTarget.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    if (submitButton) {
      if (
        submitButton.getAttribute("data-submitting") === "true" ||
        submitButton.disabled
      ) {
        return;
      }
      submitButton.setAttribute("data-submitting", "true");
      submitButton.disabled = true;
    }

    const session = readAuthSession();

    if (!session || !selectedDebt) {
      if (submitButton) {
        submitButton.removeAttribute("data-submitting");
        submitButton.disabled = false;
      }
      setMessage("Selecciona un adeudo pendiente para continuar.");
      return;
    }

    if (method === "transferencia" && !receipt) {
      if (submitButton) {
        submitButton.removeAttribute("data-submitting");
        submitButton.disabled = false;
      }
      setMessage("Adjunta un comprobante antes de confirmar la transferencia.");
      return;
    }

    setIsSubmitting(true);
    setMessage(
      method === "transferencia"
        ? "Subiendo comprobante y registrando pago..."
        : "Registrando pago...",
    );
    setSuccess(null);

    try {
      const payment = await registerPayment(session.token, {
        metodo: method,
        ciudadanoId: selectedDebt.ciudadanoId,
        adeudoId: selectedDebt.id,
        monto: Number(amount),
        referenciaBancaria: reference,
        comprobante: receipt ?? undefined,
      });

      setSuccess(payment);
      setMessage(`Pago confirmado con folio ${payment.folio ?? payment.id}.`);
      setState((current) => {
        if (current.kind !== "ready") {
          return current;
        }

        const nextDebts = current.debts
          .map((debt) => {
            if (debt.id === selectedDebt.id) {
              const remaining = Math.max(0, debt.monto - Number(amount));
              return { ...debt, monto: remaining };
            }
            return debt;
          })
          .filter((debt) => debt.monto > 0.001);

        const nextDebt =
          nextDebts.find((debt) => debt.id === selectedDebt.id) || nextDebts[0];
        setSelectedDebtId(nextDebt?.id ?? "");
        setAmount(nextDebt ? String(nextDebt.monto) : "");

        return {
          ...current,
          debts: nextDebts,
          totalPending: Math.max(0, current.totalPending - Number(amount)),
        };
      });
      setReceipt(null);
      setReference("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el pago.",
      );
    } finally {
      setIsSubmitting(false);
      if (submitButton) {
        submitButton.removeAttribute("data-submitting");
        submitButton.disabled = false;
      }
    }
  };

  return (
    <main
      className={cn(
        "min-h-screen animate-fade-in",
        theme === "dark"
          ? "bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100"
          : "bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900",
      )}
    >
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <a
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f3042] text-sm font-bold text-white">
            SC
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042] dark:text-sky-300">
              SiCoSe
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Cobranza
            </p>
          </div>
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <RoutePills variant={theme === "dark" ? "light" : "dark"} />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#0f3042] dark:text-sky-300">
            Pagos
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Captura de pagos
          </h1>
        </div>

        {state.kind === "loading" ? (
          <Card>
            <CardContent className="p-6">
              Cargando adeudos pendientes...
            </CardContent>
          </Card>
        ) : null}

        {state.kind === "error" ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-6 text-rose-800">
              {state.message}
            </CardContent>
          </Card>
        ) : null}

        {state.kind === "ready" ? (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Adeudos pendientes</CardTitle>
                <CardDescription>
                  {state.debts.length} adeudos cargados,{" "}
                  {formatCurrency(state.totalPending)} por cobrar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="debt">Adeudo</Label>
                <select
                  id="debt"
                  value={selectedDebtId}
                  onChange={handleDebtChange}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {state.debts.map((debt) => (
                    <option key={debt.id} value={debt.id}>
                      {debt.ciudadano.nombre} {debt.ciudadano.apellido} -{" "}
                      {debt.servicio.nombre} - {debt.periodo} -{" "}
                      {formatCurrency(debt.monto)}
                    </option>
                  ))}
                </select>
                {selectedDebt ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="font-semibold">
                      {selectedDebt.ciudadano.nombre}{" "}
                      {selectedDebt.ciudadano.apellido}
                    </p>
                    <p>
                      {selectedDebt.servicio.nombre} - {selectedDebt.periodo}
                    </p>
                    <p className="font-semibold text-[#0f3042] dark:text-sky-300">
                      {formatCurrency(selectedDebt.monto)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registrar pago</CardTitle>
                <CardDescription>
                  El folio se genera al confirmar el pago definitivo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="flex gap-2">
                    {(["efectivo", "transferencia"] as const).map((item) => (
                      <Button
                        key={item}
                        type="button"
                        variant={method === item ? "default" : "outline"}
                        onClick={() => setMethod(item)}
                      >
                        {item === "efectivo" ? "Efectivo" : "Transferencia"}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>

                  {method === "transferencia" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="reference">Referencia bancaria</Label>
                        <Input
                          id="reference"
                          value={reference}
                          onChange={(event) => setReference(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="receipt">Comprobante</Label>
                        <Input
                          id="receipt"
                          type="file"
                          accept="image/png,image/jpeg,application/pdf"
                          onChange={handleReceiptChange}
                        />
                        {receipt ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
                            <span>{receipt.name} listo para subir</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setReceipt(null)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {message ? (
                    <div
                      role={success ? "status" : "alert"}
                      className={cn(
                        "rounded-xl border p-4 text-sm",
                        success
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800",
                      )}
                    >
                      {message}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm dark:bg-slate-950">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                        Exito
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {success.folio ?? success.id}
                      </p>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || !selectedDebt}
                  >
                    {isSubmitting ? "Confirmando..." : "Confirmar pago"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
