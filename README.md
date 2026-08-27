# Cheque Printing Web App

Next.js + Supabase cheque printing application foundation.

## Architecture
- Supabase Auth for login/signup
- Supabase PostgreSQL for cheque records/templates
- Supabase Storage for cheque background images
- Protected application routes
- v24 cheque calibration engine retained in `public/cheque-designer-v24.html`
- Vercel-ready Next.js application

## Environment
Copy `.env.example` to `.env.local` and add your Supabase URL and publishable/anon key.

## Run
```bash
npm install
npm run dev
```
