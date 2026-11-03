"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canEncrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { type LlmTestStep, testLlmConnection } from "@/lib/llm-test";
import { requireAdmin } from "@/lib/session";
import { getEffectiveLlmConfig, saveLlmSettings } from "@/lib/settings";

export type SaveLlmState = { status: "idle" | "saved" } | { status: "error"; error: "invalidUrl" | "noEncryptionKey" };

const urlSchema = z.url({ protocol: /^https?$/ });

export async function saveLlm(_previous: SaveLlmState, formData: FormData): Promise<SaveLlmState> {
  const session = await requireAdmin();
  const baseURL = String(formData.get("baseURL") ?? "").trim().replace(/\/+$/, "");
  const model = String(formData.get("model") ?? "").trim();
  const newApiKey = String(formData.get("apiKey") ?? "").trim();

  if (baseURL && !urlSchema.safeParse(baseURL).success) {
    return { status: "error", error: "invalidUrl" };
  }
  if (newApiKey && !canEncrypt()) {
    return { status: "error", error: "noEncryptionKey" };
  }

  await saveLlmSettings(
    { baseURL, model, newApiKey: newApiKey || undefined, removeApiKey: formData.get("removeApiKey") === "on" },
    session.user.id,
  );
  revalidatePath("/admin/llm");
  return { status: "saved" };
}

export type TestLlmState = { steps?: LlmTestStep[]; failed?: boolean };

/** Tests the saved values on purpose: a test with typed-in values could send the stored key anywhere. */
export async function testLlm(): Promise<TestLlmState> {
  await requireAdmin();
  try {
    return { steps: await testLlmConnection(await getEffectiveLlmConfig()) };
  } catch (error) {
    console.error("[admin] LLM test failed", error);
    return { failed: true };
  }
}

export async function setUserRole(userId: string, role: "admin" | "student") {
  const session = await requireAdmin();
  // Nobody can lock themselves out, so there is always at least one admin left.
  if (userId === session.user.id) return;
  await getDb().update(user).set({ role }).where(eq(user.id, userId));
  revalidatePath("/admin/users");
}
