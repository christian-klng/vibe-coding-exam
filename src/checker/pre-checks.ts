import picomatch from "picomatch";
import type { Task } from "@/lib/tasks/schema";
import { findAppUrl, inspectLiveSite, type LiveSiteFacts } from "./live-site";
import { findSecrets, formatFindings, type SecretFinding } from "./secrets";
import type { RepoSource } from "./types";

const HISTORY_SCAN_COMMITS = 50;

export type PreCheckMessage = { key: string; values?: Record<string, string | number> };

export type PreCheckReport = {
  // Why the task fails without asking the AI. Translated later, in the student's language.
  failures: PreCheckMessage[];
  // What the code measured, handed to the agent as trusted information.
  facts: string[];
};

/** Turns "docs/{idee,idea}.md" into "docs/idee.md / docs/idea.md", which beginners can read. */
function readablePattern(pattern: string) {
  const options = pattern.match(/\{([^}]+)\}/)?.[1].split(",");
  return options ? options.map((option) => pattern.replace(/\{[^}]+\}/, option)).join(" / ") : pattern;
}

function matchingPaths(source: RepoSource, patterns: string | string[]) {
  const matches = picomatch(patterns, { dot: true });
  return [...source.files.keys()].filter((path) => matches(path));
}

function findReadme(source: RepoSource) {
  const path = [...source.files.keys()].find((candidate) => /^readme(\.[a-z]+)?$/i.test(candidate));
  return path ? source.files.get(path)?.text : undefined;
}

function scanFiles(source: RepoSource) {
  const findings: SecretFinding[] = [];
  for (const file of source.files.values()) {
    if (file.text) findings.push(...findSecrets(file.text, file.path));
  }
  return findings;
}

async function scanHistory(source: RepoSource) {
  const commits = await source.listCommits(HISTORY_SCAN_COMMITS);
  const findings: SecretFinding[] = [];
  for (const { sha } of commits) {
    const commit = await source.getCommit(sha);
    for (const file of commit.files) {
      const added = (file.patch ?? "").split("\n").filter((line) => line.startsWith("+")).join("\n");
      findings.push(...findSecrets(added, `${file.path} (${sha.slice(0, 7)})`));
    }
  }
  return { findings, commits: commits.length };
}

export async function runPreChecks(task: Task, source: RepoSource): Promise<PreCheckReport> {
  const failures: PreCheckMessage[] = [];
  const facts: string[] = [];

  // Several checks need the live site, but it should only be requested once.
  let live: Promise<LiveSiteFacts | undefined> | undefined;
  const getLive = () => {
    live ??= (async () => {
      const url = findAppUrl(findReadme(source) ?? "");
      if (!url) return undefined;
      const inspected = await inspectLiveSite(url);
      const { secrets, ...measured } = inspected;
      facts.push(`Live site measurement: ${JSON.stringify({ ...measured, secretsFound: secrets.length })}`);
      return inspected;
    })();
    return live;
  };
  const noLiveUrl = { key: "noUrlInReadme" };

  for (const check of task.check.preChecks) {
    if ("fileExists" in check) {
      if (matchingPaths(source, check.fileExists).length === 0) {
        failures.push({ key: "fileMissing", values: { pattern: readablePattern(check.fileExists) } });
      }
    } else if ("notTracked" in check) {
      const tracked = matchingPaths(source, check.notTracked);
      if (tracked.length > 0) {
        const examples = tracked.slice(0, 5).join(", ");
        failures.push({ key: "tracked", values: { paths: examples } });
      }
    } else if ("minCommits" in check) {
      const count = (await source.listCommits(check.minCommits)).length;
      if (count < check.minCommits) {
        failures.push({ key: "tooFewCommits", values: { min: check.minCommits, count } });
      }
    } else if ("mergedPullRequest" in check) {
      if (!(await source.listPullRequests()).some((pull) => pull.merged)) {
        failures.push({ key: "noMergedPullRequest" });
      }
    } else if ("readmeHasUrl" in check) {
      if (!(await getLive())) failures.push(noLiveUrl);
    } else if ("urlReachable" in check) {
      const site = await getLive();
      if (site && !site.reachable) failures.push({ key: "urlUnreachable", values: { url: site.url } });
    } else if ("httpsValid" in check) {
      const site = await getLive();
      if (!site) failures.push(noLiveUrl);
      else if (!site.certificateValid) failures.push({ key: "httpsInvalid", values: { url: site.url } });
    } else if ("httpRedirectsToHttps" in check) {
      const site = await getLive();
      if (site && !site.httpRedirectsToHttps) failures.push({ key: "noHttpsRedirect", values: { url: site.url } });
    } else if ("noSecretsInFiles" in check) {
      const findings = scanFiles(source);
      if (findings.length > 0) failures.push({ key: "secretsInFiles", values: { list: formatFindings(findings) } });
      else facts.push(`Automated scan: no known key formats in ${source.files.size} files. Generic passwords are not covered.`);
    } else if ("noSecretsInHistory" in check) {
      const { findings, commits } = await scanHistory(source);
      if (findings.length > 0) failures.push({ key: "secretsInHistory", values: { list: formatFindings(findings) } });
      else facts.push(`Automated scan: no known key formats in the added lines of the latest ${commits} commits.`);
    } else if ("noSecretsInClientBundle" in check) {
      const site = await getLive();
      if (!site) failures.push(noLiveUrl);
      else if (site.secrets.length > 0) {
        failures.push({ key: "secretsInBundle", values: { list: formatFindings(site.secrets) } });
      } else {
        facts.push(`Automated scan: no known key formats in the page and ${site.scriptsScanned} of its own scripts.`);
      }
    }
    // repoIsPublic is already guaranteed: only public repositories can be opened at all.
  }

  // Keep the first message per kind, e.g. a missing URL is reported once.
  const unique = [...new Map(failures.map((failure) => [JSON.stringify(failure), failure])).values()];
  return { failures: unique, facts };
}
