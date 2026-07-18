import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type {
  canAccessResource as canAccessResourceType,
  isKnownRole as isKnownRoleType,
} from "../src/lib/authorization.js";

let canAccessResource: typeof canAccessResourceType;
let isKnownRole: typeof isKnownRoleType;

before(async () => {
  ({ canAccessResource, isKnownRole } =
    await import("../src/lib/authorization.js"));
});

describe("authorization policy", () => {
  it("allows admin to access dashboard", () => {
    assert.equal(canAccessResource("admin", "dashboard"), true);
  });

  it("denies secretaria access to dashboard", () => {
    assert.equal(canAccessResource("secretaria", "dashboard"), false);
  });

  it("denies tesorero access to ciudadanos", () => {
    assert.equal(canAccessResource("tesorero", "ciudadanos"), false);
  });

  it("allows secretaria to manage ciudadanos", () => {
    assert.equal(canAccessResource("secretaria", "ciudadanos"), true);
  });

  it("rejects unknown roles", () => {
    assert.equal(isKnownRole("capturista"), false);
  });
});
