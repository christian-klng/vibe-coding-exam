import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";
import { mergeLlmConfig } from "./settings";

describe("encrypted settings", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("decrypts what it encrypted, and stores nothing readable", () => {
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "test-key");
    const stored = encryptSecret("geheim-123");
    expect(stored).not.toContain("geheim");
    expect(decryptSecret(stored)).toBe("geheim-123");
    expect(encryptSecret("geheim-123")).not.toBe(stored);
  });

  it("refuses a changed value or the wrong key", () => {
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "test-key");
    const stored = encryptSecret("geheim-123");
    const parts = stored.split(":");
    parts[3] = Buffer.from("anderer-wert").toString("base64url");
    expect(() => decryptSecret(parts.join(":"))).toThrow();

    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "other-key");
    expect(() => decryptSecret(stored)).toThrow();
  });

  it("does not encrypt without a key", () => {
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "");
    expect(() => encryptSecret("x")).toThrow("SETTINGS_ENCRYPTION_KEY");
  });
});

describe("mergeLlmConfig", () => {
  it("prefers stored values and falls back field by field", () => {
    expect(
      mergeLlmConfig({ model: "stored-model" }, { baseURL: "https://env/v1", model: "env-model", apiKey: "env-key" }),
    ).toEqual({ baseURL: "https://env/v1", model: "stored-model", apiKey: "env-key" });
  });
});
