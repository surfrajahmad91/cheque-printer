# ChequeFlow — launch checklist

Tick each item before sharing the link with real customers.

## Already in the product
- [x] Production build, lockfile, pinned versions, CI (type-check + build)
- [x] Error pages, 404, loading skeletons, health check (`/api/health`)
- [x] Security headers, safe login/reset messages, 8-character passwords
- [x] Privacy Policy and Terms pages (have them reviewed — see below)
- [x] Search/share metadata: titles, description, share image, robots, sitemap, icons
- [x] Print confirmation, bold-print option, IST dates, CSV export

## Vercel (Project → Settings)
- [ ] Environment variables set for **Production**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your final https address, no trailing slash)
- [ ] Optional: `ADMIN_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`
- [ ] Custom domain added, HTTPS shows a padlock (then update `NEXT_PUBLIC_SITE_URL`)
- [ ] Turn on **Web Analytics** and **Speed Insights** (optional)
- [ ] Redeploy after changing variables

## Supabase
- [ ] Auth → URL Configuration: Site URL and Redirect URLs use the final domain (keep the old vercel.app one too while testing)
- [ ] Auth → Email → SMTP: custom sender (the built-in sender is only for testing and is rate-limited)
- [ ] Email templates edited: sender name "ChequeFlow", friendly wording
- [ ] Password minimum length 8+, leaked-password protection (Pro plan)
- [ ] Rate limits left on; CAPTCHA (Turnstile) turned on once the forms send the token
- [ ] Database backups enabled (Pro plan: daily backups)
- [ ] Your own Supabase account has two-factor sign-in

## Data and accounts
- [ ] Delete or void test cheques (numbers like 1 or 456526, notes "Test")
- [ ] Merge duplicate payees (Payees page → Merge)
- [ ] Approve a second test user end to end: sign up → verify email → admin approves → sign in
- [ ] Confirm only approved users can reach the dashboard

## Print safety (do on the real printer)
- [ ] Print on plain paper, hold over a real cheque leaf against the light
- [ ] Print one cheque on a real leaf for each bank / template you will use
- [ ] Test "Print again", "move back to draft" and "cancel cheque" on throwaway cheques
- [ ] Check Bold text on and off
- [ ] Test on Windows Chrome and on the browser customers will really use

## Legal and trust
- [ ] Privacy Policy and Terms reviewed by someone qualified (India: IT Act / DPDP Act wording)
- [ ] Support contact shown (set `NEXT_PUBLIC_SUPPORT_EMAIL`)
- [ ] Decide how customers delete their account and data

## After launch (first week)
- [ ] Watch Vercel → Logs and Supabase → Logs for errors
- [ ] Add uptime monitoring on `/api/health` (UptimeRobot / Better Stack, free tier)
- [ ] Add error tracking (Sentry) when you have an account
