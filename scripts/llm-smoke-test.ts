/**
 * Smoke test for the self-hosted LLM (Qwen 3.6 on vLLM), see testLlmConnection. The admin area has
 * the same test as a button; this one tests the LLM_* variables.
 *
 * Run with: npm run llm:test   (reads LLM_* variables from .env.local)
 */
import { getEnvLlmConfig } from "../src/lib/llm";
import { testLlmConnection } from "../src/lib/llm-test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables from the environment.
}

async function main() {
  const config = getEnvLlmConfig();
  console.log(`Testing ${config.model} at ${config.baseURL}\n`);
  const steps = await testLlmConnection(config);
  for (const step of steps) {
    console.log(`${step.ok ? "PASS" : "FAIL"}  ${step.name}\n      ${step.detail}\n`);
  }
  const passed = steps.length === 3 && steps.every((step) => step.ok);
  console.log(passed ? "All checks passed." : "Some checks failed.");
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
