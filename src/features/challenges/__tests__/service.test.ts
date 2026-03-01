import { beforeEach, describe, expect, it } from "vitest";
import { createChallenge, listChallenges, publishChallenge } from "@/features/challenges/service";
import { resetStoreForTests } from "@/features/platform/reset";
import { getStore, nowIso, type User } from "@/features/platform/store";

function seedUser(role: User["role"], id: string): User {
  const user: User = {
    id,
    githubHandle: `${id}_gh`,
    role,
    createdAt: nowIso(),
  };

  getStore().users.set(id, user);
  return user;
}

describe("challenge service", () => {
  beforeEach(() => {
    resetStoreForTests();
  });

  it("creates draft challenge with deterministic id", () => {
    const sponsor = seedUser("sponsor", "usr_900001");

    const challenge = createChallenge(
      {
        title: "AI Agent Sprint",
        brief: "Build and deploy an autonomous code review pipeline.",
        rubric: { impact: 50, reliability: 50 },
        deadline: "2026-04-01T10:00:00.000Z",
      },
      sponsor,
    );

    expect(challenge.id).toBe("chl_000001");
    expect(challenge.status).toBe("draft");
  });

  it("publishes draft challenge and blocks second publish", () => {
    const sponsor = seedUser("sponsor", "usr_900002");
    const challenge = createChallenge(
      {
        title: "Agentic QA",
        brief: "Create reproducible test automation with CI diagnostics.",
        rubric: { quality: 60, speed: 40 },
        deadline: "2026-04-02T10:00:00.000Z",
      },
      sponsor,
    );

    const first = publishChallenge(challenge.id, sponsor);
    expect(first.challenge?.status).toBe("published");

    const second = publishChallenge(challenge.id, sponsor);
    expect(second.error).toBe("INVALID_TRANSITION");
  });

  it("returns published-only list by filter", () => {
    const sponsor = seedUser("sponsor", "usr_900003");

    const draft = createChallenge(
      {
        title: "Draft",
        brief: "This is still draft and should not appear in published filter.",
        rubric: { ux: 100 },
        deadline: "2026-04-03T10:00:00.000Z",
      },
      sponsor,
    );

    const live = createChallenge(
      {
        title: "Live",
        brief: "This will be published for builder catalog consumption now.",
        rubric: { code: 100 },
        deadline: "2026-04-04T10:00:00.000Z",
      },
      sponsor,
    );
    publishChallenge(live.id, sponsor);

    const published = listChallenges({ status: "published", deadlineOrder: "asc" });
    expect(published.map((item) => item.id)).toEqual([live.id]);
    expect(published.find((item) => item.id === draft.id)).toBeUndefined();
  });
});
