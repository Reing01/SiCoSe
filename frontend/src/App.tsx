import { useEffect } from "react";
import LandingPage from "./LandingPage";
import {
  readAuthSession,
  persistAuthSession,
  clearAuthSession,
} from "./features/auth/auth.session";
import { resolveAppRoute } from "./features/auth/auth.routing";
import { ThemeProvider } from "./features/theme/theme";
import { getCurrentUser } from "./features/auth/auth.api";
import LoginPage from "./pages/auth/LoginPage";
import CitizenManagementPage from "./pages/citizens/CitizenManagementPage";
import DashboardPage from "./pages/dashboard/DashboardPage";

export default function App() {
  const pathname =
    typeof window !== "undefined"
      ? window.location.pathname.replace(/\/+$/, "") || "/"
      : "/";
  const session = readAuthSession();
  const resolvedRoute = resolveAppRoute(pathname, session);

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
      return;
    }

    let active = true;

    getCurrentUser(session.token)
      .then((realSession) => {
        if (!active) return;

        if (realSession.user.rol !== session.user.rol) {
          persistAuthSession(realSession);
          window.location.reload();
        }
      })
      .catch(() => {
        if (!active) return;
        clearAuthSession();
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

  return (
    <ThemeProvider>
      {resolvedRoute === "/login" ? (
        <LoginPage />
      ) : resolvedRoute === "/ciudadanos" ? (
        <CitizenManagementPage />
      ) : resolvedRoute === "/dashboard" ? (
        <DashboardPage />
      ) : (
        <LandingPage />
      )}
    </ThemeProvider>
  );
}
