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
```

Never commit `.env.local`, service-role keys, or other secrets.

## Development

```bash
npm install
npm run dev
```

## Production

Deploy the repository to Vercel and add the environment variables above. Configure the Supabase Auth Site URL and redirect URL to the deployed Vercel domain before production login/signup testing.
