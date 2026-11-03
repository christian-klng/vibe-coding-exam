import { createGzip } from "node:zlib";
import { Readable } from "node:stream";
import { MockLanguageModelV4 } from "ai/test";
import { pack } from "tar-stream";
import { describe, expect, it } from "vitest";
import { getTask } from "@/lib/tasks/loader";
import { runCheck } from ".";
import { NoVerdictError } from "./agent";
import { createFixtureSource, type RepoFixture } from "./fixture-source";
import { readTarball, RepoTooLargeError } from "./github-source";
import { extractText, findAppUrl, isBlockedAddress } from "./live-site";
import { findSecrets } from "./secrets";

type ToolCall = { name: string; input: unknown };

/** A model that plays back a list of steps, each with one tool call, or plain text when none are left. */
function scriptedModel(calls: ToolCall[]) {
  let step = 0;
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 5, text: 5, reasoning: 0 },
  };
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const call = calls[step++];
      return {
        content: call
          ? [{ type: "tool-call" as const, toolCallId: `call-${step}`, toolName: call.name, input: JSON.stringify(call.input) }]
          : [{ type: "text" as const, text: "I am done." }],
        finishReason: { unified: call ? ("tool-calls" as const) : ("stop" as const), raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

const goodReadme: RepoFixture = {
  files: { "README.md": "# App\n\nEine App für Studierende.\n\n## Funktionen\n- Planen\n\n## Start\nnpm run dev" },
};

function verdictFor(taskId: string, met: (id: string) => boolean, evidence = "README.md:1-3") {
  return {
    name: "submit_verdict",
    input: {
      criteria: getTask(taskId)!.check.criteria.map((criterion) => ({
        id: criterion.id,
        met: met(criterion.id),
        evidence,
        feedback: "Feedback",
      })),
      summary: "Zusammenfassung",
      nextStep: "Nächster Schritt",
    },
  };
}

function check(taskId: string, repo: RepoFixture, calls: ToolCall[], locale: "de" | "en" = "de") {
  return runCheck({
    task: getTask(taskId)!,
    locale,
    source: createFixtureSource(repo),
    model: () => scriptedModel(calls),
  });
}

describe("runCheck", () => {
  it("passes when all required criteria are met", async () => {
    const outcome = await check("readme", goodReadme, [
      { name: "read_file", input: { path: "README.md" } },
      verdictFor("readme", () => true),
    ]);
    expect(outcome.status).toBe("passed");
    expect(outcome.criteria).toHaveLength(getTask("readme")!.check.criteria.length);
    expect(outcome.inputTokens).toBe(20);
  });

  it("decides from the required criteria, ignoring missing optional ones", async () => {
    const passed = await check("readme", goodReadme, [verdictFor("readme", (id) => id !== "structure")]);
    expect(passed.status).toBe("passed");
    const failed = await check("readme", goodReadme, [verdictFor("readme", (id) => id !== "setup")]);
    expect(failed.status).toBe("failed");
  });

  it("fails on a missing file without asking the model", async () => {
    const outcome = await runCheck({
      task: getTask("app-idea")!,
      locale: "de",
      source: createFixtureSource({ files: { "README.md": "x" } }),
      model: () => {
        throw new Error("The model must not be used");
      },
    });
    expect(outcome.status).toBe("failed");
    expect(outcome.criteria).toEqual([]);
    expect(outcome.summary).toContain("docs/idee.md / docs/idea.md");
  });

  it("rejects evidence for things the agent never saw and lets it try again", async () => {
    const outcome = await check("readme", goodReadme, [
      verdictFor("readme", () => true, "somewhere in the docs"),
      verdictFor("readme", () => true),
    ]);
    expect(outcome.status).toBe("passed");
  });

  it("rejects a verdict that leaves out a criterion", async () => {
    const incomplete = verdictFor("readme", () => true);
    (incomplete.input.criteria as unknown[]).pop();
    await expect(check("readme", goodReadme, [incomplete])).rejects.toBeInstanceOf(NoVerdictError);
  });

  it("reports a model that never submits a verdict as an error, not as failed", async () => {
    await expect(check("readme", goodReadme, [])).rejects.toBeInstanceOf(NoVerdictError);
  });

  it("detects tracked files that belong in .gitignore", async () => {
    const outcome = await check("gitignore", { files: { ".gitignore": "x", ".env": "A=1" } }, []);
    expect(outcome.status).toBe("failed");
    expect(outcome.summary).toContain(".env");
  });

  it("counts commits and merged pull requests", async () => {
    const commits = await check("commit-messages", { commits: [{ message: "one" }, { message: "two" }] }, []);
    expect(commits.summary).toContain("2");
    const pulls = await check("branch-pull-request", { pullRequests: [] }, []);
    expect(pulls.status).toBe("failed");
  });

  it("fails on a secret in the files or in the history, and masks it", async () => {
    const key = "sk-" + "a1B2c3D4e5F6g7H8i9J0k1L2";
    const files = await check("no-secrets", { files: { "src/ai.ts": `const key = "${key}";` } }, []);
    expect(files.status).toBe("failed");
    expect(files.summary).toContain("src/ai.ts");
    expect(files.summary).not.toContain(key);

    const history = await check(
      "no-secrets",
      {
        files: { "README.md": "clean" },
        commits: [{ message: "remove key", files: [{ path: "a.ts", additions: 1, deletions: 0, patch: `+const k = "${key}"` }] }],
      },
      [],
    );
    expect(history.status).toBe("failed");
    expect(history.summary).not.toContain(key);
  });

  it("asks for a URL when the README has none", async () => {
    const outcome = await check("go-live", { files: { "README.md": "See https://github.com/a/b" } }, []);
    expect(outcome.status).toBe("failed");
    expect(outcome.summary).toContain("README");
  });
});

describe("findSecrets", () => {
  it("finds known formats but not placeholders", () => {
    expect(findSecrets("AKIA" + "ABCDEFGHIJKLMNOP", "f")[0].kind).toBe("AWS access key");
    expect(findSecrets("sk-your-api-key-goes-here-please", "f")).toEqual([]);
    expect(findSecrets("AKIA" + "IOSFODNN7EXAMPLE", "f")).toEqual([]);
    expect(findSecrets("task-abcdefghijklmnopqrstuvwxyz", "f")).toEqual([]);
  });

  it("allows Google web keys in the browser only", () => {
    const key = "AIza" + "B".repeat(35);
    expect(findSecrets(key, "f")).toHaveLength(1);
    expect(findSecrets(key, "f", { browser: true })).toEqual([]);
  });

  it("tells a Supabase service role key from the public anon key", () => {
    const jwt = (role: string) =>
      `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, iss: "supabase-project" })).toString("base64url")}.abcdefghijklmnop`;
    expect(findSecrets(jwt("service_role"), "f")).toHaveLength(1);
    expect(findSecrets(jwt("anon"), "f")).toEqual([]);
  });
});

describe("live site helpers", () => {
  it("blocks addresses inside our network", () => {
    for (const address of ["127.0.0.1", "10.0.1.5", "172.17.0.2", "192.168.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
    for (const address of ["2.28.29.153", "8.8.8.8", "2606:4700::1111"]) {
      expect(isBlockedAddress(address), address).toBe(false);
    }
  });

  it("finds the app's address in a README", () => {
    expect(findAppUrl("Badge https://img.shields.io/x\nCode: https://github.com/a/b\nLive: https://meine-app.de/start.")).toBe(
      "https://meine-app.de/start",
    );
    expect(findAppUrl("Docs https://docs.foo.dev and https://app.foo.dev\nDemo: https://demo.foo.dev")).toBe("https://demo.foo.dev/");
    expect(findAppUrl("Run at http://localhost:3000 or http://127.0.0.1:3000")).toBeUndefined();
  });

  it("reduces HTML to its visible text", () => {
    expect(extractText("<title>T</title><script>var a</script><p>Hello  <b>you</b></p>")).toBe("T Hello you");
  });
});

describe("readTarball", () => {
  async function tarball(entries: { name: string; content?: string; type?: "file" | "symlink" }[]) {
    const archive = pack();
    for (const { name, content = "", type = "file" } of entries) {
      archive.entry(type === "file" ? { name } : { name, type, linkname: "/etc/passwd" }, content);
    }
    archive.finalize();
    return Readable.from(archive.pipe(createGzip()));
  }

  it("strips GitHub's top folder, keeps text and leaves binaries and hidden folders without content", async () => {
    const files = await readTarball(
      await tarball([
        { name: "o-r-abc/README.md", content: "# Hi" },
        { name: "o-r-abc/logo.png", content: "\0PNG" },
        { name: "o-r-abc/node_modules/a/index.js", content: "x" },
        { name: "o-r-abc/.env", type: "symlink" },
      ]),
    );
    expect(files.get("README.md")?.text).toBe("# Hi");
    expect(files.get("logo.png")?.text).toBeUndefined();
    expect(files.get("node_modules/a/index.js")?.text).toBeUndefined();
    expect(files.has(".env")).toBe(true);
    expect(files.get(".env")?.text).toBeUndefined();
  });

  it("gives up on archives that are too large", async () => {
    const archive = await tarball([{ name: "o-r-abc/big.txt", content: "x".repeat(10_000) }]);
    await expect(readTarball(archive, 1000)).rejects.toBeInstanceOf(RepoTooLargeError);
  });
});
