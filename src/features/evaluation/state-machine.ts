import {
  type Submission,
  type SubmissionState,
  submissionStates,
} from "@/features/evaluation/types";
import { pushTimeline } from "@/features/evaluation/store";

const transitions: Record<SubmissionState, SubmissionState[]> = {
  draft: ["submitted"],
  submitted: ["queued", "disqualified"],
  queued: ["running", "failed", "disqualified"],
  running: ["ai_scored", "queued", "failed", "disqualified"],
  ai_scored: ["awaiting_human_review", "failed", "disqualified"],
  awaiting_human_review: ["finalized", "failed", "disqualified"],
  finalized: [],
  failed: ["queued"],
  disqualified: [],
};

export function isSubmissionState(value: string): value is SubmissionState {
  return submissionStates.includes(value as SubmissionState);
}

export function canTransition(from: SubmissionState, to: SubmissionState): boolean {
  return transitions[from].includes(to);
}

export function transitionSubmission(
  submission: Submission,
  to: SubmissionState,
  message: string,
  at = new Date().toISOString(),
) {
  if (!canTransition(submission.state, to)) {
    throw new Error(
      `Invalid transition for submission ${submission.id}: ${submission.state} -> ${to}`,
    );
  }

  pushTimeline(submission, to, message, at);
}
