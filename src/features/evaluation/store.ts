import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  type DemoDatabase,
  type EvaluationReport,
  type RubricCriterion,
  type Submission,
  type SubmissionState,
} from "@/features/evaluation/types";

const dataDir = path.join(process.cwd(), ".data");
const dataFile = process.env.EPIC3_DB_FILE ?? path.join(dataDir, "demo-db.json");

let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function seedDatabase(): DemoDatabase {
  const createdAt = nowIso();

  const challengeId = "challenge-demo-001";
  const submissionId = "submission-demo-001";
  const jobId = "job-demo-001";

  const submission: Submission = {
    id: submissionId,
    challenge_id: challengeId,
    builder_id: "builder-alex",
    repo_url: "https://github.com/octocat/Hello-World.git",
    repo_branch: "master",
    rubric_id: "hackathon-rubric-v1",
    snapshot_ref: "snapshot://demo/submission-demo-001",
    snapshot_context:
      "React app with authentication, challenge listing, and submit flow. Includes TODOs for retry handling and weak input validation.",
    state: "queued",
    created_at: createdAt,
    updated_at: createdAt,
    ai_score: null,
    human_score: null,
    final_score: null,
    ai_evidence_id: null,
    finalized_at: null,
    finalized_by: null,
    finalization_notes: null,
    timeline: [
      {
        state: "submitted",
        at: createdAt,
        message: "Submission received from builder workspace.",
      },
      {
        state: "queued",
        at: createdAt,
        message: "Submission queued for autonomous evaluation.",
      },
    ],
  };

  return {
    challenges: [
      {
        id: challengeId,
        title: "Build a resilient challenge submission pipeline",
        created_at: createdAt,
        ai_weight: 0.8,
        rubric: [
          {
            id: "architecture",
            title: "Architecture",
            description: "Design clarity and modularity",
            weight: 0.35,
            max_score: 100,
            keywords: ["modular", "layer", "service", "interface"],
          },
          {
            id: "reliability",
            title: "Reliability",
            description: "Retry, error handling, and deterministic behavior",
            weight: 0.4,
            max_score: 100,
            keywords: ["retry", "idempotent", "queue", "guard", "timeout"],
          },
          {
            id: "developer_experience",
            title: "Developer Experience",
            description: "Readability and maintainability",
            weight: 0.25,
            max_score: 100,
            keywords: ["readme", "typed", "test", "lint", "docs"],
          },
        ],
      },
    ],
    submissions: [submission],
    reports: [],
  };
}

async function ensureSeeded() {
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(seedDatabase(), null, 2), "utf8");
  }
}

async function readDb(): Promise<DemoDatabase> {
  await ensureSeeded();
  const content = await readFile(dataFile, "utf8");
  return JSON.parse(content) as DemoDatabase;
}

async function writeDb(db: DemoDatabase): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tmpFile = `${dataFile}.${randomUUID()}.tmp`;
  await writeFile(tmpFile, JSON.stringify(db, null, 2), "utf8");
  await rename(tmpFile, dataFile);
}

export async function withDatabase<T>(
  mutator: (db: DemoDatabase) => Promise<T> | T,
): Promise<T> {
  let result!: T;

  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    result = await mutator(db);
    await writeDb(db);
  });

  await writeQueue;
  return result;
}

export async function getDatabase(): Promise<DemoDatabase> {
  return readDb();
}

export function pushTimeline(
  submission: Submission,
  state: SubmissionState,
  message: string,
  at = nowIso(),
) {
  submission.state = state;
  submission.updated_at = at;
  submission.timeline.push({ state, at, message });
}

/** Convert a flat platform rubric (e.g. { innovation: 40, quality: 60 }) to Epic3 criteria. */
function convertPlatformRubric(rubric: Record<string, unknown>): RubricCriterion[] {
  const entries = Object.entries(rubric).filter(([, v]) => typeof v === "number" && (v as number) > 0);
  if (entries.length === 0) {
    return [{ id: "overall", title: "Overall Quality", description: "Overall project quality and implementation", weight: 1, max_score: 100, keywords: [] }];
  }
  const total = entries.reduce((s, [, v]) => s + (v as number), 0);
  return entries.map(([key, value]) => ({
    id: key,
    title: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Evaluation of ${key.replace(/_/g, " ")}`,
    weight: (value as number) / total,
    max_score: 100,
    keywords: [key],
  }));
}

/**
 * Bridge: called after a platform submission is created to register it in the
 * Epic3 evaluation pipeline. Idempotent — safe to call multiple times.
 */
export async function queueSubmissionForEvaluation(params: {
  submissionId: string;
  challengeId: string;
  challengeTitle: string;
  challengeRubric: Record<string, unknown>;
  builderId: string;
  repoUrl: string;
}): Promise<void> {
  await withDatabase((db) => {
    const now = nowIso();
    const criteria = convertPlatformRubric(params.challengeRubric);

    // Upsert challenge so the worker can find the rubric
    const cidx = db.challenges.findIndex((c) => c.id === params.challengeId);
    const epic3Challenge = { id: params.challengeId, title: params.challengeTitle, rubric: criteria, created_at: now, ai_weight: 0.8 as const };
    if (cidx >= 0) db.challenges[cidx] = epic3Challenge;
    else db.challenges.push(epic3Challenge);

    // Idempotent — bail out if already registered
    if (db.submissions.some((s) => s.id === params.submissionId)) return;

    const submission: Submission = {
      id: params.submissionId,
      challenge_id: params.challengeId,
      builder_id: params.builderId,
      repo_url: params.repoUrl,
      repo_branch: null,
      rubric_id: params.challengeId,
      snapshot_ref: params.repoUrl,
      snapshot_context: `Submission for challenge: ${params.challengeTitle}`,
      state: "queued",
      created_at: now,
      updated_at: now,
      ai_score: null,
      human_score: null,
      final_score: null,
      ai_evidence_id: null,
      finalized_at: null,
      finalized_by: null,
      finalization_notes: null,
      timeline: [
        { state: "submitted", at: now, message: "Submission received from builder." },
        { state: "queued", at: now, message: "Queued for autonomous AI evaluation." },
      ],
    };
    db.submissions.push(submission);
  });
}

export function upsertReport(db: DemoDatabase, report: EvaluationReport) {
  const existingIndex = db.reports.findIndex(
    (entry) => entry.submission_id === report.submission_id,
  );

  if (existingIndex >= 0) {
    db.reports[existingIndex] = report;
    return;
  }

  db.reports.push(report);
}
