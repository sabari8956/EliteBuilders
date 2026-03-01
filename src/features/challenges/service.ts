import { getStore, nextId, nowIso, type Challenge } from "../platform/store";
import type { User } from "../platform/store";

export function createChallenge(input: {
  title: string;
  brief: string;
  rubric: Record<string, unknown>;
  deadline: string;
  prize?: string;
}, sponsor: User): Challenge {
  const store = getStore();
  const now = nowIso();

  const challenge: Challenge = {
    id: nextId("chl"),
    title: input.title,
    brief: input.brief,
    rubric: input.rubric,
    deadline: input.deadline,
    prize: input.prize,
    sponsorId: sponsor.id,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  store.challenges.set(challenge.id, challenge);
  return challenge;
}

export function updateChallenge(id: string, patch: Partial<Omit<Challenge, "id" | "sponsorId" | "createdAt" | "publishedAt">>, actor: User): Challenge | null {
  const store = getStore();
  const challenge = store.challenges.get(id);

  if (!challenge || challenge.sponsorId !== actor.id) {
    return null;
  }

  const updated: Challenge = {
    ...challenge,
    ...patch,
    updatedAt: nowIso(),
  };

  store.challenges.set(id, updated);
  return updated;
}

export function publishChallenge(id: string, actor: User): { challenge?: Challenge; error?: string } {
  const store = getStore();
  const challenge = store.challenges.get(id);

  if (!challenge) {
    return { error: "NOT_FOUND" };
  }

  if (actor.role !== "admin" && challenge.sponsorId !== actor.id) {
    return { error: "FORBIDDEN" };
  }

  if (challenge.status !== "draft") {
    return { error: "INVALID_TRANSITION" };
  }

  const updated: Challenge = {
    ...challenge,
    status: "published",
    publishedAt: nowIso(),
    updatedAt: nowIso(),
  };

  store.challenges.set(id, updated);
  return { challenge: updated };
}

export function listChallenges(filters: { status?: "draft" | "published"; deadlineOrder?: "asc" | "desc" }): Challenge[] {
  const all = [...getStore().challenges.values()];

  const filtered = filters.status ? all.filter((challenge) => challenge.status === filters.status) : all;

  const sorted = filtered.sort((a, b) => {
    const result = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    return filters.deadlineOrder === "desc" ? -result : result;
  });

  return sorted;
}

export function getChallenge(id: string): Challenge | null {
  return getStore().challenges.get(id) ?? null;
}

export function deleteChallenge(id: string, actor: User): { deleted?: boolean; error?: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" } {
  const store = getStore();
  const challenge = store.challenges.get(id);

  if (!challenge) {
    return { error: "NOT_FOUND" };
  }

  if (actor.role !== "admin" && challenge.sponsorId !== actor.id) {
    return { error: "FORBIDDEN" };
  }

  if (challenge.status !== "draft") {
    return { error: "INVALID_STATE" };
  }

  store.challenges.delete(id);
  return { deleted: true };
}
