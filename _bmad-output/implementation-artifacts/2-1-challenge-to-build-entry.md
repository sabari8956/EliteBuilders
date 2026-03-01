# Story 2.1: Challenge-to-build entry

Status: ready-for-dev

## Story
As a builder,
I want to enter build mode directly from a challenge,
so that I can start building immediately.

## Acceptance Criteria
1. Challenge detail page has a `Start Building` action.
2. Action creates/opens a builder workspace session scoped to challenge + user.
3. Builder is redirected to build route with challenge context preloaded.

## Tasks / Subtasks
- [ ] Add CTA on challenge detail page
- [ ] Implement create-or-resume workspace session API
- [ ] Route to `/challenges/[id]/build` with session context

## References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Epic 2]
