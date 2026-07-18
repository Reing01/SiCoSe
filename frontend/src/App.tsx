import { useEffect, useState, lazy, Suspense } from "react";
import {
  readAuthSession,
  persistAuthSession,
  clearAuthSession,
} from "./features/auth/auth.session";
import { resolveAppRoute } from "./features/auth/auth.routing";
import { ThemeProvider } from "./features/theme/theme";
import { getCurrentUser } from "./features/auth/auth.api";

const LandingPage = lazy(() => import("./LandingPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const CitizenManagementPage = lazy(
  () => import("./pages/citizens/CitizenManagementPage"),
);
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));

type SessionValidationState = "idle" | "validating" | "success" | "error";

function AppFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06131f] text-white animate-fade-in">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#06131f_0%,#0f3042_45%,#081a28_100%)]" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent shadow-lg shadow-[#f97316]/20" />
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">
          Cargando interfaz...
        </p>
      </div>
    </main>
  );
}

export default function App() {
  const pathname =
    typeof window !== "undefined"
      ? window.location.pathname.replace(/\/+$/, "") || "/"
      : "/";
  const session = readAuthSession();
  const resolvedRoute = resolveAppRoute(pathname, session);

  const [validationState, setValidationState] =
    useState<SessionValidationState>(session ? "validating" : "idle");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (resolvedRoute !== pathname) {
      window.location.replace(resolvedRoute);
    }
  }, [pathname, resolvedRoute]);

  useEffect(() => {
    if (!session) {
      setValidationState("idle");
      return;
    }

    let active = true;

    setValidationState("validating");
    getCurrentUser(session.token)
      .then((realSession) => {
        if (!active) return;

        if (realSession.user.rol !== session.user.rol) {
          persistAuthSession(realSession);
          window.location.reload();
          setValidationState("error");
        } else {
          setValidationState("success");
        }
      })
      .catch(() => {
        if (!active) return;
        clearAuthSession();
        setValidationState("error");
        if (resolvedRoute === "/dashboard" || resolvedRoute === "/ciudadanos") {
          window.location.replace("/login");
        } else {
          window.location.reload();
        }
      });

    return () => {
      active = false;
    };
  }, [session?.token, session?.user.rol, resolvedRoute]);

  // Show a beautiful loading screen when validating a session
  if (validationState === "validating") {
    return (
      <ThemeProvider>
        <AppFallback />
      </ThemeProvider>
    );
  }

  // If validation failed or is error, return empty layout while redirecting
  if (validationState === "error") {
    return null;
  }

  return (
    <ThemeProvider>
      <Suspense fallback={<AppFallback />}>
        {resolvedRoute === "/login" ? (
          <LoginPage />
        ) : resolvedRoute === "/ciudadanos" ? (
          <CitizenManagementPage />
        ) : resolvedRoute === "/dashboard" ? (
          <DashboardPage />
        ) : (
          <LandingPage />
        )}
      </Suspense>
    </ThemeProvider>
  );
}
