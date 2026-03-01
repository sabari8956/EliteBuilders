# Core API Contracts (Epic 1)

All API routes return a consistent envelope:

- Success: `{ "data": { ... }, "error": null }`
- Failure: `{ "data": null, "error": { "code": "...", "message": "...", "details": ... } }`

## Auth

- `GET /api/auth/github/start?role=<builder|sponsor|evaluator|admin>`: starts GitHub OAuth (redirect).
- `GET /api/auth/callback?code=...&state=...`: OAuth callback; sets `platform_session`.
- `POST /api/auth/signout`: clears `platform_session`.
- Demo fallback remains available: `GET /api/auth/callback?githubHandle=<handle>&role=<optional-role>`.

## Profile

- `GET /api/profile`: current authenticated user with role/profile.
- `PUT /api/profile`: persist onboarding metadata (`githubUrl`, `portfolioUrl`, optional `cvMetadata`).

## Challenges

- `GET /api/challenges?status=<draft|published>&deadlineOrder=<asc|desc>`
- `GET /api/challenges?mine=true` (sponsor/admin; only caller-owned challenges)
- `POST /api/challenges` (sponsor/admin)
- `GET /api/challenges/:id`
- `PATCH /api/challenges/:id` (sponsor/admin)
- `DELETE /api/challenges/:id` (sponsor/admin; draft only)
- `POST /api/challenges/:id/publish` (sponsor/admin)

Default listing behavior returns published-only records when `status` is omitted.

## Submissions

- `POST /api/submissions` (builder/admin) with `challengeId` + `snapshotRef`
- `GET /api/submissions/:id` (owner/admin)

Submission IDs are deterministic monotonic IDs with UTC timestamps.
