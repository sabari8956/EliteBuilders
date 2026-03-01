import { beforeEach, describe, expect, it } from "vitest";
import { createChallenge, publishChallenge } from "@/features/challenges/service";
import { resetStoreForTests } from "@/features/platform/reset";
import { getStore, nowIso, type User } from "@/features/platform/store";
import { createSubmission, getSubmission } from "@/features/submissions/service";

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

describe("submission service", () => {
  beforeEach(() => {
    resetStoreForTests();
  });

  it("creates queued submission with deterministic id/timestamps", () => {
    const sponsor = seedUser("sponsor", "usr_910001");
    const builder = seedUser("builder", "usr_910002");
    const challenge = createChallenge(
      {
        title: "Deterministic IDs",
        brief: "Generate deterministic artifacts and status transitions for evaluator lane.",
        rubric: { determinism: 100 },
        deadline: "2026-04-10T10:00:00.000Z",
      },
      sponsor,
    );

    publishChallenge(challenge.id, sponsor);

    const created = createSubmission({ challengeId: challenge.id, snapshotRef: "s3://snapshots/snap-001" }, builder);
    expect(created.submission?.id).toBe("sub_000001");
    expect(created.submission?.status).toBe("queued");
    expect(created.submission?.createdAt).toBe(created.submission?.updatedAt);
  });

  it("rejects submissions for unavailable challenges", () => {
    const builder = seedUser("builder", "usr_910003");
    const result = createSubmission({ challengeId: "chl_unknown", snapshotRef: "x" }, builder);
    expect(result.error).toBe("CHALLENGE_UNAVAILABLE");
  });

  it("returns stored submission by id", () => {
    const sponsor = seedUser("sponsor", "usr_910004");
    const builder = seedUser("builder", "usr_910005");
    const challenge = createChallenge(
      {
        title: "Lookup",
        brief: "Ensure submission lookup returns canonical payload for downstream consumers.",
        rubric: { api: 100 },
        deadline: "2026-04-11T10:00:00.000Z",
      },
      sponsor,
    );

    publishChallenge(challenge.id, sponsor);
    const created = createSubmission({ challengeId: challenge.id, snapshotRef: "artifact://42" }, builder);

    const loaded = getSubmission(created.submission!.id);
    expect(loaded?.snapshotRef).toBe("artifact://42");
  });
});
