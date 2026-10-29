# Cheque Printing Web App

A Vercel-ready Next.js + Supabase cheque printing application.

## Architecture
- Supabase Auth for login/signup
- Protected application routes
- PostgreSQL cheque register with per-user RLS
- Templates, printer settings and print-history foundations
- Private Storage bucket for original-cheque calibration images
- `designer` route reserved for the frozen v24 calibration engine

## Important v24 integration

The exact v24 calibration HTML is the source of truth for physical cheque alignment. Do not recreate or approximate it. The application expects the verified v24 page at `public/cheque-designer-v24.html`.

The designer integration uses `postMessage`:

- Parent -> iframe: `{ type: "GET_CHEQUE_STATE" }`
- iframe -> parent: `{ type: "CHEQUE_STATE_RESULT", state: ... }`

The returned state is saved with each cheque as its layout snapshot.

## Environment

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
# Optional
ADMIN_EMAIL=                 # defaults to the owner account; change without editing code
NEXT_PUBLIC_SUPPORT_EMAIL=   # shown on the Privacy page
```

Never commit `.env.local`, service-role keys, or other secrets.

## Development

```bash
npm install
npm run dev
```

## Production

Deploy the repository to Vercel and add the environment variables above. Configure the Supabase Auth Site URL and redirect URL to the deployed Vercel domain before production login/signup testing.

## Production checklist (Supabase dashboard)

- Auth → Rate limits: keep sign-in, sign-up and password-reset limits enabled.
- Auth → Attack protection: enable CAPTCHA (e.g. Cloudflare Turnstile).
- Auth → Password: minimum length 8 or more; enable leaked-password protection.
- Auth → URL configuration: Site URL and redirect URLs set to the production domain.
- Database → Backups: enable daily backups / point-in-time recovery.
- Health check: `GET /api/health` returns `{ok:true}` (use with an uptime monitor).
