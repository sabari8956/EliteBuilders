import {
  type LeaderboardEntry,
  type LeaderboardMode,
  type Submission,
} from "@/features/evaluation/types";

function byScoreThenTime(
  a: Submission,
  b: Submission,
  scoreSelector: (submission: Submission) => number,
): number {
  const scoreDiff = scoreSelector(b) - scoreSelector(a);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const timeDiff = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (timeDiff !== 0) {
    return timeDiff;
  }

  return a.id.localeCompare(b.id);
}

/**
 * Projects submissions onto a leaderboard.
 *
 * **Important:** `"provisional"` mode shows `ai_score` values for submissions
 * that may not yet have been human-reviewed. These scores are unvalidated AI
 * outputs and are subject to change after finalization. Do not present
 * provisional scores as authoritative rankings.
 *
 * Only `"final"` mode reflects human-validated `final_score` values.
 */
export function projectLeaderboard(
  submissions: Submission[],
  challengeId: string,
  mode: LeaderboardMode,
): LeaderboardEntry[] {
  const scoped = submissions.filter(
    (submission) => submission.challenge_id === challengeId,
  );

  const eligible =
    mode === "provisional"
      ? scoped.filter(
          (submission) =>
            submission.ai_score !== null &&
            ["ai_scored", "awaiting_human_review", "finalized"].includes(
              submission.state,
            ),
        )
      : scoped.filter(
          (submission) =>
            submission.final_score !== null && submission.state === "finalized",
        );

  const sorted =
    mode === "provisional"
      ? eligible.sort((a, b) => byScoreThenTime(a, b, (entry) => entry.ai_score ?? 0))
      : eligible.sort((a, b) =>
          byScoreThenTime(a, b, (entry) => entry.final_score ?? 0),
        );

  return sorted.map((submission, index) => ({
    rank: index + 1,
    submission_id: submission.id,
    builder_id: submission.builder_id,
    score: mode === "provisional" ? submission.ai_score ?? 0 : submission.final_score ?? 0,
    state: submission.state,
    updated_at: submission.updated_at,
    is_provisional: mode === "provisional" && submission.state !== "finalized",
  }));
}
