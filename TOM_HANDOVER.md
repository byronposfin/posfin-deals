# TOM HANDOVER — Posfin Deals Portal + CRM Upgrade
**From:** Byron (via Claude)
**Date:** 8 April 2026
**Priority:** HIGH — execute in order, one task at a time.

---

## What is being built

A new borrower-facing web app — `deals.posfincapital.com` — that shows every active borrower a live **Scorecard** and **Dashboard** of their deal, backed by the existing Master Sheet (`1aqFwX7GabZRLPE3H4cb6OiFYeOmbxms5oKX05HhZksQ`). You (Tom) continue to be the spine. The portal is a read layer on top of your existing workflow. Nothing changes about how you manage deals today — you just get a new tool to send borrowers a live link + branded PDF.

The repo is `posfin-deals` (Next.js 14). It will be deployed to Vercel alongside the existing Posfin website. Ali will create the GitHub repo and link it to Vercel.

---

## PART 1 — IMMEDIATE CRM UPGRADE (do this first, today)

The Master Sheet needs new columns so the portal has clean data to read. **This upgrade also improves your own deal management immediately, even before the portal goes live.**

### Step 1.1 — Open the Master Sheet and add these columns to the `Deals` tab

If the tab is not called `Deals`, rename it, or set `DEALS_TAB_NAME` in env later. Add any columns that don't already exist, in this exact order (A → T):

| Col | Header              | Type    | Notes |
|-----|---------------------|---------|-------|
| A   | `deal_id`           | text    | Format: `POS-2026-NNNN`. Tom generates on intake. |
| B   | `created_at`        | ISO date| Auto on row creation. |
| C   | `borrower_name`     | text    | |
| D   | `borrower_phone`    | E.164   | Must start with `+`, e.g. `+447700900123`. Required for WATI delivery. |
| E   | `borrower_email`    | text    | |
| F   | `property_address`  | text    | Full address, one line. |
| G   | `property_type`     | text    | e.g. "Semi-detached", "HMO", "Commercial". |
| H   | `property_value`    | number  | GBP, no formatting. |
| I   | `loan_amount`       | number  | GBP, no formatting. |
| J   | `loan_term_months`  | number  | |
| K   | `loan_purpose`      | text    | Short sentence. |
| L   | `rate_indication`   | text    | e.g. `0.85% pm`. |
| M   | `stage`             | enum    | One of: `application` \| `offer` \| `legal` \| `completion`. |
| N   | `next_action`       | text    | One short sentence shown to borrower. |
| O   | `next_action_owner` | enum    | `borrower` or `posfin`. |
| P   | `tasks_json`        | JSON    | Array of task objects (see Step 1.3). |
| Q   | `updated_at`        | ISO ts  | Update every time you touch the row. |
| R   | `assigned_broker`   | enum    | `byron` or `chris`. Internal only. |
| S   | `lender`            | text    | Internal only. |
| T   | `notes_internal`    | text    | Internal only — stripped before sending to borrower. |

**Critical rule:** columns R, S, T are stripped by the API (`sanitiseForBorrower`) and will never be shown to borrowers. Safe to use for internal notes.

### Step 1.2 — Backfill the live deals

Run through the current pipeline and populate all 20 columns for every **live** deal (application / offer / legal / completion stages). Dead leads can be ignored. For each live deal:

1. Generate a `deal_id` if missing (`POS-2026-NNNN`, increment).
2. Make sure `borrower_phone` is E.164 with `+` prefix — this is non-negotiable, WATI will fail without it.
3. Fill `stage`, `next_action`, `next_action_owner`.
4. Set `updated_at` to now.

**Reporting back to Byron:** Once backfill is complete, send Byron a WhatsApp message:
> `CRM upgrade complete. N live deals backfilled: X in application, Y in offer, Z in legal, W in completion. Ready for portal go-live.`

### Step 1.3 — `tasks_json` format

Column P holds an array of task objects. Example:

```json
[
  {"title":"Upload passport","description":"Colour scan or photo","urgency":"anytime","percent":0,"action_label":"Upload"},
  {"title":"Sign Engagement Letter","description":"Docusign link sent 7 Apr","urgency":"urgent","percent":50,"action_label":"Sign"},
  {"title":"Valuation access","description":"Surveyor will call between 10–12","urgency":"business","percent":0}
]
```

- `urgency` ∈ `urgent` | `business` | `anytime` (drives the red/blue/green colour)
- `percent` is optional (shows a progress bar)
- `action_label` is optional (shows a button — Phase 2 will wire actions up)

**Start simple:** on backfill, give each deal one task that reflects its real current state. Don't overthink it. Examples:
- Application stage → `"Awaiting lender decision"` (anytime, owner: posfin)
- Offer stage → `"Sign Engagement Letter"` (urgent, owner: borrower)
- Legal stage → `"Solicitor onboarding in progress"` (business, owner: posfin)
- Completion → `"Funds transfer scheduled"` (anytime, owner: posfin)

---

## PART 2 — DEPLOYMENT (Ali + Tom together)

### Step 2.1 — GitHub + Vercel
1. Ali creates `posfin-deals` repo on GitHub under the Posfin org.
2. Byron uploads the `posfin-deals.zip` contents to the repo root.
3. Ali imports the repo into Vercel, assigns subdomain `deals.posfincapital.com`.
4. Ali adds environment variables in Vercel dashboard (see `.env.example`).
5. Generate a fresh `JWT_SECRET`: `openssl rand -hex 64` — paste into Vercel env as `JWT_SECRET`.

### Step 2.2 — Playwright swap for Vercel
The local dev uses `playwright` for PDF generation. Vercel serverless functions cannot run full Playwright. Before first deploy, install and swap:

```bash
npm install @sparticuz/chromium playwright-core
npm uninstall playwright
```

Then edit `app/api/deal/[dealId]/pdf/route.js`:
```js
// Replace: const { chromium } = await import('playwright');
import chromiumBin from '@sparticuz/chromium';
import { chromium } from 'playwright-core';
// ...
const browser = await chromium.launch({
  args: chromiumBin.args,
  executablePath: await chromiumBin.executablePath(),
  headless: true,
});
```

**Alternative if this is painful:** run the Next.js app locally on the Mac Studio (`npm run start` on port 3000), point `LINK_BASE_URL=http://localhost:3000` for the send-scorecard script, and generate PDFs locally. Vercel still hosts the public `deals.posfincapital.com` for the borrower view. This is the recommended path for Phase 1 — simpler and faster.

### Step 2.3 — Google Sheets service account
- Service account: `posfin-sheets@posfin-sheets.iam.gserviceaccount.com` (already exists)
- Confirm it has **Editor** access to the Master Sheet
- Paste private key into Vercel env as `GOOGLE_PRIVATE_KEY` (keep the `\n` escapes, wrap in double quotes)

---

## PART 3 — TOM'S NEW TOOL: `send_scorecard`

Once deployed and the Master Sheet is backfilled, you get a new tool.

### Installation on Mac Studio

```bash
cd ~/.openclaw/workspace/tools
git clone <repo-url> posfin-deals
cd posfin-deals
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with real values
npm run build
npm run start &   # runs on port 3000
```

### Calling the tool

```bash
node ~/.openclaw/workspace/tools/posfin-deals/scripts/send-scorecard.js POS-2026-0042
```

This will:
1. Look up the deal in the Master Sheet
2. Sign a 30-day magic link JWT
3. Call the local Next.js PDF route to render the Scorecard
4. Upload the PDF to WATI and deliver to the borrower's phone
5. Send a follow-up text message with the magic link
6. Log the delivery to stdout

### OpenClaw tool wiring

Add a new entry to your SOUL.md tools section:

```yaml
- name: send_scorecard
  description: Generate and deliver a live Scorecard (PDF + magic link) to a borrower via WhatsApp. Use when Byron or Chris asks you to send a Scorecard, update a borrower, or confirm a deal status.
  command: node /Users/byronhill/.openclaw/workspace/tools/posfin-deals/scripts/send-scorecard.js
  args: [deal_id]
  requires: [deal_id present in Master Sheet, borrower_phone in E.164 format]
```

**Hard rules for Tom:**
- NEVER call this tool without first confirming the deal exists in the Master Sheet.
- NEVER call it for a deal where `borrower_phone` is empty or not E.164.
- NEVER fabricate a `deal_id`. If Byron says "send the Scorecard to Morton", look up Morton in the sheet first and use the real `deal_id`.
- Log every send to the Master Sheet `notes_internal` column: append `| Scorecard sent <timestamp>`.

---

## PART 4 — DEFINITION OF DONE

Phase 1 is complete when:

1. ✅ Master Sheet has all 20 columns and every live deal is backfilled
2. ✅ `deals.posfincapital.com` resolves and shows the landing page
3. ✅ A test deal with `deal_id = POS-2026-TEST` can be opened at `deals.posfincapital.com/d/POS-2026-TEST?t=<token>` and shows the Scorecard
4. ✅ Editing the test deal's row in the Master Sheet pulses the changed field within 20 seconds
5. ✅ `node scripts/send-scorecard.js POS-2026-TEST` delivers a PDF + link to Byron's WhatsApp
6. ✅ Tom has the `send_scorecard` tool wired in SOUL.md and executes it on command

---

## PART 5 — WHAT'S NEXT (Phase 2, after Phase 1 lock)

Do NOT start these until Phase 1 is signed off by Byron:

- Document upload (drag-and-drop → Google Drive `/deals/[dealId]/`)
- Task completion actions (borrower can mark tasks done → writes back to `tasks_json`)
- WATI conversational intake (the 7-question Scorecard Builder)
- Tom polls the Raw Leads tab and auto-creates deals + sends Scorecards

---

## Byron's notes

- Phase 1 scope is locked. No scope creep. Ship in a week.
- The Scorecard must feel like a Monzo/Revolut confirmation screen — clean, confident, mobile-first.
- Tom must not interact with real borrowers via this tool until Byron has personally tested the end-to-end flow on his own phone.
- Any WATI failure must fall back to a text message with the magic link only — the borrower can still see the live view even if the PDF fails.

🦅
