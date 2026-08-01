import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRefreshCookieOptions } from "../src/lib/refresh-cookie.js";

describe("refresh cookie options", () => {
  it("allows the HTTP routing-mesh profile to persist the cookie", () => {
    assert.deepEqual(getRefreshCookieOptions(false, 60_000), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 60_000,
    });
  });

  it("uses a cross-site compatible cookie behind HTTPS", () => {
    assert.deepEqual(getRefreshCookieOptions(true), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/api/auth",
    });
  });
});
