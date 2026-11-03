import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { findSecrets, type SecretFinding } from "./secrets";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_SCRIPTS = 20;
const TIMEOUT_MS = 10_000;

// The URL comes from a student's README and the worker runs next to our database, so requests must
// never reach private addresses. Checked in the DNS lookup itself, which also stops DNS rebinding.
const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

export function isBlockedAddress(address: string) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return blockedAddresses.check(mapped, "ipv4");
  return blockedAddresses.check(address, isIP(address) === 6 ? "ipv6" : "ipv4");
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }).then(
    (addresses) => {
      if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
        callback(Object.assign(new Error(`Blocked address for ${hostname}`), { code: "EBLOCKED" }), "", 0);
      } else if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0].address, addresses[0].family);
      }
    },
    (error) => callback(error, "", 0),
  );
};

type Fetched = { status: number; location?: string; contentType: string; body: string };

function isAllowedUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  return !isIP(host) || !isBlockedAddress(host);
}

function request(url: URL): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    if (!isAllowedUrl(url)) {
      reject(Object.assign(new Error(`Blocked URL ${url}`), { code: "EBLOCKED" }));
      return;
    }
    const client = url.protocol === "https:" ? https : http;
    const outgoing = client.get(
      url,
      { lookup: safeLookup, timeout: TIMEOUT_MS, headers: { "User-Agent": "vibe-coding-exam-checker" } },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () =>
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
            contentType: response.headers["content-type"] ?? "",
            body: Buffer.concat(chunks).toString("utf8"),
          });
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            response.destroy();
            finish();
          } else {
            chunks.push(chunk);
          }
        });
        response.on("end", finish);
        response.on("error", reject);
      },
    );
    outgoing.on("timeout", () => outgoing.destroy(new Error("Timeout")));
    outgoing.on("error", reject);
  });
}

/** Follows redirects by hand, because every hop has to pass the address check again. */
async function fetchWithRedirects(start: URL) {
  const hops = [start.toString()];
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await request(current);
    if (response.status < 300 || response.status >= 400 || !response.location) {
      return { ...response, finalUrl: current, hops };
    }
    current = new URL(response.location, current);
    hops.push(current.toString());
  }
  throw new Error("Too many redirects");
}

function isCertificateError(error: unknown) {
  const code = (error as { code?: string }).code ?? "";
  return /CERT|SELF_SIGNED|TLS|SSL|UNABLE_TO_VERIFY|ALTNAME/i.test(code);
}

export function extractText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type LiveSiteFacts = {
  url: string;
  reachable: boolean;
  status?: number;
  finalUrl?: string;
  error?: string;
  servedOverHttps: boolean;
  certificateValid: boolean;
  httpRedirectsToHttps: boolean;
  title?: string;
  textExcerpt?: string;
  scriptsScanned: number;
  secrets: SecretFinding[];
};

async function scanScripts(html: string, page: URL) {
  const sources = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map(([, src]) => {
      try {
        return new URL(src, page);
      } catch {
        return undefined;
      }
    })
    // Only the app's own scripts: third-party bundles are not the student's secrets.
    .filter((url): url is URL => url?.origin === page.origin)
    .slice(0, MAX_SCRIPTS);

  const secrets = findSecrets(html, page.toString(), { browser: true });
  let scanned = 0;
  for (const source of sources) {
    try {
      const { status, body } = await request(source);
      if (status < 400) {
        scanned++;
        secrets.push(...findSecrets(body, source.pathname, { browser: true }));
      }
    } catch {
      // A script that does not load cannot leak anything to visitors either.
    }
  }
  return { secrets, scanned };
}

/** Measures the facts about a live URL that the url tasks ask for. */
export async function inspectLiveSite(address: string): Promise<LiveSiteFacts> {
  const url = new URL(address);
  const facts: LiveSiteFacts = {
    url: address,
    reachable: false,
    servedOverHttps: false,
    certificateValid: false,
    httpRedirectsToHttps: false,
    scriptsScanned: 0,
    secrets: [],
  };

  try {
    const secureUrl = new URL(url);
    secureUrl.protocol = "https:";
    const page = await fetchWithRedirects(secureUrl);
    facts.reachable = page.status > 0 && page.status < 400;
    facts.status = page.status;
    facts.finalUrl = page.finalUrl.toString();
    facts.servedOverHttps = page.finalUrl.protocol === "https:";
    facts.certificateValid = facts.servedOverHttps;
    facts.title = page.body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    facts.textExcerpt = extractText(page.body).slice(0, 1500);
    if (page.contentType.includes("html")) {
      const { secrets, scanned } = await scanScripts(page.body, page.finalUrl);
      facts.secrets = secrets;
      facts.scriptsScanned = scanned;
    }
  } catch (error) {
    facts.error = error instanceof Error ? error.message : String(error);
    if (isCertificateError(error)) facts.servedOverHttps = true;
  }

  try {
    const plainUrl = new URL(url);
    plainUrl.protocol = "http:";
    const plain = await request(plainUrl);
    facts.httpRedirectsToHttps =
      plain.status >= 300 && plain.status < 400 && Boolean(plain.location?.toLowerCase().startsWith("https://"));
    if (!facts.reachable && !facts.servedOverHttps && plain.status < 400) {
      facts.reachable = true;
      facts.status = plain.status;
    }
  } catch {
    // Sites without a plain HTTP port simply do not redirect.
  }
  return facts;
}

const notAppHosts =
  /(^|\.)(github\.com|githubusercontent\.com|shields\.io|localhost|example\.com|npmjs\.com|nextjs\.org|vercel\.com|supabase\.com|tailwindcss\.com|react\.dev|nodejs\.org|claude\.ai|anthropic\.com)$/i;

/** Picks the app's address from a README: a URL on a line that announces it wins over any other. */
export function findAppUrl(readme: string) {
  const candidates: { url: string; announced: boolean }[] = [];
  for (const line of readme.split("\n")) {
    for (const [match] of line.matchAll(/https?:\/\/[^\s)\]>"'`]+/g)) {
      try {
        const url = new URL(match.replace(/[.,;:!]+$/, ""));
        if (!notAppHosts.test(url.hostname) && !isIP(url.hostname)) {
          candidates.push({ url: url.toString(), announced: /live|demo|url|production|produktion|deploy|website|online/i.test(line) });
        }
      } catch {
        // Not a URL after all.
      }
    }
  }
  return (candidates.find((candidate) => candidate.announced) ?? candidates[0])?.url;
}
