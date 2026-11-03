import { eq, inArray } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getEnvLlmConfig, type LlmConfig } from "@/lib/llm";

const BASE_URL = "llm.baseUrl";
const MODEL = "llm.model";
const API_KEY = "llm.apiKey";

async function readLlmRows() {
  const rows = await getDb()
    .select()
    .from(settings)
    .where(inArray(settings.key, [BASE_URL, MODEL, API_KEY]));
  return new Map(rows.map((row) => [row.key, row]));
}

/** Values from the admin area win; the environment variables remain the fallback, field by field. */
export function mergeLlmConfig(stored: LlmConfig, env: LlmConfig): LlmConfig {
  return {
    baseURL: stored.baseURL ?? env.baseURL,
    model: stored.model ?? env.model,
    apiKey: stored.apiKey ?? env.apiKey,
  };
}

/** The LLM access a check should use right now. Read per check, so changes need no restart. */
export async function getEffectiveLlmConfig(): Promise<LlmConfig> {
  const rows = await readLlmRows();
  const storedKey = rows.get(API_KEY)?.value;
  return mergeLlmConfig(
    {
      baseURL: rows.get(BASE_URL)?.value,
      model: rows.get(MODEL)?.value,
      apiKey: storedKey ? decryptSecret(storedKey) : undefined,
    },
    getEnvLlmConfig(),
  );
}

/** For the admin form. The stored key itself never leaves this module, only whether there is one. */
export async function getLlmSettingsForForm() {
  const rows = await readLlmRows();
  const env = getEnvLlmConfig();
  return {
    baseURL: rows.get(BASE_URL)?.value ?? "",
    model: rows.get(MODEL)?.value ?? "",
    hasStoredKey: rows.has(API_KEY),
    envBaseURL: env.baseURL,
    envModel: env.model,
    hasEnvKey: Boolean(env.apiKey),
    updatedAt: rows.get(BASE_URL)?.updatedAt ?? rows.get(MODEL)?.updatedAt ?? rows.get(API_KEY)?.updatedAt,
  };
}

export async function saveLlmSettings(
  input: { baseURL: string; model: string; newApiKey?: string; removeApiKey: boolean },
  userId: string,
) {
  const upsert = (key: string, value: string) => ({ key, value, updatedBy: userId, updatedAt: new Date() });
  await getDb().transaction(async (tx) => {
    const save = async (key: string, value: string) => {
      if (value) {
        const row = upsert(key, value);
        await tx.insert(settings).values(row).onConflictDoUpdate({ target: settings.key, set: row });
      } else {
        await tx.delete(settings).where(eq(settings.key, key));
      }
    };
    await save(BASE_URL, input.baseURL);
    await save(MODEL, input.model);
    if (input.newApiKey) {
      await save(API_KEY, encryptSecret(input.newApiKey));
    } else if (input.removeApiKey) {
      await save(API_KEY, "");
    }
  });
}
