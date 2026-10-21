import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// The check agent talks to a self-hosted model (Qwen 3.6 on vLLM) through its
// OpenAI-compatible API. Swapping the model only means changing these variables.
export function getLlmConfig() {
  const baseURL = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!baseURL || !model) {
    throw new Error("LLM_BASE_URL and LLM_MODEL must be set");
  }
  return { baseURL, model, apiKey: process.env.LLM_API_KEY };
}

export function getCheckModel() {
  const { baseURL, model, apiKey } = getLlmConfig();
  const provider = createOpenAICompatible({
    name: "local-llm",
    baseURL,
    apiKey,
    // vLLM supports JSON-schema guided decoding via response_format.
    supportsStructuredOutputs: true,
  });
  return provider(model);
}
