---
sourceDocuments:
  - /Users/sabari/Work/projects/100x-hackathon/PRD.md
  - /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/architecture.md
  - /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/epics-and-stories.md
mode: hackathon-prioritization
createdAt: "2026-03-01"
---

# Hackathon Priority Plan (EliteBuilders MVP)

## Goal
Ship one reliable end-to-end demo path:
Sponsor creates challenge -> Builder submits from browser workspace -> AI evaluation runs -> Evaluator finalizes -> Final leaderboard updates.

## Prioritization Rules
1. Keep only features required for the golden path demo.
2. Prefer manual operation over building internal tooling.
3. Defer broad automation, deep hardening, and non-critical UX polish.
4. Keep strict submission state machine and score integrity.

## P0 (Build Now)

### Epic 1 (trimmed): Foundation, Auth, Challenge Publish
- Story 1.1 Baseline app + env contract
- Story 1.2 OAuth login (GitHub only for hackathon)
- Story 1.3 RBAC (minimal role guard on API routes)
- Story 1.4 Challenge create + publish (archive/edit can be basic)

### Epic 2 (trimmed): Submission Golden Path
- Story 2.1 Challenge catalog (minimal filters: status + deadline)
- Story 2.2 Launch workspace from challenge
- Story 2.3 Snapshot-based submission
- Story 2.4 Submission status timeline (queued/running/ai_scored/awaiting_human/finalized)

### Epic 3 (trimmed): AI Evaluation Core
- Story 3.1 Queue worker + state machine
- Story 3.2 IntakeValidation + SandboxSetup grouped agents
- Story 3.3 AnalysisPlanning agent (LLM-first) for project/runtime inference
- Story 3.4 UnitTestExecution agent with gap analysis + test generation
- Story 3.5 RuntimeExecution agent (Playwright + API checks + recording artifacts)
- Story 3.6 ScoringReporting agent with redaction and handoff to review

### Epic 4 (trimmed): Human Finalization
- Story 4.1 Evaluator review screen
- Story 4.2 80/20 weighted final score + finalize transition
- Story 4.3 Rework/disqualify: keep as admin API action first, UI optional

### Epic 5 (trimmed): Competition Outcomes
- Story 5.1 Provisional + final leaderboard
- Story 5.3 Sponsor view with top submissions (packet export can be simple JSON/CSV)

### Epic 6 (trimmed): Demo Reliability
- Story 6.1 Seed script for sponsor/builder/evaluator users + sample challenge
- Story 6.2 Golden path runbook
- Story 6.3 Telemetry for evaluation duration + failures (minimal dashboard/query)

## P1 (If Time Allows)
1. Google OAuth support.
2. Additional catalog filters (sponsor/category/prize).
3. In-app notifications (email optional).
4. Badge issuance automation.
5. Resubmission UX workflow.
6. Career score updates.

## P2 (Skip for Hackathon)
1. Advanced anti-plagiarism and forensic checks.
2. Full notification orchestration across all events.
3. Rich sponsor packet export formatting.
4. Production-grade incident automation.
5. Complex multi-model or fallback orchestration framework.

## Must-Have Data Model (Minimum)
1. users (id, role, profile fields)
2. challenges (state, rubric, deadline, sponsor_id)
3. submissions (challenge_id, builder_id, snapshot_ref, state, ai_score, human_score, final_score)
4. eval_jobs (submission_id, lease, attempt, status, error)
5. evaluation_reports (submission_id, evidence_json, redacted_report)
6. leaderboard_entries (challenge_id, submission_id, provisional_rank, final_rank)

## Minimal State Machine (Do Not Skip)
1. draft
2. submitted
3. queued
4. running
5. ai_scored
6. awaiting_human_review
7. finalized
8. failed
9. disqualified

## 3-Sprint Hackathon Plan

### Sprint A (Day 1)
1. P0 foundation/auth/challenges
2. Basic submission create + queue write
3. Seed data and role test accounts

### Sprint B (Day 2)
1. Worker leasing + grouped setup/analysis agent execution
2. LLM-based planning + unit test generation and run
3. Submission status UI

### Sprint C (Day 3)
1. RuntimeExecution agent with Playwright/API branches and artifacts
2. Human review UI + final scoring + leaderboard provisional/final publication
3. Demo runbook, smoke test, fallback manual ops

## Explicit Cuts You Should Make Now
1. Drop mobile IDE support work entirely.
2. Use one happy-path evaluator flow; document unsupported stacks.
3. Skip polished sponsor dashboard analytics.
4. Make candidate packet export raw and functional (not pretty).
5. Keep notifications in-app only or console-log backed.
6. Defer badge/career systems unless golden path is stable early.

## Definition of Done for Hackathon
1. Judge can execute a full sponsor->builder->eval->review->leaderboard journey without DB edits.
2. At least one seeded challenge and one seeded builder submission complete successfully.
3. Final score uses 80/20 weighting and is visible in leaderboard.
4. Evaluation runtime metrics can show whether run stayed within target envelope.
