import { beforeEach, describe, expect, it } from "vitest";
import { signInOrLinkGithub } from "@/features/auth/oauth";
import { resetStoreForTests } from "@/features/platform/reset";
import { getStore } from "@/features/platform/store";

describe("github oauth simulation", () => {
  beforeEach(() => {
    resetStoreForTests();
  });

  it("creates a new user and session", async () => {
    const first = await signInOrLinkGithub("Sabari", "sponsor");

    expect(first.userId).toBe("usr_000001");
    expect(first.sessionToken).toContain("sess_usr_000001_");

    const user = getStore().users.get(first.userId);
    expect(user?.role).toBe("sponsor");
  });

  it("links existing github user and issues new session", async () => {
    const first = await signInOrLinkGithub("sabari");
    const second = await signInOrLinkGithub("SABARI");

    expect(second.userId).toBe(first.userId);
    expect(second.sessionToken).not.toBe(first.sessionToken);
  });
});
