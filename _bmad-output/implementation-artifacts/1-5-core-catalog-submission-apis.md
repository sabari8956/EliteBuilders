# Story 1.5: Core catalog and submission contracts

Status: done

## Story
As the platform,
I want stable challenge and submission APIs,
so that builder and evaluator pipelines can integrate without ambiguity.

## Acceptance Criteria
1. `GET /api/challenges` returns published challenges with minimal filters.
2. `POST /api/submissions` creates submission with deterministic IDs and timestamps.
3. `GET /api/submissions/:id` returns canonical status payload.
4. All APIs use `{data,error}` envelope.

## Tasks / Subtasks
- [x] Add challenge listing endpoint with status/deadline filtering.
- [x] Add submission create and read endpoints.
- [x] Standardize shared API response helper for envelope shape.
- [x] Add endpoint contract notes for downstream lanes.

## Dev Notes
- Keep query params simple for hackathon (status, deadline sort).
- Use ISO UTC in payloads.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Epic 1]

## Dev Agent Record
- Added shared response envelope helper used across health/auth/profile/challenge/submission routes.
- Added published-by-default challenge listing with optional status and deadline sort filters.
- Added submission create/read APIs with deterministic IDs, UTC timestamps, and canonical payload shape.
- Added endpoint contract documentation for downstream builder/evaluator lanes.
- Added Vitest unit coverage for envelope, OAuth link/create behavior, challenge lifecycle, and submission contracts.
- Validation: `npm run lint`, `npm run test` both passing.

## File List
- src/features/api/envelope.ts
- src/app/api/challenges/route.ts
- src/app/api/submissions/route.ts
- src/app/api/submissions/[id]/route.ts
- src/features/submissions/schema.ts
- src/features/submissions/service.ts
- docs/api-contracts.md
- vitest.config.ts
- src/features/api/__tests__/envelope.test.ts
- src/features/auth/__tests__/oauth.test.ts
- src/features/challenges/__tests__/service.test.ts
- src/features/submissions/__tests__/service.test.ts
- package.json
