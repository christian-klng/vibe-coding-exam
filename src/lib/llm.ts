import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { InvalidToolInputError, type ToolCallRepairFunction, type ToolSet } from "ai";

export type LlmConfig = { baseURL?: string; model?: string; apiKey?: string };

export function getEnvLlmConfig(): LlmConfig {
  return {
    baseURL: process.env.LLM_BASE_URL || undefined,
    model: process.env.LLM_MODEL || undefined,
    apiKey: process.env.LLM_API_KEY || undefined,
  };
}

/** Waiting does not help here: somebody has to enter the access first. */
export class LlmNotConfiguredError extends Error {}

// The check agent talks to a self-hosted model (Qwen 3.6 on vLLM) through its
// OpenAI-compatible API. Swapping the model only means changing these settings.
export function createCheckModel({ baseURL, model, apiKey }: LlmConfig) {
  if (!baseURL || !model) {
    throw new LlmNotConfiguredError("The LLM is not configured: base URL and model are needed");
  }
  const provider = createOpenAICompatible({
    name: "local-llm",
    baseURL,
    apiKey,
    // vLLM supports JSON-schema guided decoding via response_format.
    supportsStructuredOutputs: true,
  });
  return provider(model);
}

// Depending on vLLM's tool call parser, Qwen sometimes sends a nested list or a yes/no value as text,
// e.g. "criteria": "[{...}]" or "met": "true". The content is right, only the format is not.
function repairValue(value: unknown): unknown {
  if (typeof value === "string") {
    const text = value.trim();
    if (text === "true" || text === "false") return text === "true";
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        return repairValue(JSON.parse(text));
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(repairValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, repairValue(inner)]));
  }
  return value;
}

/** Fixes tool calls whose arguments only fail because of the format; the schema then checks them again. */
export const repairToolInput: ToolCallRepairFunction<ToolSet> = async ({ toolCall, error }) => {
  if (!InvalidToolInputError.isInstance(error)) return null;
  try {
    const original = JSON.parse(toolCall.input);
    const repaired = JSON.stringify(repairValue(original));
    return repaired === JSON.stringify(original) ? null : { ...toolCall, input: repaired };
  } catch {
    return null;
  }
};

/** Says which field of a tool call did not fit, for the connection test and the worker log. */
export function describeToolInputError(error: unknown, input: unknown) {
  const reasons: string[] = [];
  for (let cause = error; cause && reasons.length === 0; cause = (cause as { cause?: unknown }).cause) {
    const issues = (cause as { issues?: { path: PropertyKey[]; message: string }[] }).issues;
    issues?.slice(0, 3).forEach((issue) => reasons.push(`${issue.path.map(String).join(".") || "input"}: ${issue.message}`));
  }
  if (reasons.length === 0) reasons.push(error instanceof Error ? error.message : String(error));
  const sent = typeof input === "string" ? input : JSON.stringify(input);
  return `${reasons.join("; ")}. Received: ${sent.slice(0, 200)}${sent.length > 200 ? "…" : ""}`;
}
