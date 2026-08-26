import { describe, test, expect } from "bun:test";
import { runCLI } from "./helpers";

// These assert on validation error codes that are emitted BEFORE any network
// call, so the suite is network-free: the valid-numeric case still runs offline
// because a valid --limit with no filter fails with MISSING_REQUIRED (not
// BAD_ARG) before the CLI ever touches the RSS feed.

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("jobbank CLI flag validation", () => {
  describe("numeric flag validation", () => {
    for (const name of ["company", "limit"]) {
      test(`--${name} non-numeric exits 1 with BAD_ARG`, async () => {
        const result = await runCLI(["search", "--key", "data", `--${name}`, "foo"]);
        expect(result.exitCode).not.toBe(0);
        const err = parsedStderr(result.stderr);
        expect(err.code).toBe("BAD_ARG");
        expect(err.error).toMatch(new RegExp(name));
      });
    }

    test("a valid --limit passes numeric validation (no BAD_ARG)", async () => {
      // No filter flag, so the filter check fires after numeric validation —
      // proving the number was accepted, without any network call.
      const result = await runCLI(["search", "--limit", "5"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("MISSING_REQUIRED");
    });
  });

  describe("search filter requirement", () => {
    test("no filters exits 1 with MISSING_REQUIRED", async () => {
      const result = await runCLI(["search"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("MISSING_REQUIRED");
    });
  });

  describe("detail argument validation", () => {
    test("missing job ID exits 1 with MISSING_REQUIRED", async () => {
      const result = await runCLI(["detail"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("MISSING_REQUIRED");
    });
  });

  describe("command dispatch", () => {
    test("unknown command exits 1 with BAD_CMD", async () => {
      const result = await runCLI(["frobnicate"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("BAD_CMD");
    });

    test("no command prints help and exits 1", async () => {
      const result = await runCLI([]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(/USAGE/);
    });
  });
});
