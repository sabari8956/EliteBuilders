import { describe, expect, it } from "vitest";
import { fail, ok } from "@/features/api/envelope";

describe("api envelope", () => {
  it("returns success envelope", () => {
    expect(ok({ status: "ok" })).toEqual({
      data: { status: "ok" },
      error: null,
    });
  });

  it("returns error envelope", () => {
    expect(fail("FORBIDDEN", "Blocked")).toEqual({
      data: null,
      error: {
        code: "FORBIDDEN",
        message: "Blocked",
      },
    });
  });
});
