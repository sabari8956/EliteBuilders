# Story 2.3: Workspace session persistence

Status: ready-for-dev

## Story
As a builder,
I want workspace sessions saved and resumable,
so that I can continue building without losing progress context.

## Acceptance Criteria
1. Workspace session is keyed by `builder_id + challenge_id`.
2. Opening build route resumes active session if present.
3. Session records include last activity timestamp.

## Tasks / Subtasks
- [ ] Define `workspace_sessions` schema.
- [ ] Implement create-or-resume session API.
- [ ] Load and restore active session on build page init.
- [ ] Update session heartbeat on key builder actions.

## Dev Notes
- Persist metadata and references; avoid heavy payload storage.
- Keep interface neutral for Daytona or fallback provider.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Story 2.3]
