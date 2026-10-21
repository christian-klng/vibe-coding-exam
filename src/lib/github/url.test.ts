import { describe, expect, it } from "vitest";
import { parseRepoUrl } from "./url";

describe("parseRepoUrl", () => {
  it.each([
    ["https://github.com/octocat/hello-world", "octocat", "hello-world"],
    ["http://github.com/octocat/hello-world/", "octocat", "hello-world"],
    ["https://www.github.com/octocat/hello-world.git", "octocat", "hello-world"],
    ["github.com/octocat/hello-world", "octocat", "hello-world"],
    ["  https://github.com/octocat/hello-world  ", "octocat", "hello-world"],
    ["https://github.com/octocat/hello-world/tree/main/src", "octocat", "hello-world"],
    ["https://github.com/octocat/hello-world?tab=readme", "octocat", "hello-world"],
    ["git@github.com:octocat/hello-world.git", "octocat", "hello-world"],
    ["https://github.com/Octo-Cat/my.app_v2", "Octo-Cat", "my.app_v2"],
  ])("accepts %s", (input, owner, name) => {
    expect(parseRepoUrl(input)).toEqual({ owner, name });
  });

  it.each([
    "",
    "octocat/hello-world",
    "https://gitlab.com/octocat/hello-world",
    "https://github.com/octocat",
    "https://github.com/",
    "https://github.com.evil.com/octocat/hello-world",
    "https://github.com/-octocat/hello-world",
    "https://github.com/octo--cat/hello-world",
    "https://github.com/octocat/..",
    "https://github.com/octocat/hello world",
  ])("rejects %j", (input) => {
    expect(parseRepoUrl(input)).toBeNull();
  });
});
