# Story 3.5: Leaderboard publication

Status: done

## Story
As a sponsor or builder,
I want provisional and final leaderboard views,
so that competition ranking is transparent.

## Acceptance Criteria
1. Provisional ranking uses AI score after `ai_scored`.
2. Final ranking uses final score after `finalized`.
3. Ranking results are deterministic from persisted score records.

## Tasks / Subtasks
- [x] Implement leaderboard projection/query logic
- [x] Expose endpoint with `provisional|final` mode
- [x] Render minimal leaderboard page for demo

## References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Epic 3]

## Dev Agent Record
- Implemented deterministic leaderboard projection in `src/features/evaluation/leaderboard.ts` for both `provisional` (AI score) and `final` (finalized score) modes.
- Added isolated leaderboard endpoint: `GET /api/epic3/challenges/:id/leaderboard?mode=provisional|final`.
- Added standalone demo leaderboard page at `/epic3/leaderboard/[challengeId]`.
- Added Epic 3 index page linking worker, review, and leaderboard surfaces.

## File List
- src/features/evaluation/leaderboard.ts
- src/app/api/epic3/challenges/[id]/leaderboard/route.ts
- src/app/epic3/leaderboard/[challengeId]/page.tsx
- src/app/epic3/page.tsx

## Course Correction (2026-03-02)
- Leaderboard behavior remains valid.
- Upstream AI scoring inputs now come from grouped-agent flow with explicit runtime/test evidence.
