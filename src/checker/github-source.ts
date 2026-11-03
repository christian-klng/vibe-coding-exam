import { createGunzip } from "node:zlib";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { extract } from "tar-stream";
import { getOctokit } from "@/lib/github/client";
import type { CommitDetail, RepoFile, RepoSource } from "./types";

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 500 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 1024 * 1024;

// Tracked files here still count as "in the repo", but their content is never useful to read.
export const hiddenFolders = ["node_modules", ".next", "dist", "build", "out", "vendor", ".git", "coverage"];

export function isHiddenPath(path: string) {
  return path.split("/").some((segment) => hiddenFolders.includes(segment));
}

export class RepoTooLargeError extends Error {}

function decodeText(content: Buffer) {
  return content.subarray(0, 8000).includes(0) ? undefined : content.toString("utf8");
}

function byteLimit(limit: number) {
  let total = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      total += chunk.length;
      callback(total > limit ? new RepoTooLargeError() : null, chunk);
    },
  });
}

/**
 * Unpacks a GitHub tarball into memory. Nothing is written to disk, so paths in the archive cannot
 * escape anywhere, and links are recorded without being followed.
 */
export async function readTarball(archive: Readable, maxUnpackedBytes = MAX_UNPACKED_BYTES): Promise<Map<string, RepoFile>> {
  const files = new Map<string, RepoFile>();
  const untar = extract();

  untar.on("entry", (header, stream, next) => {
    // GitHub prefixes every path with a folder named owner-repo-sha.
    const path = header.name.split("/").slice(1).join("/");
    const size = header.size ?? 0;
    const isFile = header.type === "file" || header.type === "symlink" || header.type === "link";
    const keepContent = header.type === "file" && size <= MAX_TEXT_FILE_BYTES && !isHiddenPath(path);
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => {
      if (keepContent) chunks.push(chunk as Buffer);
    });
    stream.on("end", () => {
      if (path && isFile) {
        files.set(path, { path, size, text: keepContent ? decodeText(Buffer.concat(chunks)) : undefined });
      }
      next();
    });
    stream.resume();
  });

  await pipeline(archive, byteLimit(MAX_DOWNLOAD_BYTES), createGunzip(), byteLimit(maxUnpackedBytes), untar);
  return files;
}

async function downloadFiles(owner: string, name: string, sha: string) {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/tarball/${sha}`, {
    headers: { "User-Agent": "vibe-coding-exam", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Downloading ${owner}/${name} failed with HTTP ${response.status}`);
  }
  return readTarball(Readable.fromWeb(response.body as WebReadableStream));
}

/** Freezes a repository at the current head of its default branch. */
export async function openGitHubRepo(owner: string, name: string, branch: string): Promise<RepoSource> {
  const octokit = getOctokit();
  const repo = { owner, repo: name };
  const { data: head } = await octokit.rest.repos.getCommit({ ...repo, ref: branch });
  const sha = head.sha;
  const files = await downloadFiles(owner, name, sha);
  const commitDetails = new Map<string, CommitDetail>();

  return {
    fullName: `${owner}/${name}`,
    sha,
    files,
    async listCommits(limit) {
      const { data } = await octokit.rest.repos.listCommits({ ...repo, sha, per_page: Math.min(limit, 100) });
      return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name ?? "",
        date: commit.commit.author?.date ?? "",
      }));
    },
    async getCommit(commitSha) {
      const cached = commitDetails.get(commitSha);
      if (cached) return cached;
      const { data } = await octokit.rest.repos.getCommit({ ...repo, ref: commitSha });
      const detail: CommitDetail = {
        sha: data.sha,
        message: data.commit.message,
        author: data.commit.author?.name ?? "",
        date: data.commit.author?.date ?? "",
        additions: data.stats?.additions ?? 0,
        deletions: data.stats?.deletions ?? 0,
        files: (data.files ?? []).map((file) => ({
          path: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
        })),
      };
      commitDetails.set(commitSha, detail);
      return detail;
    },
    async listBranches() {
      const { data } = await octokit.rest.repos.listBranches({ ...repo, per_page: 100 });
      return data.map((branchInfo) => branchInfo.name);
    },
    async listPullRequests() {
      const { data } = await octokit.rest.pulls.list({ ...repo, state: "all", per_page: 30 });
      return data.map((pull) => ({
        number: pull.number,
        title: pull.title,
        body: pull.body ?? "",
        merged: Boolean(pull.merged_at),
        headBranch: pull.head.ref,
        baseBranch: pull.base.ref,
      }));
    },
  };
}
