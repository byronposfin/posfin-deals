# Posfin Deals — Borrower Scorecard & Dashboard

Live borrower-facing deal view, backed by the existing Master Sheet.
Phase 1 MVP per the Vision Card (21 March 2026).

## Stack
- Next.js 14 (App Router) on Vercel
- Google Sheets (Master Sheet) as source of truth via service account
- JWT magic links (jose)
- PDF generation via Playwright (headless Chromium)
- WATI (Tenant 10104554) for WhatsApp delivery

## Routes
- `/`                          — public landing
- `/d/[dealId]?t=<jwt>`        — borrower dashboard (polls /api every 20s)
- `/api/deal/[dealId]?t=<jwt>` — deal JSON (token-gated, server reads sheet)
- `/api/deal/[dealId]/pdf?t=<jwt>` — Scorecard PDF (Playwright renders the dashboard in `print=1` mode)

## Env
Copy `.env.example` → `.env` and fill in:
- `GOOGLE_PRIVATE_KEY` (escape newlines as \n, keep the quotes)
- `JWT_SECRET` (generate: `openssl rand -hex 64`)
- `WATI_BEARER_TOKEN`

## Run (dev)
```
npm install
npx playwright install chromium
npm run dev
```

## Deploy (Vercel)
1. Push to GitHub (Ali to create `posfin-deals` repo)
2. Import to Vercel, point at this repo
3. Add env vars in Vercel dashboard
4. Assign custom domain: `deals.posfincapital.com`
5. Playwright on Vercel: PDF route needs `@sparticuz/chromium` — see TOM_HANDOVER.md for the swap instructions before first deploy

## Tom integration
See `TOM_HANDOVER.md`. Tom calls `scripts/send-scorecard.js <dealId>` via a new OpenClaw tool.
