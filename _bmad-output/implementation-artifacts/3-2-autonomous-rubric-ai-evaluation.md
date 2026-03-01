# Story 3.2: Autonomous rubric-driven AI evaluation

Status: done

## Story
As the AI evaluator,
I want rubric-based autonomous evaluation,
so that each submission gets consistent machine scoring.

## Acceptance Criteria
1. Worker loads rubric and submission context.
2. Specialist evaluation steps run and produce structured evidence.
3. AI score is persisted on submission.

## Tasks / Subtasks
- [x] Implement rubric-to-evaluation-plan mapping
- [x] Run specialist evaluators and aggregate evidence
- [x] Persist AI score and evidence link

## References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md#Epic 3]

## Dev Agent Record
- Added rubric-to-plan mapping in `src/features/evaluation/evaluator.ts` with deterministic criterion ordering and specialist assignment.
- Implemented autonomous specialist evaluation steps producing structured evidence entries (`criterion_id`, weighted score, findings, sensitive context).
- Aggregated weighted AI score and persisted `ai_score` + `ai_evidence_id` during worker execution.
- Added isolated runtime adapter in `src/features/evaluation/runtime.ts` with hardcoded Daytona-only execution using Daytona SDK sandbox lifecycle (`create -> codeRun -> delete`).
- Data persistence is isolated to file-backed Epic 3 store (`.data/demo-db.json`) for standalone implementation mode.
- Added test coverage for Daytona runtime and worker retry/success behavior with mocked Daytona SDK.

## File List
- src/features/evaluation/evaluator.ts
- src/features/evaluation/runtime.ts
- src/features/evaluation/worker.ts
- src/features/evaluation/types.ts
- src/features/evaluation/store.ts
- src/features/evaluation/__tests__/runtime.test.ts
- src/features/evaluation/__tests__/worker.test.ts

## Course Correction (2026-03-02)
- Scope shifted from fine-grained specialist chain to grouped agents.
- This story now maps into:
  - `Story 3.2` IntakeValidation + SandboxSetup agents
  - `Story 3.3` AnalysisPlanning agent (LLM-first)
- LLM-first project/runtime planning is now mandatory, and non-LLM fallback is out of scope.
