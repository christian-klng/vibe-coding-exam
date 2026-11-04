import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

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
