import { useEffect, useState } from "react";
import {
  APP_ROUTES,
  getVisibleProtectedRoutes,
} from "../features/auth/authorization";
import { readAuthSession } from "../features/auth/auth.session";
import { cn } from "../lib/utils";
import AppLink from './AppLink';

const ROUTE_LABELS = {
  "/": "Inicio",
  "/login": "Login",
  "/dashboard": "Dashboard",
  "/ciudadanos": "Ciudadanos",
  "/pagos": "Pagos",
  "/reportes": "Reportes",
  "/usuarios": "Usuarios",
} as const;

type RoutePillsProps = {
  className?: string;
  variant?: "light" | "dark";
  ariaLabel?: string;
};

function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  return pathname === "/login" ||
    pathname === "/ciudadanos" ||
    pathname === "/dashboard" ||
    pathname === "/pagos" ||
    pathname === "/reportes" ||
    pathname === "/usuarios"
    ? pathname
    : "/";
}

function getVisibleRoutes() {
  const session = readAuthSession();

  if (!session) {
    return APP_ROUTES.filter((route) => route === "/" || route === "/login");
  }

  return ["/", "/login", ...getVisibleProtectedRoutes(session)];
}

const VARIANT_CLASSES = {
  light: {
    idle: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
    active:
      "border-[#f97316]/60 bg-[#f97316] text-white shadow-lg shadow-orange-500/20",
  },
  dark: {
    idle: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
    active:
      "border-[#f97316]/25 bg-[#f97316]/10 text-[#0f3042] shadow-sm shadow-orange-200",
  },
} as const;

export default function RoutePills({
  className,
  variant = "dark",
  ariaLabel = "Navegación de pantallas",
}: RoutePillsProps) {
  const currentPath = getCurrentPath();
  const routes = getVisibleRoutes();
  const styles = VARIANT_CLASSES[variant];
  const [isOpen, setIsOpen] = useState(false);
  const buttonClasses =
    variant === "light"
      ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const menuClasses =
    variant === "light"
      ? "border-white/10 bg-[#0a2535]/98 backdrop-blur-xl"
      : "border-slate-200 bg-white/98 backdrop-blur-xl";

  useEffect(() => {
    setIsOpen(false);
  }, [currentPath]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/30 sm:hidden",
          buttonClasses,
        )}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={
          isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"
        }
        aria-expanded={isOpen}
      >
        <span className="sr-only">Menú</span>
        <span className="flex flex-col gap-1">
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú de navegación"
          className="fixed inset-0 z-20 cursor-default bg-slate-950/35 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <nav
        aria-label={ariaLabel}
        className={cn(
          "gap-2 sm:flex sm:flex-wrap",
          isOpen
            ? cn(
                "fixed inset-x-4 bottom-4 top-auto z-30 flex max-h-[min(60vh,28rem)] flex-col gap-2 overflow-y-auto rounded-3xl border p-4 shadow-2xl sm:absolute sm:right-0 sm:top-12 sm:min-w-48 sm:flex-row sm:flex-wrap sm:gap-2 sm:overflow-visible sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:max-h-none",
                menuClasses,
              )
            : "hidden",
        )}
      >
        {routes.map((route) => {
          const isActive = currentPath === route;

          return (
            <AppLink
              key={route}
              href={route}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setIsOpen(false)}
              className={cn(
                "inline-flex min-h-11 w-full items-center justify-start rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors sm:w-auto sm:justify-center sm:rounded-full sm:px-3 sm:py-2 sm:text-xs",
                isActive ? styles.active : styles.idle,
                isOpen && "justify-center sm:justify-start",
              )}
            >
              {ROUTE_LABELS[route as keyof typeof ROUTE_LABELS]}
            </AppLink>
          );
        })}
      </nav>
    </div>
  );
}
