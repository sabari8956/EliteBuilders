# Story 2.5: Builder status timeline

Status: ready-for-dev

## Story
As a builder,
I want real-time submission status,
so that I can see progress from queue to final score.

## Acceptance Criteria
1. Timeline displays states and timestamps.
2. Polling endpoint returns latest status and optional message.
3. Failed/disqualified states surface reason text.

## Tasks / Subtasks
- [ ] Implement status query endpoint for submission timeline.
- [ ] Build timeline UI component on submission details page.
- [ ] Map state machine values to clear labels and color states.
- [ ] Add empty/loading/error states.

## Dev Notes
- Track states: `queued`, `running`, `ai_scored`, `awaiting_human_review`, `finalized`, `failed`, `disqualified`.
- Keep update interval conservative to avoid excess load.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Story 2.5]
