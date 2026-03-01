import { randomUUID } from "node:crypto";
import { runCourseCorrectedEvaluation } from "@/features/evaluation/langgraph-evaluator";
import { transitionSubmission } from "@/features/evaluation/state-machine";
import { getDatabase, upsertReport, withDatabase } from "@/features/evaluation/store";
import type { DemoDatabase, EvalJob, Submission } from "@/features/evaluation/types";

const leaseMs = 60_000;
const leaseRenewalMs = 30_000;

/**
 * At most EPIC3_MAX_CONCURRENT evaluations run simultaneously.
 * The semaphore is process-local and resets on restart.
 */
const maxConcurrent = Number(process.env.EPIC3_MAX_CONCURRENT ?? "3");
let activeEvaluations = 0;

function isJobLeasable(job: EvalJob, now: number): boolean {
  if (job.status === "queued") {
    if (!job.next_retry_at) {
      return true;
    }

    return Date.parse(job.next_retry_at) <= now;
  }

  if (job.status !== "leased") {
    return false;
  }

  if (!job.lease_expires_at) {
    return true;
  }

  return Date.parse(job.lease_expires_at) <= now;
}

function findSubmission(db: DemoDatabase, submissionId: string): Submission {
  const submission = db.submissions.find((entry) => entry.id === submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found.`);
  }

  return submission;
}

function leaseJob(db: DemoDatabase, nowIso: string): EvalJob | null {
  const now = Date.parse(nowIso);
  const job = db.eval_jobs
    .filter((candidate) => isJobLeasable(candidate, now))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0];

  if (!job) {
    return null;
  }

  job.status = "leased";
  job.attempt += 1;
  job.lease_token = `lease-${randomUUID()}`;
  job.lease_expires_at = new Date(now + leaseMs).toISOString();
  job.updated_at = nowIso;

  return job;
}

function toQueuedWithRetry(job: EvalJob, nowIso: string, error: string) {
  const backoffMs = Math.min(30_000, job.attempt * 5_000);
  job.status = "queued";
  job.last_error = error;
  job.next_retry_at = new Date(Date.parse(nowIso) + backoffMs).toISOString();
  job.lease_token = null;
  job.lease_expires_at = null;
  job.updated_at = nowIso;
}

function completeJob(job: EvalJob, nowIso: string) {
  job.status = "completed";
  job.last_error = null;
  job.next_retry_at = null;
  job.lease_token = null;
  job.lease_expires_at = null;
  job.updated_at = nowIso;
}

function failJob(job: EvalJob, nowIso: string, error: string) {
  job.status = "failed";
  job.last_error = error;
  job.next_retry_at = null;
  job.lease_token = null;
  job.lease_expires_at = null;
  job.updated_at = nowIso;
}

export type RunOnceResult = {
  status: "processed" | "idle";
  submission_id?: string;
  job_id?: string;
  ai_score?: number;
  message: string;
};

export async function runWorkerOnce(): Promise<RunOnceResult> {
  // Reject the poll immediately if concurrency cap is reached.
  if (activeEvaluations >= maxConcurrent) {
    return {
      status: "idle",
      message: `Concurrency cap reached (${activeEvaluations}/${maxConcurrent} active). Skipping poll.`,
    };
  }

  activeEvaluations++;
  try {
    return await withDatabase(async (db) => {
      const nowIso = new Date().toISOString();
      const job = leaseJob(db, nowIso);

      if (!job) {
        return {
          status: "idle",
          message: "No leasable evaluation job available.",
        };
      }

      const submission = findSubmission(db, job.submission_id);

      // Extend the lease every leaseRenewalMs while the evaluation runs.
      // This mutates the in-memory job object; withDatabase serialises the
      // final state to disk once runCourseCorrectedEvaluation completes.
      const renewalInterval = setInterval(() => {
        const renewedAt = new Date().toISOString();
        job.lease_expires_at = new Date(Date.now() + leaseMs).toISOString();
        job.updated_at = renewedAt;
      }, leaseRenewalMs);

      try {
        if (submission.state === "queued") {
          transitionSubmission(
            submission,
            "running",
            `Leased by worker ${job.lease_token}. Attempt ${job.attempt}.`,
            nowIso,
          );
        } else if (submission.state !== "running") {
          throw new Error(
            `Submission ${submission.id} must be queued/running for processing. Found ${submission.state}.`,
          );
        }

        const challenge = db.challenges.find(
          (entry) => entry.id === submission.challenge_id,
        );

        if (!challenge) {
          throw new Error(`Challenge ${submission.challenge_id} not found.`);
        }

        const runResult = await runCourseCorrectedEvaluation(submission, challenge);
        submission.ai_score = runResult.evidence.aggregate_score;
        submission.ai_evidence_id = runResult.evidence.id;

        transitionSubmission(
          submission,
          "ai_scored",
          `AI evaluation completed with score ${runResult.evidence.aggregate_score} (${runResult.project_type}, ${runResult.runtime_path}).`,
        );

        upsertReport(db, runResult.report);

        transitionSubmission(
          submission,
          "awaiting_human_review",
          "AI report generated and waiting for evaluator review.",
        );

        completeJob(job, new Date().toISOString());

        return {
          status: "processed",
          submission_id: submission.id,
          job_id: job.id,
          ai_score: runResult.evidence.aggregate_score,
          message: "Submission evaluated successfully.",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown worker error";

        if (job.attempt < job.max_attempts) {
          toQueuedWithRetry(job, new Date().toISOString(), errorMessage);
          transitionSubmission(
            submission,
            "queued",
            `Evaluation failed on attempt ${job.attempt}. Queued for retry: ${errorMessage}`,
          );
        } else {
          failJob(job, new Date().toISOString(), errorMessage);
          if (submission.state !== "failed") {
            transitionSubmission(
              submission,
              "failed",
              `Evaluation failed after ${job.attempt} attempts: ${errorMessage}`,
            );
          }
        }

        return {
          status: "processed",
          submission_id: submission.id,
          job_id: job.id,
          message: errorMessage,
        };
      } finally {
        clearInterval(renewalInterval);
      }
    });
  } finally {
    activeEvaluations--;
  }
}

export async function getWorkerSnapshot() {
  const db = await getDatabase();

  return {
    runtime_mode: "daytona" as const,
    jobs: db.eval_jobs,
    submissions: db.submissions.map((submission) => ({
      id: submission.id,
      state: submission.state,
      ai_score: submission.ai_score,
      updated_at: submission.updated_at,
    })),
  };
}
