# Story 1.3: RBAC minimal guards

Status: done

## Story
As an admin,
I want role-based route and API authorization,
so that builders, sponsors, evaluators, and admins only access permitted actions.

## Acceptance Criteria
1. Role enum supports `builder|sponsor|evaluator|admin`.
2. Protected API routes enforce role checks with consistent error response.
3. Unauthorized actions are blocked and logged.

## Tasks / Subtasks
- [x] Add role enum + user role source of truth (AC: 1)
- [x] Implement shared authorization utility for route handlers (AC: 2)
- [x] Apply guards to challenge create, evaluator review, admin moderation APIs (AC: 2,3)

## Dev Notes
- Keep authorization checks centralized and auditable.
- Use stable machine-readable error codes.

### References
- [Source: /Users/sabari/Work/projects/100x-hackathon/_bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: /Users/sabari/Work/projects/100x-hackathon/PRD.md#4. Users and Roles]

## Dev Agent Record
- Added role source-of-truth enum and role validation helper.
- Added centralized `requireAuth` authorization utility with envelope-based error responses and unauthorized audit logging.
- Applied role guards to challenge create/update/publish, evaluator review, and admin moderation routes.
- Validation: `npm run lint`, `npm run test` both passing.

## File List
- src/features/auth/roles.ts
- src/features/auth/authorization.ts
- src/app/api/challenges/route.ts
- src/app/api/challenges/[id]/route.ts
- src/app/api/challenges/[id]/publish/route.ts
- src/app/api/evaluator/reviews/route.ts
- src/app/api/admin/moderation/route.ts
- src/features/platform/store.ts
