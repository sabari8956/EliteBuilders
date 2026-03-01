# Story 2.2: Lovable-like build workspace launch

Status: ready-for-dev

## Story
As a builder,
I want a Lovable-like in-browser building experience launched from a challenge,
so that I can build and iterate quickly without local setup.

## Acceptance Criteria
1. Builder can click "Start Building" from a challenge and open a provisioned workspace session.
2. Workspace shows core Lovable-like UX shell: left file tree, center editor/preview area, top run/submit actions.
3. Challenge context (problem statement + rubric summary) is visible in the workspace panel.
4. Workspace session state is linked to builder and challenge for later snapshot submission.

## Tasks / Subtasks
- [ ] Implement challenge -> workspace launch action and session record (AC: 1,4)
- [ ] Build minimal Lovable-like UI shell for builder mode (AC: 2)
- [ ] Inject challenge context panel in workspace screen (AC: 3)
- [ ] Wire run/submit actions to existing submission flow hooks (AC: 2,4)

## Dev Notes
- Keep desktop-first; no mobile IDE work for hackathon.
- Use one happy path workspace provider/runtime.
- Prefer functional UX over polished styling; preserve predictable interactions for demo.

### Project Structure Notes
- Add feature under `src/features/workspace/*`.
- Route suggestion: `src/app/challenges/[id]/build/page.tsx`.
- Keep API contracts in `{data,error}` envelope.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/PRD.md#User Journeys]
- [Source: /Users/sabari/Work/projects/100x-hackathon/PRD.md#UX/UI & Responsive Design Requirements]
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/hackathon-priority-plan.md#Explicit Cuts You Should Make Now]
