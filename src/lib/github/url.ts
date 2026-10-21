export type RepoRef = { owner: string; name: string };

// GitHub's rules: owners are 1–39 alphanumerics or single hyphens, repo names use letters, digits, ".", "_" and "-".
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const NAME = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Extracts owner and repository name from the many ways people paste a GitHub address:
 * https://github.com/owner/repo, github.com/owner/repo.git, …/repo/tree/main, git@github.com:owner/repo.git
 * Returns null for anything that is not a GitHub repository address.
 */
export function parseRepoUrl(input: string): RepoRef | null {
  let value = input.trim();

  const ssh = value.match(/^git@github\.com:(.+)$/i);
  if (ssh) {
    value = ssh[1];
  } else {
    value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (!/^github\.com\//i.test(value)) {
      return null;
    }
    value = value.slice("github.com/".length);
  }

  const [owner, rawName] = value.split(/[/?#]/).filter(Boolean);
  const name = rawName?.replace(/\.git$/i, "");
  if (!owner || !name || !OWNER.test(owner) || !NAME.test(name) || name === "." || name === "..") {
    return null;
  }
  return { owner, name };
}
