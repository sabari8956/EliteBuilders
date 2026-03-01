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

## 7.1 Challenge Catalog and Management

1. Sponsors can create/edit/publish/archive challenges.
2. Challenge includes:
   - brief markdown
   - rubric JSON
   - dataset assets
   - deadline
   - prize metadata
3. Builders can filter by status, sponsor, category, deadline, prize range.

## 7.2 Onboarding and Identity

1. OAuth with GitHub and Google via Supabase Auth.
2. Builder onboarding captures:
   - GitHub profile
   - portfolio URL
   - CV upload
3. Role-based access controls for builder/sponsor/evaluator/admin.

## 7.3 In-Browser IDE

1. Create/resume Daytona workspace for each builder-challenge pair.
2. Pre-seed workspace with challenge assets/boilerplate.
3. Browser IDE embed (VS Code server/OpenVSX compatible flow).
4. Submit from IDE:
   - freeze workspace
   - snapshot source state
   - create submission record
   - enqueue evaluation job

## 7.4 Submission Pipeline

1. Submission includes repo URL or workspace snapshot plus optional deck/video links.
2. Submission state machine:
   - `draft`
   - `submitted`
   - `queued`
   - `running`
   - `ai_scored`
   - `human_review`
   - `finalized`
   - `failed`
3. Builders can view phase-level status and timestamps.

## 7.5 AI Evaluation (Dynamic Multi-Agent)

1. Submission is executed in isolated Daytona eval workspace.
2. Planner agent dynamically composes specialist pipeline.
3. Specialist outputs are persisted as structured evidence.
4. AI score is computed against challenge rubric.
5. Full report is generated with logs/prompts/screenshots and safety redaction.

## 7.6 Human Evaluation

1. All submissions require evaluator review in MVP.
2. Evaluators receive AI report + rubric breakdown + artifacts.
3. Evaluator assigns human score and notes.
4. Final score formula:
   - `final_score = 0.8 * ai_score + 0.2 * human_score`

## 7.7 Leaderboards and Career Score

1. Provisional leaderboard published after AI score.
2. Final leaderboard published after human review.
3. Season-level career score updates on each finalized submission.

## 7.8 Badges and Notifications

1. Auto badge issuance:
   - Top-10%
   - Category Winner
   - Sponsor Favorite
2. Notification channels:
   - email
   - in-app
3. Trigger events:
   - submission queued/running/scored
   - human review completed
   - leaderboard rank change
   - badge awarded

---

## 8. Multi-Agent Evaluation Specification

## 8.1 Agent Roles

1. PlannerAgent
2. RepoProfilerAgent
3. BootAgent
4. FunctionalTestAgent
5. SecurityProbeAgent
6. CodeQualityAgent
7. RubricScoringAgent
8. ReportAgent

## 8.2 Planner Behavior

1. Reads challenge rubric and submission metadata.
2. Profiles repository stack and confidence level.
3. Produces execution DAG (ordered specialist tasks, budgets, fallback rules).
4. Persists plan artifact for auditability and replay.

## 8.3 Specialist Contract

Every specialist returns:

- `status`: `pass | partial | fail`
- `metrics`: numeric KPIs relevant to phase
- `evidence_refs`: links to artifacts/logs
- `score_deltas`: criterion-level impacts
- `retryable`: boolean
- `blockers`: machine-readable codes/messages

## 8.4 Evaluation Phases

1. Understand
   - file tree, docs, stack detection
2. Boot
   - install/start/health check
3. Functional Test
   - rubric-aligned Playwright scenario generation and execution
4. Security Probe
   - prompt-injection, fuzzing, XSS/path traversal checks
5. Code Quality
   - lint/style/structure heuristics
6. Score
   - rubric mapping and weighted AI score
7. Report
   - builder-facing and internal evaluator report variants

## 8.5 Time Budget

- Total hard cap: 15 minutes per submission
- Default allocation:
  - understand/profile: 1 min
  - boot/install: 4 min
  - functional: 5 min
  - security: 3 min
  - quality/scoring/report: 2 min
- Planner may reallocate within the hard cap.

## 8.6 Failure Policy

If app cannot be fully booted:

1. Assign partial score (infra/readiness penalties only where applicable).
2. Mark unresolved boot evidence with blocker codes.
3. Issue one retry window token (expires at earlier of challenge deadline or +6h).

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

1. Evaluation performance:
   - P95 <= 15 min for supported stacks
2. API performance:
   - report/status retrieval <= 2s for completed runs
3. Reliability:
   - queue recovery after worker crash without data loss
4. Observability:
   - LangSmith trace id linked to each run
   - structured logs for all phase transitions

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
3. Planner-specialist contract and evidence persistence.
4. Partial boot failure and retry token issuance.

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

