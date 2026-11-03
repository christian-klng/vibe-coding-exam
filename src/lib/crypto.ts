import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function getKey() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("SETTINGS_ENCRYPTION_KEY is not set");
  }
  return createHash("sha256").update(secret).digest();
}

export function canEncrypt() {
  return Boolean(process.env.SETTINGS_ENCRYPTION_KEY);
}

/** AES-256-GCM: secrets stored in the database stay useless without the key from the environment. */
export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(":");
}

export function decryptSecret(stored: string) {
  const [version, iv, tag, encrypted] = stored.split(":");
  if (version !== VERSION || !iv || !tag || encrypted === undefined) {
    throw new Error("Unknown format of an encrypted setting");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  try {
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("A stored secret could not be decrypted: is SETTINGS_ENCRYPTION_KEY the same in web and worker?");
  }
}
