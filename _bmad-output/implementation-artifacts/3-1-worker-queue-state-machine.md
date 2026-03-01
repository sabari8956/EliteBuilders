# Story 3.1: Worker queue state machine

Status: done

## Story
As the platform,
I want queued submissions processed by leased worker jobs,
so that evaluations run asynchronously and reliably.

## Acceptance Criteria
1. Worker leases queued jobs safely without duplicate processing.
2. Submission states progress deterministically (`queued->running->ai_scored|failed`).
3. Failed jobs capture error details and support retry attempts.

## Tasks / Subtasks
- [x] Build worker process with polling/lease logic (AC: 1)
- [x] Implement state transition service with guardrails (AC: 2)
- [x] Add retry/error persistence fields and logic (AC: 3)

## Dev Notes
- Prioritize deterministic transitions over feature breadth.
- Emit internal events for status updates and metrics.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/hackathon-priority-plan.md#Minimal State Machine (Do Not Skip)]

## Dev Agent Record
- Implemented isolated Epic 3 worker in `src/features/evaluation/worker.ts` with safe lease semantics (`queued` and expired `leased` jobs), attempt tracking, lease token/expiry, and retry backoff.
- Added deterministic transition guardrails in `src/features/evaluation/state-machine.ts` with canonical lifecycle validation.
- Persisted retry/error data (`attempt`, `last_error`, `next_retry_at`, `max_attempts`) in file-backed demo storage for deterministic local runs.
- Exposed worker controls via isolated endpoints: `POST /api/epic3/worker/run-once` and `GET /api/epic3/worker/snapshot`.
- Validation: `npm run lint` passes. `npm run build` currently fails on a pre-existing non-Epic-3 type issue in `src/app/api/challenges/route.ts`.

## File List
- src/features/evaluation/worker.ts
- src/features/evaluation/state-machine.ts
- src/features/evaluation/store.ts
- src/features/evaluation/types.ts
- src/app/api/epic3/worker/run-once/route.ts
- src/app/api/epic3/worker/snapshot/route.ts

## Course Correction (2026-03-02)
- This story remains foundational and is retained as-is.
- Queue leasing/state machine now serves the lean grouped-agent graph orchestration in Epic 3.
