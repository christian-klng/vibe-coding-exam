// Well-known key formats only. Generic matches like `password = "..."` are too noisy for a
// deterministic verdict and are left to the agent.
const patterns: { kind: string; regex: RegExp; publicInBrowser?: boolean }[] = [
  { kind: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "OpenAI/Anthropic API key", regex: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g },
  { kind: "GitHub token", regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/g },
  { kind: "Stripe secret key", regex: /\b[sr]k_live_[A-Za-z0-9]{16,}/g },
  { kind: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { kind: "SendGrid API key", regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  // Firebase web apps ship this key to the browser by design.
  { kind: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g, publicInBrowser: true },
  { kind: "Private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----/g },
];

const jwtPattern = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;
const placeholder = /example|placeholder|your|xxxx|dummy|sample/i;

export type SecretFinding = { kind: string; masked: string; location: string };

function mask(value: string) {
  return `${value.slice(0, 6)}…`;
}

function isServiceRoleJwt(payload: string) {
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role === "service_role";
  } catch {
    return false;
  }
}

/** Finds known secret formats in a text. Findings are masked, so they are safe to store and show. */
export function findSecrets(text: string, location: string, { browser = false } = {}): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const { kind, regex, publicInBrowser } of patterns) {
    if (browser && publicInBrowser) continue;
    for (const [match] of text.matchAll(regex)) {
      if (!placeholder.test(match)) findings.push({ kind, masked: mask(match), location });
    }
  }
  for (const [match, payload] of text.matchAll(jwtPattern)) {
    if (isServiceRoleJwt(payload)) findings.push({ kind: "Supabase service role key", masked: mask(match), location });
  }
  return findings;
}

export function formatFindings(findings: SecretFinding[], limit = 5) {
  return findings
    .slice(0, limit)
    .map((finding) => `${finding.kind} (${finding.masked}) – ${finding.location}`)
    .join("; ");
}
