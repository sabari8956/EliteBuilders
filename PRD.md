---
workflowType: 'prd'
workflow: 'edit'
classification:
  domain: 'General'
  projectType: 'web_app'
  complexity: 'Low'
inputDocuments: []
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
lastEdited: '2026-03-01'
editHistory:
  - date: '2026-03-01'
    changes: 'Added User Journeys, UX/UI requirements, refactored FRs and NFRs'
---

# EliteBuilders MVP PRD

## 1. Product Summary

EliteBuilders is a web-based AI builders competition platform where solo builders submit real, product-ready AI MVPs against sponsor-authored challenges. The platform combines automated AI evaluation and human judging to rank talent and convert top performers into hiring opportunities.

This MVP includes all 5 major chunks:

1. Core platform (challenge and submission workflows)
2. In-browser builder IDE
3. AI evaluation engine (dynamic multi-agent orchestration)
4. Human evaluation
5. Leaderboards, badges, and notifications

Scoring policy for MVP:

- AI score weight: 80%
- Human score weight: 20%
- Human review scope: all submissions

Evaluation SLO target:

- Per submission completion target: <= 15 minutes (P95 target)

---

## 2. Problem Statement

Traditional coding challenge platforms evaluate algorithmic skill but do not capture applied-AI product ability (prompt design, UX, integration, reliability, business framing). Hiring teams need stronger evidence that candidates can ship complete AI products. Builders need credible, visible proof of practical capability.

---

## 3. Objectives and Success Criteria

### Objectives

1. Enable sponsors to publish AI product challenges with structured rubrics and deadlines.
2. Enable builders to submit complete MVP artifacts (repo/snapshot, deck, demo video).
3. Produce reliable, structured automated evaluations at scale with human finalization.
4. Surface ranked talent through challenge leaderboards and season-level career scoring.
5. Generate sponsor-ready candidate packets for recruiting workflows.

### MVP Success Criteria

1. End-to-end flow works for sponsor -> builder -> evaluator lifecycle.
2. 100% of submissions receive AI evaluation and human review.
3. P95 evaluation completion time <= 15 minutes for supported stacks.
4. Leaderboards transition from provisional to final without manual DB intervention.
5. No sensitive secret leakage in builder-visible logs/prompts.

### Hackathon Expectations (Pragmatic)

1. Primary goal is a working end-to-end demo, not production hardening.
2. Prefer simple, direct implementations over perfect architecture.
3. Manual operational steps are acceptable if they unblock demo flow.
4. Handle common happy paths first; edge cases can be documented and deferred.
5. Success at hackathon stage means judges can complete one full sponsor->builder->evaluation->leaderboard journey reliably.

---

## 4. Users and Roles

1. Builder
2. Sponsor
3. Evaluator
4. Admin

### Role Capabilities (MVP)

- Builder: browse challenges, use IDE, submit artifacts, view status/results/logs, receive badges.
- Sponsor: create/manage challenges, upload datasets, view ranked submissions, export candidate packets.
- Evaluator: review all AI-scored submissions, assign human score, finalize reviews.
- Admin: moderation, configuration, scoring policy/version controls, operational overrides.

---

## 5. Scope

## In Scope (MVP)

1. Solo challenge catalog with filters and rubric visibility.
2. OAuth onboarding (GitHub + Google), portfolio/CV linking.
3. Submission pipeline with evaluation queue and phase-level status.
4. Daytona-backed in-browser IDE with workspace snapshot submit.
5. Dynamic LangGraph multi-agent evaluator with structured evidence output.
6. Human review workflow for all submissions.
7. Provisional and final leaderboards.
8. Badge issuance and notifications.
9. Sponsor dashboard with candidate packet download.

## Out of Scope (MVP)

1. Team-based submissions.
2. Live pair judging sessions.
3. Complex anti-plagiarism forensic engine beyond baseline checks.
4. Marketplace billing/subscription monetization features.
5. Native mobile apps.

---

## User Journeys

### Builder Journey
1. Builder logs in using GitHub authentication.
2. Builder views the competition catalog and sees multiple active competitions.
3. Builder selects a competition matching their proficiency.
4. Builder reads the sponsor's problem statement and objective.
5. Builder enters build mode, launching a Lovable-like UI.
6. Builder completes the project in the workspace and submits.
7. System kicks off the AI evaluator asynchronously.
8. Evaluator completes AI evaluation and system routes submission to an evaluator.
9. Evaluator completes human evaluation.
10. Builder is assigned a final computed score and positioned on the leaderboard.

### Sponsor Journey
1. Sponsor creates a challenge with a rubric and problem statement.
2. Sponsor views submissions and leaderboards once builders complete submissions.

### Evaluator Journey
1. Evaluator receives AI-evaluated submissions.
2. Evaluator reviews the generated report and assigns a human score.

---

## UX/UI & Responsive Design Requirements

- Builders can operate the IDE in a browser interface that mimics a Lovable-like UI.
- The platform functions effectively across common desktop browser viewport dimensions.
- Mobile viewports are intentionally unsupported for the build/IDE mode, but viewable for challenge catalog and leaderboards.

---

## 6. High-Level Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Core App    │────▶│  Eval Pipeline   │────▶│  Daytona    │
│  (Next.js)   │     │  (LangGraph +    │     │  Cloud      │
│              │     │   LangSmith)     │     │             │
└──────┬───────┘     └────────┬─────────┘     └─────────────┘
       │                      │
       ▼                      ▼
┌─────────────┐     ┌──────────────────┐
│  Supabase   │     │  Azure OpenAI    │
│  (DB+Auth)  │     │  GPT-5.2 /       │
│             │     │  DeepSeek 3.2    │
└─────────────┘     └──────────────────┘
```

### Core Components

1. Next.js App Router app for all user interfaces and APIs.
2. Supabase for Auth, Postgres, Storage, and queue tables.
3. Daytona Cloud for isolated builder/eval workspaces.
4. LangGraph worker for orchestrated specialized AI agents.
5. LangSmith for traces and evaluator observability.
6. Azure OpenAI + DeepSeek for model execution.

---

## 7. Functional Requirements

### 7.1 Challenge Catalog and Management
1. Sponsors can specify a brief markdown, rubric JSON, dataset assets, deadline, and prize metadata when creating a challenge. (Traces to: Sponsor Journey)
2. Sponsors can create, edit, publish, and archive challenges. (Traces to: Sponsor Journey)
3. Builders can filter active challenges by status, sponsor, category, deadline, and prize range. (Traces to: Builder Journey)

### 7.2 Onboarding and Identity
1. Builders can authenticate using third party identity providers natively. (Traces to: Builder Journey)
2. Builders can provide a GitHub profile, portfolio URL, and CV upload during onboarding. (Traces to: Builder Journey)
3. Admins can enforce role-based access controls for builder, sponsor, evaluator, and admin actions. (Traces to: General Access)

### 7.3 In-Browser IDE
1. Builders can launch into a pre-seeded builder workspace directly from a selected challenge. (Traces to: Builder Journey)
2. Builders can write code via an embedded browser IDE interface. (Traces to: Builder Journey)
3. Builders can freeze their workspace and submit a snapshot alongside their submission record to enter the evaluation queue. (Traces to: Builder Journey)

### 7.4 Submission Pipeline
1. Builders can view real-time phase-level status and timestamps of their submission pipeline. (Traces to: Builder Journey)
2. System can process submission state transitions from draft through finalized or failed. (Traces to: AI Eval process)
3. Evaluators can transition submissions needing rework back to the builder with notes. (Traces to: Evaluator Journey)
4. Admins can manually disqualify any non-final submission state. (Traces to: General Access)

### 7.5 AI Evaluation
1. System can execute a submitted snapshot within an isolated evaluation environment. (Traces to: AI Eval process)
2. System uses a lean graph-orchestrated multi-agent flow with specialized node goals (Intake/Validation, Sandbox/Clone, Analysis/Planning, Unit Test Execution, Runtime Execution, Scoring/Report, Cleanup). (Traces to: AI Eval process)
3. System can persist specialist outputs as structured evaluation evidence. (Traces to: AI Eval process)
4. System can detect missing unit tests and generate project-specific tests in sandbox before execution. (Traces to: AI Eval process)
5. System can run browser E2E and API checks based on inferred runtime path. (Traces to: AI Eval process)
6. System can record runtime validation artifacts (Playwright trace/video/screenshots and Daytona recording metadata) and include them in evaluator reports. (Traces to: AI Eval process)
7. System can compute an AI score mapped against the challenge rubric. (Traces to: AI Eval process)
8. System can generate a full redacted report with logs, prompts, and runtime artifacts. (Traces to: AI Eval process)

### 7.6 Human Evaluation
1. Evaluators can view an AI-generated report, rubric breakdown, and raw artifacts for any given submission. (Traces to: Evaluator Journey)
2. Evaluators can assign a human score and input written notes into the submission record. (Traces to: Evaluator Journey)
3. System can compute a final score composed of weighted AI and human scores. (Traces to: AI Eval process)

### 7.7 Leaderboards and Career Score
1. Users can view a provisional leaderboard populated natively after AI scoring. (Traces to: Builder/Sponsor Journey)
2. Users can view a final leaderboard published automatically post-human review. (Traces to: Builder/Sponsor Journey)
3. System can update season-level career scores on builder profiles upon finalized submissions. (Traces to: Builder Journey)

### 7.8 Badges and Notifications
1. System can automatically issue badges corresponding to submission outcomes (Top 10%, Category Winner, Sponsor Favorite). (Traces to: Builder Journey)
2. Users can receive notifications via email and in-app channels. (Traces to: General Updates)
3. System can trigger notifications upon key state changes (queued, human review completed, leaderboard rank shift, badge unlocked). (Traces to: Builder Journey)

---

## 8. Multi-Agent Evaluation Specification (Course Correction 2026-03-02)

This section supersedes the earlier fine-grained specialist model with a lean, implementation-first graph aligned to the approved workflow diagram.

## 8.1 Agent Roles (Grouped)

1. `IntakeValidationAgent`
   - Intake + payload validation + repo/rubric pre-checks.
2. `SandboxSetupAgent`
   - Daytona sandbox create + repo clone + commit lock.
3. `AnalysisPlanningAgent` (LLM-first)
   - Deep codebase understanding, project type classification, runtime path decision, and execution plan synthesis.
4. `UnitTestExecutionAgent`
   - Test gap analysis, test generation (if missing), unit test execution, test quality evaluation.
5. `RuntimeExecutionAgent`
   - Runtime branch execution (`frontend/fullstack-ui`, `backend/api`, or `both`), Playwright E2E, API checks, and recording artifact collection.
6. `ScoringReportingAgent`
   - Rubric scoring from validated evidence + evaluator/builder report generation.
7. `CleanupAgent`
   - Always-run sandbox cleanup and final run closure.

## 8.2 Graph Flow

1. `IntakeValidationAgent`
2. `SandboxSetupAgent`
3. `AnalysisPlanningAgent`
4. `UnitTestExecutionAgent`
5. `RuntimeExecutionAgent`
6. `ScoringReportingAgent`
7. `CleanupAgent` (always)

Error rule: any node failure routes directly to `CleanupAgent` before terminal response.

## 8.3 Agent Output Contract

Every node returns:

- `status`: `success | failed | skipped`
- `summary`: short human-readable outcome
- `evidence_refs`: artifact pointers (logs, files, traces, videos)
- `metrics`: node-specific metrics (duration, pass/fail counts, coverage/confidence)
- `next_hint`: optional routing guidance for downstream node

## 8.4 Mandatory Behaviors

1. LLM-first analysis is required for project understanding and runtime planning.
2. If the project lacks adequate tests, the system must generate missing unit tests in sandbox and run them.
3. Runtime validation must choose path based on inferred app shape:
   - `frontend/fullstack-ui` -> Playwright E2E (+ API checks)
   - `backend/api` -> API checks
   - `both` -> Playwright E2E + API checks
4. Runtime execution must capture artifacts:
   - Playwright trace/video/screenshots
   - Daytona recording metadata when recording is enabled for runtime phases
5. Score must be based on evidence-backed rubric mapping only.

## 8.5 Time Budget

- Total hard cap: 15 minutes per submission
- Default allocation:
  - intake + setup: 2 min
  - analysis/planning: 2 min
  - unit tests (including generated tests): 4 min
  - runtime execution (E2E/API): 5 min
  - scoring/reporting: 2 min
- Orchestrator may reallocate while honoring total hard cap.

## 8.6 Failure Policy

1. Failures in analysis/runtime/testing do not skip cleanup.
2. Partial evidence is preserved and surfaced with blocker codes.
3. Scoring can return partial with explicit confidence penalties when critical runtime checks fail.
4. Retry policy remains bounded and deterministic (default max attempts: 3).

---

## 9. Data Model (Postgres)

## Core Tables

1. `users`
2. `challenges`
3. `challenge_assets`
4. `submissions`
5. `eval_jobs`
6. `evaluation_runs`
7. `evaluation_phase_results`
8. `scores`
9. `human_reviews`
10. `leaderboard_entries`
11. `badges`
12. `notifications`

## Key Fields

- Role enum on users.
- Rubric JSON and dataset manifest on challenges.
- Submission source type (`repo|snapshot`).
- Queue leasing fields (`lease_until`, `attempts`, `max_attempts`).
- Score versioning (`scoring_version`) for reproducibility.
- Artifact/log references in phase results.
- Generated test artifact references and patch metadata.
- Playwright runtime artifacts (`trace`, `video`, `screenshots`) and Daytona recording metadata.

---

## 10. API Requirements

## Challenge APIs

1. `POST /api/challenges`
2. `GET /api/challenges`
3. `GET /api/challenges/:id`
4. `PATCH /api/challenges/:id`

## Submission APIs

1. `POST /api/submissions`
2. `POST /api/submissions/:id/queue`
3. `GET /api/submissions/:id/status`
4. `GET /api/submissions/:id/report`

## Review and Leaderboard APIs

1. `POST /api/reviews/:submissionId`
2. `GET /api/leaderboard/:challengeId`

## Daytona APIs

1. `POST /api/daytona/workspaces`
2. `POST /api/daytona/workspaces/:id/submit`

---

## 11. Queue and Worker Requirements

1. Queue backend: Supabase Postgres queue table (no Redis in MVP).
2. Worker claims jobs using `FOR UPDATE SKIP LOCKED`.
3. Heartbeat refresh every 30 seconds while running.
4. Lease expiry causes automatic requeue.
5. Max attempts default: 3.
6. Worker writes phase-level progress and final artifacts.

---

## 12. Security and Compliance Requirements

1. Isolated workspace per evaluation run.
2. Ephemeral credentials only; no plain secret persistence.
3. Mandatory secret redaction before storing builder-visible logs/prompts.
4. File scanning and MIME/type validation for uploads.
5. Submission and retry rate limiting by user/challenge.
6. Hidden holdout checks rotated to reduce exploitability despite full report visibility.

---

## 13. Non-Functional Requirements

1. **Evaluation Performance:** The system shall complete automated AI evaluations in under 15 minutes for the 95th percentile of submissions, as measured by internal execution telemetry, to ensure rapid builder feedback.
2. **API Performance:** The system shall respond to report/status retrieval requests in under 2 seconds for completed runs, as measured by server APM monitoring, to deliver a snappy user experience.
3. **Reliability:** The system shall guarantee zero data loss of queue events during worker crashes, as measured by database transaction integrity logs, to ensure builder submissions are never silently dropped.
4. **Observability:** The system shall attach a unique execution trace ID to 100% of pipeline runs and structured logs to every phase transition, as measured by log aggregation queries, to enable deterministic evaluator auditing.

---

## 14. Testing Strategy and Acceptance

## Unit Tests

1. Rubric schema and score math.
2. Queue leasing/retry logic.
3. Badge eligibility logic.
4. Prompt/log redaction functions.

## Integration Tests

1. Submission lifecycle transitions end-to-end.
2. Daytona workspace create/freeze/restore.
3. AnalysisPlanningAgent output contract and evidence persistence.
4. Generated unit test execution path when project coverage is sparse.
5. Runtime path branch selection (`ui`, `api`, `both`) and artifact persistence.

## E2E Tests

1. Sponsor creates and publishes challenge.
2. Builder signs in, submits, and tracks status.
3. Evaluator reviews and finalizes score.
4. Leaderboard updates provisional -> final.
5. Badge award notification is delivered.

---

## 15. Rollout Plan

1. Foundation
   - project structure, env setup, Supabase bootstrap, migrations
2. Chunk 1
   - core CRUD and dashboards
3. Queue + worker skeleton
   - leasing, retries, lifecycle statusing
4. Daytona integration
   - builder and eval workspaces
5. Multi-agent evaluator
   - planner + specialists + scoring + reports
6. Human review module
   - mandatory all-submission workflow
7. Leaderboard + badges + notifications
8. Hardening
   - security, load checks, runbooks

---

## 16. Risks and Mitigations

1. Any-codebase support may be unreliable.
   - Mitigation: adapter tiers + generic runner + partial scoring path.
2. Full log/prompt transparency may invite gaming.
   - Mitigation: hidden holdout tests + rotating checks + strict redaction.
3. All-submission human review increases ops load.
   - Mitigation: reviewer tooling, SLA dashboards, batching.
4. 15-minute SLO pressure under spikes.
   - Mitigation: priority queues, concurrency caps, autoscaled workers.

---

## 17. Assumptions and Defaults

1. Greenfield implementation from current minimal Next.js starter.
2. Multiple submissions per challenge are allowed.
3. Latest finalized submission is leaderboard-eligible by default.
4. All timestamps stored in UTC and rendered in local timezone.
5. One retry token for boot-related partial failures.
6. Human review mandatory for final rank publication.
7. Builder-visible report includes logs/prompts after redaction.
8. Queue stack remains Supabase Postgres in MVP.
