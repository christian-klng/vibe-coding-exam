export type RepoFile = {
  path: string;
  size: number;
  // Missing for binary files, oversized files and hidden folders like node_modules.
  text?: string;
};

export type CommitSummary = { sha: string; message: string; author: string; date: string };

export type CommitDetail = CommitSummary & {
  additions: number;
  deletions: number;
  files: { path: string; additions: number; deletions: number; patch?: string }[];
};

export type PullRequestInfo = {
  number: number;
  title: string;
  body: string;
  merged: boolean;
  headBranch: string;
  baseBranch: string;
};

/** A repository frozen at one commit. Everything the checker reads goes through this. */
export interface RepoSource {
  fullName: string;
  sha: string;
  files: Map<string, RepoFile>;
  listCommits(limit: number): Promise<CommitSummary[]>;
  getCommit(sha: string): Promise<CommitDetail>;
  listBranches(): Promise<string[]>;
  listPullRequests(): Promise<PullRequestInfo[]>;
}

export type CriterionResult = { id: string; met: boolean; evidence: string; feedback: string };

export type CheckOutcome = {
  status: "passed" | "failed";
  // Empty when a deterministic pre-check already failed the task.
  criteria: CriterionResult[];
  summary: string;
  nextStep?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
};
