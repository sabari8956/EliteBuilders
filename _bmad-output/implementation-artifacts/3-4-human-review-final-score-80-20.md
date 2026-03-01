# Story 3.4: Human review and final scoring (80/20)

Status: done

## Story
As an evaluator,
I want to assign human score after AI evaluation,
so that final scores include human judgment.

## Acceptance Criteria
1. Evaluator can review AI report and submit human score.
2. Final score formula is `0.8 * ai_score + 0.2 * human_score`.
3. Submission transitions to `finalized` with immutable audit fields.

## Tasks / Subtasks
- [x] Build evaluator scoring UI/API
- [x] Compute/persist final score and audit fields
- [x] Enforce finalized transition guards

## References
- [Source: /Users/sabari/Work/projects/100x-hackathon/PRD.md#Scoring policy for MVP]

## Dev Agent Record
- Added finalization service `src/features/evaluation/finalization.ts` enforcing exact formula `final_score = 0.8 * ai_score + 0.2 * human_score`.
- Implemented immutable audit persistence on finalization: `finalized_at`, `finalized_by`, `finalization_notes`, plus persisted `human_score` and `final_score`.
- Added transition guard checks to block invalid or repeat finalization.
- Exposed finalization API: `POST /api/epic3/submissions/:id/finalize` with Zod validation.
- Added standalone evaluator UI at `/epic3/reviews/[submissionId]`.

## File List
- src/features/evaluation/finalization.ts
- src/features/evaluation/state-machine.ts
- src/app/api/epic3/submissions/[id]/finalize/route.ts
- src/app/epic3/reviews/[submissionId]/page.tsx

## Course Correction (2026-03-02)
- Human finalization remains valid and unchanged in scoring policy.
- Upstream AI outputs are now expected from grouped-agent `ScoringReportingAgent` handoff.
