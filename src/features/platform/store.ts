import { Role } from "../auth/roles";

export type UserProfile = {
  githubUrl: string;
  portfolioUrl: string;
  cvMetadata?: string;
};

export type User = {
  id: string;
  githubHandle: string;
  role: Role;
  profile?: UserProfile;
  createdAt: string;
};

export type ChallengeStatus = "draft" | "published";

export type Challenge = {
  id: string;
  title: string;
  brief: string;
  rubric: Record<string, unknown>;
  deadline: string;
  prize?: string;
  sponsorId: string;
  status: ChallengeStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "queued"
  | "running"
  | "ai_scored"
  | "awaiting_human_review"
  | "finalized"
  | "failed"
  | "disqualified";

export type Submission = {
  id: string;
  challengeId: string;
  builderId: string;
  snapshotRef: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  at: string;
  type: "unauthorized";
  path: string;
  actorUserId: string | null;
  requiredRoles: Role[];
};

type StoreState = {
  counters: {
    user: number;
    challenge: number;
    submission: number;
    session: number;
  };
  users: Map<string, User>;
  usersByGithub: Map<string, string>;
  sessions: Map<string, string>;
  challenges: Map<string, Challenge>;
  submissions: Map<string, Submission>;
  audits: AuditEvent[];
};

declare global {
  var __platformStore: StoreState | undefined;
}

function createStore(): StoreState {
  return {
    counters: { user: 0, challenge: 0, submission: 0, session: 0 },
    users: new Map(),
    usersByGithub: new Map(),
    sessions: new Map(),
    challenges: new Map(),
    submissions: new Map(),
    audits: [],
  };
}

export function getStore(): StoreState {
  if (!globalThis.__platformStore) {
    globalThis.__platformStore = createStore();
  }

  return globalThis.__platformStore;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function nextId(prefix: "usr" | "chl" | "sub"): string {
  const store = getStore();

  if (prefix === "usr") {
    store.counters.user += 1;
    return `usr_${String(store.counters.user).padStart(6, "0")}`;
  }

  if (prefix === "chl") {
    store.counters.challenge += 1;
    return `chl_${String(store.counters.challenge).padStart(6, "0")}`;
  }

  store.counters.submission += 1;
  return `sub_${String(store.counters.submission).padStart(6, "0")}`;
}

export function createSessionToken(userId: string): string {
  const store = getStore();
  store.counters.session += 1;
  const token = `sess_${userId}_${Date.now().toString(36)}_${store.counters.session}`;
  store.sessions.set(token, userId);
  return token;
}
