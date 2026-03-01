# Sprint Change Proposal - Course Correction (2026-03-02)

## 1. Issue Summary
Epic 3 implementation drifted toward either overly granular multi-agent decomposition or underpowered single-agent logic. The approved direction is a lean graph-orchestrated model with grouped specialist agents aligned to the runtime flow diagram.

## 2. Impact Analysis
- Epic impact: Epic 3 scope and sequencing updated.
- Story impact: old Story 3.2/3.3 responsibilities are redistributed into grouped agent stories.
- Architecture impact: orchestrator remains graph-based, but node granularity is reduced.
- Runtime impact: unit-test generation and Playwright/Daytona artifact recording are now mandatory behaviors.

## 3. Approved Course-Corrected Architecture
Grouped agent flow:
1. `IntakeValidationAgent`
2. `SandboxSetupAgent`
3. `AnalysisPlanningAgent` (LLM-first)
4. `UnitTestExecutionAgent` (includes test gap analysis + generation)
5. `RuntimeExecutionAgent` (Playwright + API checks + recording artifacts)
6. `ScoringReportingAgent`
7. `CleanupAgent` (always)

Routing requirements:
- Project type: `frontend|backend|fullstack|unknown`
- Runtime path: `frontend/fullstack-ui | backend/api | both`

## 4. Detailed Change Proposals
### Old -> New Story Mapping
- Old `3.2` Autonomous rubric-driven AI evaluation
  - New `3.2` IntakeValidation + SandboxSetup
  - New `3.3` AnalysisPlanning (LLM-first)
- Old `3.3` Evidence report + redaction
  - New `3.6` ScoringReporting (includes redaction + runtime artifacts)
- New additions:
  - `3.4` UnitTestExecution with generated tests when missing
  - `3.5` RuntimeExecution with Playwright/API branches and recording artifacts

### Mandatory Behavioral Additions
1. LLM-first project understanding (no non-LLM fallback in analysis/planning).
2. Auto-generated unit tests when project test coverage is missing.
3. Playwright artifacts + Daytona recording metadata persisted for runtime evaluation.

## 5. Implementation Handoff
Scope classification: **Moderate**

Required implementation order:
1. Graph state + grouped agent contracts.
2. AnalysisPlanning agent output schema and runtime path decision.
3. UnitTestExecution with generated test workflow.
4. RuntimeExecution with E2E/API checks + recording.
5. ScoringReporting + redaction + existing human finalization/leaderboard handoff.

Success criteria:
1. End-to-end run follows grouped flow with deterministic step contracts.
2. Cleanup runs on all success/failure branches.
3. Reports include runtime artifacts and evidence-linked scoring.
