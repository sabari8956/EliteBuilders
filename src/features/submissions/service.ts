import { getStore, nextId, nowIso, type Submission } from "../platform/store";
import type { User } from "../platform/store";

export function createSubmission(input: { challengeId: string; snapshotRef: string }, builder: User): { submission?: Submission; error?: string } {
  const store = getStore();
  const challenge = store.challenges.get(input.challengeId);

  if (!challenge || challenge.status !== "published") {
    return { error: "CHALLENGE_UNAVAILABLE" };
  }

  const now = nowIso();

  const submission: Submission = {
    id: nextId("sub"),
    challengeId: input.challengeId,
    builderId: builder.id,
    snapshotRef: input.snapshotRef,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  store.submissions.set(submission.id, submission);
  return { submission };
}

export function getSubmission(id: string): Submission | null {
  return getStore().submissions.get(id) ?? null;
}
