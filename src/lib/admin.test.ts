import { describe, expect, it } from "vitest";
import { isAdmin, isConfiguredAdmin } from "./admin";

describe("admin detection", () => {
  const env = { ADMIN_EMAILS: " Lead@Example.com, second@example.com ,," };

  it("accepts the role from the database", () => {
    expect(isAdmin({ role: "admin", email: "anyone@example.com" }, {})).toBe(true);
    expect(isAdmin({ role: "student", email: "anyone@example.com" }, {})).toBe(false);
  });

  it("accepts listed addresses regardless of case and spaces", () => {
    expect(isConfiguredAdmin("lead@example.com", env)).toBe(true);
    expect(isConfiguredAdmin("SECOND@example.com", env)).toBe(true);
    expect(isAdmin({ role: "student", email: "lead@example.com" }, env)).toBe(true);
    expect(isConfiguredAdmin("other@example.com", env)).toBe(false);
  });

  it("treats a missing variable as an empty list", () => {
    expect(isConfiguredAdmin("", {})).toBe(false);
    expect(isConfiguredAdmin("lead@example.com", {})).toBe(false);
  });
});
