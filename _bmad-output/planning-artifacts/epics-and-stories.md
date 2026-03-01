---
stepsCompleted: ["draft-v3-detailed-three-pipelines"]
inputDocuments:
  - /Users/sabari/Work/projects/100x-hackathon/PRD.md
  - /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/architecture.md
createdAt: "2026-03-01"
---

# 100x-hackathon - Detailed Epics and Stories (3 Independent Pipelines)

## Delivery Model

Three independent pipelines run in parallel with minimal coupling:
1. **Pipeline A / Epic 1**: Core application CRUD platform
2. **Pipeline B / Epic 2**: Lovable-like builder flow
3. **Pipeline C / Epic 3**: Autonomous AI evaluator + human finalization

## Global Contracts (Non-Negotiable)

1. API envelope: `{ "data": ..., "error": null }` and `{ "data": null, "error": { ... } }`
2. Submission lifecycle: `draft -> submitted -> queued -> running -> ai_scored -> awaiting_human_review -> finalized` (+ `failed`, `disqualified`)
3. Scoring policy: `final_score = 0.8 * ai_score + 0.2 * human_score`
4. Report safety: redaction before builder visibility
5. Hackathon scope: optimize for one reliable golden path

## Epic 1: Core Application Platform (CRUD + Roles + Challenge Lifecycle)

### Goal
Provide the secure CRUD backbone all other pipelines depend on.

### Done Definition
1. Core entities and APIs exist with stable contracts.
2. Auth + RBAC guards are enforced in key protected endpoints.
3. Sponsor can publish challenges; builder can read catalog.

### Story 1.1: Baseline platform and environment contract

As an engineer,
I want a stable app + env contract,
So that all core services start reliably in demo environments.

Acceptance Criteria:
1. Local app starts with documented setup command sequence.
2. `.env.example` includes app, worker, Supabase, Daytona, and model keys.
3. `/api/health` returns success envelope.

Implementation Tasks:
1. Add `.env.example` with required variables.
2. Add `/api/health` route.
3. Update `README.md` run instructions.

Estimate: 2-3 hours
Dependencies: none

### Story 1.2: Authentication and profile onboarding

As a builder,
I want to sign in via GitHub OAuth and complete profile details,
So that I can participate in challenges.

Acceptance Criteria:
1. GitHub OAuth sign-in creates or links account.
2. Profile fields persist: GitHub URL, portfolio URL, CV metadata (optional).
3. Auth session is enforced for protected routes.

Implementation Tasks:
1. Configure Supabase Auth GitHub provider.
2. Build onboarding form and persistence.
3. Apply auth middleware for private pages.

Estimate: 4-6 hours
Dependencies: 1.1

### Story 1.3: Role-based access control

As an admin,
I want strict role authorization,
So that users can only perform permitted actions.

Acceptance Criteria:
1. Role enum: `builder|sponsor|evaluator|admin`.
2. Challenge create route requires sponsor/admin.
3. Evaluator review route requires evaluator/admin.

Implementation Tasks:
1. Define role source of truth.
2. Create shared authorization helper.
3. Apply guards to protected endpoints.

Estimate: 3-4 hours
Dependencies: 1.2

### Story 1.4: Challenge CRUD + publish lifecycle

As a sponsor,
I want challenge CRUD and publish workflow,
So that builders can discover active competitions.

Acceptance Criteria:
1. Create challenge with brief, rubric JSON, deadline.
2. Publish transition from draft to published.
3. Challenge list endpoint returns published challenges.

Implementation Tasks:
1. Define challenge schema and validations.
2. Implement create/update/publish endpoints.
3. Add sponsor challenge UI form.

Estimate: 5-7 hours
Dependencies: 1.3

### Story 1.5: Core catalog and submission contracts

As the platform,
I want stable challenge and submission APIs,
So that builder and evaluator pipelines integrate cleanly.

Acceptance Criteria:
1. Catalog API supports minimal query/filter.
2. Submission create/read endpoints return deterministic IDs and timestamps.
3. Contracts are documented for downstream pipelines.

Implementation Tasks:
1. Implement `/api/challenges` read endpoints.
2. Implement `/api/submissions` create/read endpoints.
3. Add API contract notes in docs.

Estimate: 4-5 hours
Dependencies: 1.4

## Epic 2: Builder Pipeline (Lovable-like Build Experience)

### Goal
Provide fast in-browser build UX and deterministic submission handoff.

### Done Definition
1. Builder can enter build mode from challenge.
2. Lovable-like workspace shell is usable on desktop.
3. Snapshot submission reaches evaluator queue.

### Story 2.1: Challenge-to-build entry

As a builder,
I want to start build mode from challenge details,
So that I can begin in one click.

Acceptance Criteria:
1. Challenge page shows `Start Building` CTA.
2. CTA creates or resumes workspace session.
3. Builder is routed to `/challenges/[id]/build`.

Implementation Tasks:
1. Add CTA and route wiring.
2. Add create/resume workspace session API.
3. Persist challenge-to-session mapping.

Estimate: 3-4 hours
Dependencies: 1.5

### Story 2.2: Lovable-like workspace shell

As a builder,
I want an in-browser Lovable-like workspace,
So that I can code and preview quickly.

Acceptance Criteria:
1. Workspace has file tree, editor/preview panel, run and submit actions.
2. Challenge context panel is visible in workspace.
3. Desktop-first layout works on common laptop resolutions.

Implementation Tasks:
1. Build workspace page shell and layout.
2. Add challenge context side panel.
3. Wire top action bar events.

Estimate: 6-8 hours
Dependencies: 2.1

### Story 2.3: Workspace session persistence

As a builder,
I want workspace session state saved,
So that I can resume work after refresh or reconnect.

Acceptance Criteria:
1. Session persists by `builder_id + challenge_id`.
2. Resume behavior restores latest active session.
3. Session metadata includes last activity timestamp.

Implementation Tasks:
1. Add workspace_sessions schema.
2. Save/retrieve active session on page load.
3. Add session heartbeat/update logic.

Estimate: 4-5 hours
Dependencies: 2.1

### Story 2.4: Snapshot submission handoff

As a builder,
I want to submit snapshot artifacts,
So that evaluator pipeline can process deterministic input.

Acceptance Criteria:
1. Submit action creates submission with `snapshot_ref`.
2. Eval job entry is created atomically.
3. Submission state becomes `queued`.

Implementation Tasks:
1. Implement submit API transaction.
2. Persist submission + eval job records.
3. Return immediate submission status payload.

Estimate: 4-6 hours
Dependencies: 2.2, 2.3, 1.5

### Story 2.5: Builder status timeline

As a builder,
I want real-time phase tracking,
So that I know progress and outcomes.

Acceptance Criteria:
1. Timeline displays each state with timestamps.
2. Polling endpoint returns latest state and message.
3. Fail/rework states show actionable reason.

Implementation Tasks:
1. Build submission status endpoint.
2. Build status timeline component.
3. Map machine states to human-readable labels.

Estimate: 3-5 hours
Dependencies: 2.4, 3.1

## Epic 3: Evaluation Pipeline (Autonomous AI + Human Finalization)

### Goal
Execute autonomous AI evaluation through a lean graph-orchestrated specialist flow, then human finalization and ranking publication.

### Done Definition
1. Worker processes queued submissions reliably.
2. AI pipeline runs through grouped specialist agents with deterministic evidence contracts.
3. Human review finalizes score and leaderboard updates.

### Story 3.1: Queue worker and deterministic state machine

As the evaluator platform,
I want leased queue processing,
So that submissions are processed reliably with retries.

Acceptance Criteria:
1. Worker leases jobs using safe lock pattern.
2. State transitions follow approved lifecycle.
3. Errors and retry attempts are persisted.

Implementation Tasks:
1. Implement worker poll + lease loop.
2. Implement transition guard service.
3. Add retry policy and error persistence.

Estimate: 6-8 hours
Dependencies: 1.5, 2.4

### Story 3.2: IntakeValidation and SandboxSetup agents

As the evaluator platform,
I want grouped intake/setup agents,
so that each evaluation run has validated input and a reproducible sandboxed repo context.

Acceptance Criteria:
1. `IntakeValidationAgent` validates `repo_url`, `rubric_id`, and submission metadata.
2. `SandboxSetupAgent` creates Daytona sandbox and clones repo at deterministic commit SHA.
3. Setup artifacts/logs are persisted and linked to run state.

Implementation Tasks:
1. Build intake validation agent contract.
2. Build sandbox create/clone grouped agent.
3. Persist setup evidence and errors in run artifacts.

Estimate: 5-7 hours
Dependencies: 3.1

### Story 3.3: AnalysisPlanning agent (LLM-first)

As the evaluation system,
I want one LLM-first planning agent,
so that project type, runtime path, and execution plan are inferred from deep repo understanding.

Acceptance Criteria:
1. `AnalysisPlanningAgent` reads repository context and key files, then infers `project_type`.
2. Agent emits `runtime_path` (`frontend/fullstack-ui | backend/api | both`) and unit-test strategy.
3. LLM analysis includes evidence file references and confidence score.

Implementation Tasks:
1. Build deep context collector in sandbox.
2. Add LLM analysis schema and strict output validation.
3. Persist project-type/runtime-path planning artifact.

Estimate: 6-8 hours
Dependencies: 3.2

### Story 3.4: UnitTestExecution agent with test generation

As the evaluator platform,
I want tests to be created and executed when coverage is missing,
so that evaluation quality is not limited by missing test suites in candidate repos.

Acceptance Criteria:
1. Agent can detect test gaps from LLM analysis and existing test inventory.
2. Agent can synthesize and run missing unit tests in sandbox (ephemeral only).
3. Agent returns test quality assessment with evidence references.

Implementation Tasks:
1. Build test gap analysis contract.
2. Build generated test writer + execution runner.
3. Persist generated test artifacts and quality metrics.

Estimate: 8-10 hours
Dependencies: 3.3

### Story 3.5: RuntimeExecution agent (Playwright + API checks + recording)

As the evaluator platform,
I want runtime validation by path,
so that frontend, backend, and fullstack apps are tested appropriately with reproducible artifacts.

Acceptance Criteria:
1. For `frontend/fullstack-ui`, agent runs Playwright E2E in sandbox.
2. For `backend/api`, agent runs API checks (`curl/http`) in sandbox.
3. For `both`, agent executes E2E then API checks.
4. Runtime artifacts include Playwright trace/video/screenshots and Daytona recording metadata when recording is enabled.

Implementation Tasks:
1. Build runtime path branch execution.
2. Integrate Playwright and API check runners.
3. Persist runtime artifacts with step-level evidence links.

Estimate: 6-9 hours
Dependencies: 3.4

### Story 3.6: ScoringReporting agent and finalize handoff

As builder/evaluator/sponsor,
I want evidence-backed scoring and safe reports,
so that results are trustworthy, explainable, and ready for human finalization and leaderboard publication.

Acceptance Criteria:
1. `ScoringReportingAgent` computes rubric scores from validated evidence only.
2. Evaluator report includes full evidence and artifact references.
3. Builder report is redacted for secrets/sensitive internals.
4. Existing human-finalization and leaderboard flows consume these outputs without contract breakage.

Implementation Tasks:
1. Build rubric scoring from evidence graph.
2. Build evaluator/builder report generation and redaction.
3. Wire outputs into human review + leaderboard publication flow.

Estimate: 6-8 hours
Dependencies: 3.5

## Parallel Execution Plan (High Level)

1. Day 1: `1.1, 1.2, 1.4` in Pipeline A; `2.1, 2.2` in Pipeline B; `3.1` setup in Pipeline C.
2. Day 2: `1.5`, `2.3`, `2.4`, `3.2`, `3.3`, `3.4`.
3. Day 3: `2.5`, `3.5`, `3.6`, smoke tests and runbook.

## Explicit Scope Cuts (Hackathon)

1. Skip Google OAuth until after demo.
2. Skip advanced anti-plagiarism and deep observability tooling.
3. Keep sponsor exports simple (JSON/CSV acceptable).
4. Keep notifications minimal or defer.
5. Prioritize golden path reliability over UI polish.
