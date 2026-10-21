import { Octokit } from "@octokit/rest";

export type RepoLookup =
  | { ok: true; owner: string; name: string; url: string; defaultBranch: string; hasCommits: boolean }
  | { ok: false; reason: "notFound" | "private" | "rateLimited" | "unavailable" };

function getOctokit() {
  // Without a token GitHub allows only 60 requests per hour and IP – fine locally, too few in production.
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: "vibe-coding-exam",
    // Expected answers like 404 are handled below; unexpected errors are logged there.
    log: { debug: () => {}, info: () => {}, warn: console.warn, error: () => {} },
  });
}

function statusOf(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
}

function isRateLimited(error: unknown) {
  const status = statusOf(error);
  const remaining = (error as { response?: { headers?: Record<string, string> } }).response?.headers?.[
    "x-ratelimit-remaining"
  ];
  return status === 429 || (status === 403 && remaining === "0");
}

/** Looks up a repository the way an anonymous visitor would see it. */
export async function lookupRepository(owner: string, name: string): Promise<RepoLookup> {
  const octokit = getOctokit();
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo: name });
    if (data.private) {
      return { ok: false, reason: "private" };
    }

    let hasCommits = true;
    try {
      await octokit.rest.repos.listCommits({ owner: data.owner.login, repo: data.name, per_page: 1 });
    } catch (error) {
      // GitHub answers 409 Conflict for a repository without any commits.
      if (statusOf(error) !== 409) throw error;
      hasCommits = false;
    }

    return {
      ok: true,
      // Use GitHub's spelling (e.g. correct upper/lower case) rather than what the user typed.
      owner: data.owner.login,
      name: data.name,
      url: data.html_url,
      defaultBranch: data.default_branch,
      hasCommits,
    };
  } catch (error) {
    if (isRateLimited(error)) return { ok: false, reason: "rateLimited" };
    // Private repositories also answer 404 when we have no access to them.
    if (statusOf(error) === 404) return { ok: false, reason: "notFound" };
    console.error("GitHub lookup failed", error);
    return { ok: false, reason: "unavailable" };
  }
}
