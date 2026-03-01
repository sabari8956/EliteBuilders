# OAuth Callback Notes

If Supabase/GitHub returns `#access_token=...` (implicit flow), the browser fragment is not sent to server routes.

This app uses a browser callback bridge at `/auth/callback` to capture hash tokens and forward them to `/api/auth/callback`.

Required local env:

- `GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback`

Supabase redirect URL should include:

- `http://localhost:3000/auth/callback`
