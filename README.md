# 100x-hackathon

Hackathon platform MVP with role-based challenge management and submission APIs.

## Quickstart

1. Install dependencies:
```bash
npm install
```
2. Configure environment:
```bash
cp .env.example .env.local
```
3. Start dev server:
```bash
npm run dev
```
4. Validate health check:
```bash
curl http://localhost:3000/api/health
```

## Auth flow

Primary flow (real GitHub OAuth via Supabase):

- Open `/api/auth/github/start?role=builder` or `/api/auth/github/start?role=sponsor`
- Complete GitHub auth; callback sets `platform_session` cookie

Demo fallback (without GitHub app setup):

```bash
curl "http://localhost:3000/api/auth/callback?githubHandle=sabari&role=sponsor"
```

This sets `platform_session` cookie. Reuse that cookie for protected endpoints.

## Epic 1 endpoints

- `GET /api/health`
- `GET /api/auth/github/start`
- `GET /api/auth/callback`
- `POST /api/auth/signout`
- `GET|PUT /api/profile`
- `GET|POST /api/challenges`
- `GET|PATCH|DELETE /api/challenges/:id`
- `POST /api/challenges/:id/publish`
- `POST /api/submissions`
- `GET /api/submissions/:id`

See API notes in [docs/api-contracts.md](./docs/api-contracts.md).

## Epic 3 standalone sandbox (separate module)

- UI: `/epic3`, `/epic3/worker`, `/epic3/reviews/submission-demo-001`, `/epic3/leaderboard/challenge-demo-001`
- APIs: `/api/epic3/*`

Runtime configuration:
- Daytona credentials are required: `DAYTONA_API_URL`, `DAYTONA_API_KEY`.
- Optional Daytona settings: `DAYTONA_TARGET`, `DAYTONA_EVAL_SNAPSHOT`.
- Azure OpenAI credentials are required for `AnalysisPlanningAgent` and generated test flows:
  `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`,
  `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_CHAT_MODEL`.
- LangSmith tracing is supported via `LANGSMITH_API_KEY`, `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`.

Behavior:
- Epic 3 is course-corrected to a lean graph-orchestrated approach with grouped specialist agents:
  1. `IntakeValidationAgent`
  2. `SandboxSetupAgent`
  3. `AnalysisPlanningAgent` (LLM-first)
  4. `UnitTestExecutionAgent` (includes test generation when missing)
  5. `RuntimeExecutionAgent` (Playwright + API checks)
  6. `ScoringReportingAgent`
  7. `CleanupAgent` (always)
- Runtime path is Daytona SDK-based sandbox lifecycle.
- Runtime validation artifacts include Playwright trace/video/screenshots and Daytona recording metadata when enabled.
- If Daytona or LLM configuration is unavailable, run fails deterministically and still routes through cleanup.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
