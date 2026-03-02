import { getStore, nextId, nowIso, type Submission, type SubmissionStatus } from "../platform/store";
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

export function listSubmissions(filters: { builderId?: string; challengeId?: string; status?: SubmissionStatus }): Submission[] {
  const all = Array.from(getStore().submissions.values());
  return all.filter((s) => {
    if (filters.builderId && s.builderId !== filters.builderId) return false;
    if (filters.challengeId && s.challengeId !== filters.challengeId) return false;
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });
}
