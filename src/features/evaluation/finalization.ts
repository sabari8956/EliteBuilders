import { transitionSubmission } from "@/features/evaluation/state-machine";
import { type Challenge, type Submission } from "@/features/evaluation/types";

/**
 * Compute the final score as a weighted blend of AI and human scores.
 * @param aiWeight - fraction attributed to AI (0–1). Defaults to 0.8.
 */
export function computeFinalScore(
  aiScore: number,
  humanScore: number,
  aiWeight = 0.8,
): number {
  const w = Math.min(1, Math.max(0, aiWeight));
  return Number((w * aiScore + (1 - w) * humanScore).toFixed(2));
}

export function finalizeSubmission(
  submission: Submission,
  evaluatorId: string,
  humanScore: number,
  notes: string,
  challenge?: Challenge,
): Submission {
  if (submission.state === "finalized") {
    throw new Error("Submission already finalized. Audit fields are immutable.");
  }

  if (submission.ai_score === null) {
    throw new Error("Cannot finalize submission without ai_score.");
  }

  if (submission.state !== "awaiting_human_review" && submission.state !== "ai_scored") {
    throw new Error(`Cannot finalize from state ${submission.state}.`);
  }

  const now = new Date().toISOString();
  submission.human_score = humanScore;
  submission.final_score = computeFinalScore(
    submission.ai_score,
    humanScore,
    challenge?.ai_weight,
  );
  submission.finalized_by = evaluatorId;
  submission.finalized_at = now;
  submission.finalization_notes = notes;

  if (submission.state === "ai_scored") {
    transitionSubmission(
      submission,
      "awaiting_human_review",
      "Submission moved to human review before finalization.",
      now,
    );
  }

  transitionSubmission(
    submission,
    "finalized",
    `Finalized by ${evaluatorId} with weighted score ${submission.final_score}.`,
    now,
  );

  return submission;
}
