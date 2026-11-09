import { describe, expect, it } from "vitest";
import { passedToCsv } from "./passed";

describe("passed CSV", () => {
  it("quotes cells with separators and quotes", () => {
    const csv = passedToCsv(
      [
        {
          userId: "u1",
          name: 'Anna "A"; Test',
          email: "anna@example.com",
          taskId: "readme",
          passedVersion: 2,
          passedAt: new Date("2026-11-09T10:00:00Z"),
          commitSha: "abc",
          repo: "anna/app",
        },
      ],
      () => "Schreibe eine README",
    );
    expect(csv).toBe(
      '﻿name;email;task_id;task;version;passed_at;repository;commit\n"Anna ""A""; Test";anna@example.com;readme;Schreibe eine README;2;2026-11-09T10:00:00.000Z;anna/app;abc\n',
    );
  });
});
