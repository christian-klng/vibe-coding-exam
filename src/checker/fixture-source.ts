import type { CommitDetail, PullRequestInfo, RepoSource } from "./types";

export type RepoFixture = {
  files?: Record<string, string>;
  commits?: (Partial<CommitDetail> & { message: string })[];
  branches?: string[];
  pullRequests?: PullRequestInfo[];
};

/** An in-memory repository for tests and the eval set. */
export function createFixtureSource(fixture: RepoFixture): RepoSource {
  const commits: CommitDetail[] = (fixture.commits ?? [{ message: "Initial commit" }]).map((commit, index) => ({
    sha: commit.sha ?? `c0mm17${String(index).padStart(2, "0")}abcdef`,
    author: "Student",
    date: "2026-11-01T10:00:00Z",
    additions: 10,
    deletions: 0,
    files: [],
    ...commit,
  }));

  return {
    fullName: "student/fixture",
    sha: commits[0].sha,
    files: new Map(
      Object.entries(fixture.files ?? {}).map(([path, text]) => [path, { path, size: text.length, text }]),
    ),
    listCommits: async (limit) => commits.slice(0, limit),
    getCommit: async (sha) => {
      const commit = commits.find((candidate) => candidate.sha.startsWith(sha));
      if (!commit) throw new Error(`Unknown commit ${sha}`);
      return commit;
    },
    listBranches: async () => fixture.branches ?? ["main"],
    listPullRequests: async () => fixture.pullRequests ?? [],
  };
}
