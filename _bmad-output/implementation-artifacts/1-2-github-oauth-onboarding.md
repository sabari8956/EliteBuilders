# Story 1.2: GitHub OAuth onboarding

Status: done

## Story
As a builder,
I want to authenticate using GitHub and complete onboarding profile fields,
so that I can participate in challenges with verified identity context.

## Acceptance Criteria
1. GitHub OAuth login succeeds and creates/links user.
2. Onboarding form captures GitHub URL, portfolio URL, optional CV link/file metadata.
3. Authenticated session persists and route protection works on private pages.

## Tasks / Subtasks
- [x] Configure Supabase Auth GitHub provider and callback handling (AC: 1)
- [x] Build onboarding form + persistence for profile metadata (AC: 2)
- [x] Add middleware/guard for authenticated routes used in demo flow (AC: 3)

## Dev Notes
- Hackathon cut: skip Google OAuth for now.
- Keep profile schema minimal but extensible.
- Store only non-sensitive profile metadata in user-visible records.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/PRD.md#7.2 Onboarding and Identity]
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/hackathon-priority-plan.md#P0 (Build Now)]

## Dev Agent Record
- Added GitHub OAuth start/callback API endpoints with account link/create behavior and session cookie issuance (`platform_session`).
- Added in-memory user/session store and profile schema persistence endpoint (`GET|PUT /api/profile`).
- Added onboarding page at `/onboarding` with profile form (GitHub URL, portfolio URL, optional CV metadata).
- Added middleware-based auth protection for `/dashboard`, `/onboarding`, and `/sponsor` paths.
- Validation: `npm run lint`, `npm run test` both passing.

## File List
- src/app/api/auth/github/start/route.ts
- src/app/api/auth/callback/route.ts
- src/app/api/profile/route.ts
- src/app/onboarding/page.tsx
- src/app/dashboard/page.tsx
- middleware.ts
- src/features/auth/oauth.ts
- src/features/auth/session.ts
- src/features/profile/schema.ts
- src/features/platform/store.ts
