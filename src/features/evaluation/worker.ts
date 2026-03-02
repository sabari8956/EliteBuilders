import { runCourseCorrectedEvaluation } from "@/features/evaluation/langgraph-evaluator";
import { transitionSubmission } from "@/features/evaluation/state-machine";
import { getDatabase, upsertReport, withDatabase } from "@/features/evaluation/store";
import type { DemoDatabase, Submission, SubmissionState } from "@/features/evaluation/types";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/features/platform/supabase";
import { getStore } from "@/features/platform/store";

/**
 * At most EPIC3_MAX_CONCURRENT evaluations run simultaneously.
 * The semaphore is process-local and resets on restart.
 */
const maxConcurrent = Number(process.env.EPIC3_MAX_CONCURRENT ?? "3");
let activeEvaluations = 0;

/**
 * Sync the Epic3 submission state back to the platform status column
 * (Supabase or in-memory store) so the builder's detail page chip
 * reflects live evaluation progress without a separate sync job.
 */
async function syncPlatformStatus(submissionId: string, state: SubmissionState): Promise<void> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("submissions")
        .update({ status: state, updated_at: now })
        .eq("id", submissionId);
    } catch (err) {
      console.warn("[EVALUATOR] syncPlatformStatus (supabase) failed:", err);
    }
    return;
  }

  // Local in-memory platform store fallback
  try {
    const store = getStore();
    const sub = store.submissions.get(submissionId);
    if (sub) {
      sub.status = state as never; // SubmissionStatus mirrors SubmissionState
      sub.updatedAt = now;
    }
  } catch (err) {
    console.warn("[EVALUATOR] syncPlatformStatus (local) failed:", err);
  }
}

function findSubmission(db: DemoDatabase, submissionId: string): Submission {
  const submission = db.submissions.find((entry) => entry.id === submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found.`);
  }

  return submission;
}

export type EvalResult = {
  status: "processed" | "error" | "busy";
  submission_id: string;
  ai_score?: number;
  message: string;
};

/**
 * Starts an immediate evaluation for a specific submission.
 * Bypasses any queuing system and starts processing right away.
 */
export async function evaluateSubmission(submissionId: string): Promise<EvalResult> {
  // Reject if concurrency cap is reached.
  if (activeEvaluations >= maxConcurrent) {
    console.log(`[EVALUATOR] Concurrency cap reached. Cannot evaluate ${submissionId} immediately.`);
    return {
      status: "busy",
      submission_id: submissionId,
      message: `Concurrency cap reached (${activeEvaluations}/${maxConcurrent} active). Submission ${submissionId} will not be processed immediately.`,
    };
  }

  console.log(`[EVALUATOR] Starting automatic evaluation for ${submissionId} (${activeEvaluations + 1}/${maxConcurrent} active)`);
  activeEvaluations++;
  try {
    return await withDatabase(async (db) => {
      const nowIso = new Date().toISOString();
      let submission: Submission;
      try {
        submission = findSubmission(db, submissionId);
      } catch (err) {
        return {
          status: "error",
          submission_id: submissionId,
          message: err instanceof Error ? err.message : "Unknown error",
        };
      }

      try {
        if (submission.state === "queued" || submission.state === "submitted") {
          transitionSubmission(
            submission,
            "running",
            "Starting autonomous evaluation immediately.",
            nowIso,
          );
          // Sync "running" state back to platform immediately
          void syncPlatformStatus(submission.id, "running");
        } else if (submission.state === "running") {
          // Already running, maybe another request triggered it?
          return {
            status: "processed",
            submission_id: submissionId,
            message: "Submission is already being evaluated.",
          };
        } else {
          // If it's failed, we might want to allow re-running, but the user said "automatically start" 
          // which implies the first-time flow.
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

        // Sync final pre-human state back to platform
        void syncPlatformStatus(submission.id, "awaiting_human_review");

        console.log(`[EVALUATOR] Completed AI evaluation for ${submissionId} with score ${runResult.evidence.aggregate_score}`);

        return {
          status: "processed",
          submission_id: submission.id,
          ai_score: runResult.evidence.aggregate_score,
          message: "Submission evaluated successfully.",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown evaluation error";

        transitionSubmission(
          submission,
          "failed",
          `Evaluation failed: ${errorMessage}`,
        );
        void syncPlatformStatus(submission.id, "failed");

        console.error(`[EVALUATOR] Evaluation failed for ${submissionId}:`, error);

        return {
          status: "error",
          submission_id: submission.id,
          message: errorMessage,
        };
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
    active_evaluations: activeEvaluations,
    concurrency_limit: maxConcurrent,
    submissions: db.submissions.map((submission) => ({
      id: submission.id,
      state: submission.state,
      ai_score: submission.ai_score,
      updated_at: submission.updated_at,
    })),
  };
}
