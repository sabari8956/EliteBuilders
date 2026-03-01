---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - /Users/sabari/Work/projects/100x-hackathon/PRD.md
  - /Users/sabari/Work/projects/100x-hackathon/PRD-validation-report.md
workflowType: 'architecture'
project_name: '100x-hackathon'
user_name: 'Sabari'
date: '2026-03-01T21:11:43+0530'
lastStep: 8
status: 'complete'
completedAt: '2026-03-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines a complete competition lifecycle: sponsor challenge creation, builder IDE submission, asynchronous AI evaluation, mandatory human review, and final leaderboard publication. Architecturally, this centers on a clear golden path and reliable handoffs between UI/API, queue/worker orchestration, and scoring publication.

**Non-Functional Requirements:**
The primary architecture-driving NFR is evaluation latency (`P95 <= 15 min`), followed by queue recovery reliability, status/report responsiveness, and evaluation traceability. Security controls are practical for hackathon scope: isolated eval execution, upload validation, rate limiting, and redaction of builder-visible logs/prompts.

**Scale & Complexity:**
This is a medium-complexity hackathon MVP with broad scope but intentionally shallow hardening. Complexity comes from asynchronous workflow coordination, multi-role state transitions, and evaluator pipeline consistency.

- Primary domain: Full-stack web platform with async evaluation pipeline
- Complexity level: Medium
- Estimated architectural components: 8-10

### Technical Constraints & Dependencies

- Stack is intentionally fixed for speed: Next.js + Supabase + Daytona + LangGraph/LangSmith + model providers.
- Hackathon mode: prioritize functional completion over production-grade hardening.
- Mandatory human review remains part of final score publication flow.
- Submission model supports repo/snapshot with optional deck/video artifacts.
- Submission lifecycle includes explicit review/edge states (`awaiting_human_review`, `human_review_in_progress`, `needs_resubmission`, `disqualified`, `expired`) to avoid ambiguity.

### Cross-Cutting Concerns Identified

- Deterministic state transitions across UI/API/worker boundaries.
- Role-based access control for builder/sponsor/evaluator/admin actions.
- Evaluation evidence traceability for reviewer confidence and auditability.
- Consistent redaction/visibility policy for builder-facing reports.
- Provisional-to-final leaderboard consistency.

### Hackathon Delivery Lens

- Golden path first: ensure one sponsor->builder->AI eval->human review->final leaderboard journey works reliably.
- Demo acceptance checklist:
  - sponsor can publish a challenge
  - builder can submit and track status
  - AI evaluation completes and report is viewable
  - evaluator finalizes review
  - final leaderboard updates without manual DB edits
- Non-blocking enhancements are deferred by default.
- State transition clarity is prioritized over exhaustive edge-case automation.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application based on project requirements and current codebase direction.

### Starter Options Considered

1. **create-next-app (official)**
   - Most stable fit for current architecture direction.
   - Native support for TypeScript, App Router, ESLint, Tailwind, Turbopack defaults.
   - Lowest setup friction for hackathon delivery.

2. **create-t3-app**
   - Strong full-stack TypeScript baseline.
   - Adds opinionated stack choices that may increase decision surface for a time-constrained hackathon.

3. **Remix / create-react-router path**
   - Viable for web apps, but misaligned with current Next.js-first project trajectory and existing dependencies.

### Selected Starter: create-next-app

**Rationale for Selection:**
This is the fastest path to keep architecture and implementation aligned with your PRD and existing repo. It minimizes migration risk and preserves momentum for end-to-end demo delivery.

**Initialization Command (fresh repo only):**

```bash
npx create-next-app@latest elitebuilders --typescript --eslint --tailwind --app --use-npm
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript-first Next.js app on modern Node runtime.

**Styling Solution:**
Tailwind CSS baseline with straightforward utility-driven UI iteration.

**Build Tooling:**
Next.js build pipeline with App Router conventions and Turbopack-enabled development defaults.

**Testing Framework:**
No test runner is forced by default; testing stack can be added incrementally based on MVP priorities.

**Code Organization:**
App Router structure with route-segment conventions and clear server/client boundaries.

**Development Experience:**
Hot reload, type checking, linting baseline, and deployment-friendly project structure.

**Note:** This project is already initialized with Next.js. Continue implementation in the current repository; no re-init needed.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data platform: Supabase Postgres + Supabase Auth + Supabase Storage.
- Submission orchestration: Postgres queue with worker lease/retry semantics.
- Evaluation execution: Daytona isolated workspaces per submission run.
- API style: Next.js route handlers with REST JSON contracts.
- Scoring pipeline: AI-first score then mandatory human finalization.

**Important Decisions (Shape Architecture):**
- Validation: Zod schemas at API boundaries.
- Functional evaluation harness: Playwright-based scenario execution.
- Orchestration engine: lean graph-orchestrated grouped agents (LLM-first planning).
- App composition: feature-first modules over layer-first folders.

**Deferred Decisions (Post-MVP):**
- Multi-region deployment
- Deep anti-plagiarism forensics
- Billing/monetization

### Data Architecture

- Primary DB: Supabase Postgres.
- Schema authority: SQL migrations in-repo.
- Validation: Zod at request/response boundary.
- Cache strategy: start with DB + CDN/static cache only; no Redis in MVP.
- Queue model: `eval_jobs` table + `FOR UPDATE SKIP LOCKED`.

### Authentication & Security

- Auth: Supabase Auth (GitHub + Google OAuth).
- Authorization: role enum (`builder|sponsor|evaluator|admin`) enforced in route handlers.
- Secret handling: server-only env vars; no secrets persisted in builder-visible artifacts.
- Upload hardening: MIME/type validation + size limits + scanning hook.
- Report safety: mandatory redaction pass before builder visibility.

### API & Communication Patterns

- API style: REST via Next.js `/api/*` route handlers.
- Response shape:
  - success: `{ "data": ..., "error": null }`
  - failure: `{ "data": null, "error": { "code": "...", "message": "...", "details": ... } }`
- Date/time format: ISO-8601 UTC strings in API payloads.
- Async progression: poll `/api/submissions/:id/status` for phase transitions.
- Internal event naming: `submission.queued`, `submission.running`, `submission.ai_scored`, `submission.finalized`.

### Frontend Architecture

- Framework: Next.js App Router (existing project baseline).
- State strategy: server-first data fetching, local component state for UI; minimal global client state.
- Feature boundaries: challenge, submission, review, leaderboard, admin.
- UI system: Tailwind-first with reusable UI primitives.
- Performance: route-level loading states and skeletons; avoid heavy client bundles by default.

### Infrastructure & Deployment

- App hosting: Vercel (or equivalent) for fastest deployment path.
- Managed services: Supabase + Daytona Cloud + model providers.
- Worker runtime: separate worker process/container for evaluation queue consumers.
- Environments: `local`, `preview`, `prod` with `.env.example` as contract.
- Observability: structured logs + LangSmith trace ID per evaluation run.

### Version Verification Snapshot

- Next.js docs (create-next-app): current reference checked.
- `@supabase/supabase-js`: `2.98.0`
- `@langchain/langgraph`: `1.2.0`
- `@playwright/test`: `1.58.2`
- `zod`: `4.3.6`

### Decision Impact Analysis

**Implementation Sequence:**
1. Finalize DB schema + migrations
2. Implement auth + RBAC middleware
3. Build challenge/submission APIs
4. Add queue worker + phase status writes
5. Integrate Daytona eval execution
6. Add evaluator review and final scoring
7. Ship leaderboard/badges/notifications

**Cross-Component Dependencies:**
- Submission state machine drives API, worker, evaluator UI, and leaderboard projection.
- Redaction and evidence persistence affect both builder reports and evaluator review UX.

### Course Correction (2026-03-02): Lean 7-Agent Evaluation Graph

Course correction approved to reduce orchestration complexity while preserving specialist goals and strong evidence contracts.

**Grouped agent flow (in-order):**
1. `IntakeValidationAgent`
2. `SandboxSetupAgent`
3. `AnalysisPlanningAgent` (LLM-first)
4. `UnitTestExecutionAgent` (includes test generation when missing)
5. `RuntimeExecutionAgent` (Playwright + API checks, path-based)
6. `ScoringReportingAgent`
7. `CleanupAgent` (always)

**Required routing decisions:**
- `project_type`: `frontend|backend|fullstack|unknown`
- `runtime_path`: `frontend/fullstack-ui | backend/api | both`

**Mandatory evidence artifacts:**
- unit test outputs (including generated tests)
- Playwright trace/video/screenshots
- API check logs
- Daytona recording metadata (when recording enabled)
- rubric criterion evidence links

**Error handling invariant:**
- Any failure path must route to `CleanupAgent` before terminal response.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** naming, API formats, folder boundaries, status transitions, and error/loading behavior.

### Naming Patterns

**Database Naming Conventions:**
- tables: `snake_case` plural (`evaluation_runs`)
- columns: `snake_case` (`submission_id`, `created_at`)
- enums: lowercase snake_case values

**API Naming Conventions:**
- endpoints: lowercase plural nouns (`/api/challenges`)
- path params: `:id` style in docs
- query params: `snake_case`

**Code Naming Conventions:**
- React components: `PascalCase`
- files: `kebab-case.ts` for utils/services, `PascalCase.tsx` for components
- vars/functions: `camelCase`

### Structure Patterns

**Project Organization:**
- Feature-first directories under `src/features/*`.
- Shared building blocks under `src/components/ui` and `src/lib`.
- Tests co-located for units; integration/e2e under `tests/`.

**File Structure Patterns:**
- API schemas: `src/features/<feature>/schemas.ts`
- API handlers: `src/app/api/.../route.ts`
- domain services: `src/features/<feature>/service.ts`

### Format Patterns

**API Response Formats:**
- Strict `{data,error}` envelope across all JSON endpoints.
- Error codes are stable machine-readable strings.

**Data Exchange Formats:**
- JSON keys: `snake_case` over wire, map to camelCase in UI as needed.
- Timestamps: ISO UTC strings.

### Communication Patterns

**Event System Patterns:**
- Dot-delimited lowercase events (`submission.failed`).
- Event payload baseline: `{event, submission_id, at, metadata}`.

**State Management Patterns:**
- Submission lifecycle is source-of-truth enum.
- UI maps enum to labels/badges; never infer by timestamp gaps.

### Process Patterns

**Error Handling Patterns:**
- Route handlers normalize all thrown errors to standard envelope.
- User-facing messages stay concise; internal details remain in logs.

**Loading State Patterns:**
- Every async action has explicit `idle|loading|success|error` UI states.
- Status pages poll on interval and stop on terminal states.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use the canonical submission states only.
- Use the standard API envelope and error code shape.
- Follow naming conventions and feature boundaries.

**Pattern Enforcement:**
- PR checks for lint/type/test.
- Code review checklist includes API envelope + naming + state usage.

### Pattern Examples

**Good Examples:**
- `POST /api/submissions` returns `{data:{id,status},error:null}`
- `submission.ai_scored` event writes to timeline table.

**Anti-Patterns:**
- Mixed response shapes (`{ok:true}` in some routes, `{data}` in others)
- Introducing ad-hoc statuses outside enum.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
100x-hackathon/
├── README.md
├── PRD.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.example
├── .github/workflows/ci.yml
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── challenges/page.tsx
│   │   │   └── leaderboard/[challengeId]/page.tsx
│   │   ├── (builder)/
│   │   │   ├── workspace/[challengeId]/page.tsx
│   │   │   └── submissions/[submissionId]/page.tsx
│   │   ├── (evaluator)/
│   │   │   └── reviews/[submissionId]/page.tsx
│   │   ├── (sponsor)/
│   │   │   └── challenges/[id]/manage/page.tsx
│   │   ├── api/
│   │   │   ├── challenges/route.ts
│   │   │   ├── submissions/route.ts
│   │   │   ├── submissions/[id]/status/route.ts
│   │   │   ├── submissions/[id]/report/route.ts
│   │   │   ├── reviews/[submissionId]/route.ts
│   │   │   └── leaderboard/[challengeId]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── features/
│   │   ├── auth/
│   │   ├── challenges/
│   │   ├── submissions/
│   │   ├── evaluation/
│   │   ├── reviews/
│   │   ├── leaderboard/
│   │   └── notifications/
│   ├── components/
│   │   ├── ui/
│   │   └── features/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── queue/
│   │   ├── daytona/
│   │   ├── langgraph/
│   │   ├── redaction/
│   │   └── logging/
│   ├── types/
│   └── middleware.ts
├── worker/
│   ├── index.ts
│   ├── queue-claim.ts
│   ├── evaluator.ts
│   └── phases/
│       ├── understand.ts
│       ├── boot.ts
│       ├── functional.ts
│       ├── security.ts
│       ├── quality.ts
│       └── report.ts
└── tests/
    ├── integration/
    └── e2e/
```

### Architectural Boundaries

**API Boundaries:**
- Next.js route handlers expose external contracts.
- Worker is internal-only and writes to DB artifacts/state.

**Component Boundaries:**
- UI pages call feature services only; no direct DB calls from components.

**Service Boundaries:**
- `src/lib/*` wraps external providers (Supabase, Daytona, model SDKs).

**Data Boundaries:**
- Only feature services and worker phases mutate submission/eval tables.

### Requirements to Structure Mapping

**Feature Mapping:**
- Challenge lifecycle -> `features/challenges` + `/api/challenges`
- Submission pipeline -> `features/submissions` + `/api/submissions` + `worker/`
- Human review -> `features/reviews` + `/api/reviews/*`
- Leaderboard/badges -> `features/leaderboard`, `features/notifications`

**Cross-Cutting Concerns:**
- RBAC -> `src/middleware.ts` + `features/auth`
- Redaction -> `src/lib/redaction`
- Observability -> `src/lib/logging` + worker logs + trace IDs

### Integration Points

**Internal Communication:**
- App writes queue rows; worker claims and updates status.

**External Integrations:**
- Supabase (auth/db/storage), Daytona (workspace runtime), model providers, LangSmith.

**Data Flow:**
- Submit -> queue -> worker phases -> ai_scored -> human review -> finalized -> leaderboard refresh.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Stack choices are compatible and aligned with existing Next.js repository.

**Pattern Consistency:**
Naming, API envelope, status lifecycle, and feature boundaries are defined and non-conflicting.

**Structure Alignment:**
Project tree supports all PRD areas: challenge, submission, evaluation, review, leaderboard, notifications.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
All major PRD sections map to explicit modules/routes/worker phases.

**Non-Functional Requirements Coverage:**
Latency, reliability, security, and observability are addressed through queue model, isolation, redaction, and tracing.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical implementation-blocking decisions are explicit and actionable.

**Structure Completeness:**
Directory-level implementation map is complete for hackathon scope.

**Pattern Completeness:**
Key conflict points that typically break multi-agent work are covered.

### Gap Analysis Results

- Critical gaps: none for hackathon MVP.
- Important gaps: advanced scaling/cost optimizations deferred post-demo.
- Nice-to-have: stronger anti-plagiarism and deeper automated quality gates.

### Architecture Completeness Checklist

- [x] Project context analyzed
- [x] Core decisions defined
- [x] Implementation patterns specified
- [x] Project structure mapped
- [x] Validation completed

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** High (for hackathon scope)

**First Implementation Priority:**
Implement DB schema + submission state machine + queue worker skeleton in current Next.js repository.
