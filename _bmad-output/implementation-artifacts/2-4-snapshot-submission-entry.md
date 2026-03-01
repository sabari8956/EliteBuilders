# Story 2.4: Snapshot submission handoff

Status: ready-for-dev

## Story
As a builder,
I want to submit a workspace snapshot,
so that evaluator pipeline can process my work deterministically.

## Acceptance Criteria
1. Submit action persists snapshot reference and submission record.
2. Submission transitions to `queued`.
3. Eval job record is created for worker consumption.

## Tasks / Subtasks
- [ ] Persist snapshot metadata and submission
- [ ] Create queue record transactionally
- [ ] Return submission ID and status to UI

## References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Epic 2]
