# Parallel Execution Board (3 Pipelines)

## Team Lanes

1. **Lane A (Core Platform Engineer)**: Epic 1
2. **Lane B (Builder UX Engineer)**: Epic 2
3. **Lane C (Evaluator/AI Engineer)**: Epic 3

## Week Plan (Hackathon)

### Day 1

Lane A:
1. `1-1-baseline-app-env-contract`
2. `1-2-github-oauth-onboarding`
3. `1-3-rbac-minimal-guards`

Lane B:
1. `2-1-challenge-to-build-entry`
2. `2-2-launch-workspace-from-challenge`

Lane C:
1. `3-1-worker-queue-state-machine`
2. Evaluator scaffolding for grouped-agent graph orchestration

Integration checkpoint:
1. Auth + role checks work.
2. Build route opens.
3. Queue worker can lease mock job.

### Day 2

Lane A:
1. `1-4-challenge-create-publish`
2. `1-5-core-catalog-submission-apis`

Lane B:
1. `2-3-workspace-session-persistence`
2. `2-4-snapshot-submission-entry`

Lane C:
1. `3-2` IntakeValidation + SandboxSetup agents
2. `3-3` AnalysisPlanning (LLM-first)
3. `3-4` UnitTestExecution (gap analysis + generated tests)

Integration checkpoint:
1. Builder submission creates queued job.
2. Worker processes submission through grouped setup/analysis/test stages.
3. Generated tests execute when baseline tests are missing.

### Day 3

Lane A:
1. API hardening and bug fixes from integration test

Lane B:
1. `2-5-submission-status-timeline`

Lane C:
1. `3-5` RuntimeExecution (Playwright + API checks + recording artifacts)
2. `3-6` ScoringReporting + redaction handoff
3. `3-4-human-review-final-score-80-20`
4. `3-5-provisional-final-leaderboard`

Integration checkpoint:
1. Full sponsor -> builder -> AI eval (grouped-agent flow) -> human review -> leaderboard run succeeds.
2. Final score policy 80/20 validated with test values.

## Critical Interfaces

1. **Core -> Builder**
- `GET /api/challenges`
- `POST /api/workspace-sessions`
- `POST /api/submissions`

2. **Builder -> Evaluator**
- Submission handoff payload: `submission_id`, `challenge_id`, `builder_id`, `snapshot_ref`, `submitted_at`

3. **Evaluator -> Core/Builder**
- Status update payload: `submission_id`, `state`, `message`, `updated_at`
- Finalization payload: `submission_id`, `ai_score`, `human_score`, `final_score`, `finalized_at`

## Daily Exit Criteria

1. No broken main flow from previous day.
2. Each lane merged behind stable API contract.
3. Demo seed scenario still runnable.
