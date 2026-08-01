import type { CookieOptions } from "express";

export function getRefreshCookieOptions(
  secure: boolean,
  maxAge?: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/api/auth",
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}
