# Story 1.4: Challenge create and publish

Status: done

## Story
As a sponsor,
I want to create and publish challenges with rubric and deadline,
so that builders can discover and join real competitions.

## Acceptance Criteria
1. Sponsor can create challenge with brief, rubric JSON, deadline, prize metadata.
2. Sponsor can publish challenge from draft.
3. Validation errors are returned in consistent API envelope.

## Tasks / Subtasks
- [x] Define challenge schema and validation (AC: 1)
- [x] Implement sponsor challenge create endpoint + form UI (AC: 1)
- [x] Implement publish transition with state checks (AC: 2)

## Dev Notes
- Hackathon cut: archive/edit can be basic.
- Persist rubric in JSON for evaluator consumption.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/PRD.md#7.1 Challenge Catalog and Management]
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/architecture.md#Data Architecture]

## Dev Agent Record
- Added challenge create/update validation schema using Zod.
- Added challenge service with deterministic IDs, draft default state, and publish transition rules.
- Added sponsor challenge creation UI page at `/sponsor/challenges/new`.
- Added publish endpoint with transition and authorization checks.
- Validation: `npm run lint`, `npm run test` both passing.

## File List
- src/features/challenges/schema.ts
- src/features/challenges/service.ts
- src/app/api/challenges/route.ts
- src/app/api/challenges/[id]/route.ts
- src/app/api/challenges/[id]/publish/route.ts
- src/app/sponsor/challenges/new/page.tsx
