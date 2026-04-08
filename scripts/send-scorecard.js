#!/usr/bin/env node
/**
 * Tom-callable tool: generate Scorecard PDF + magic link, deliver via WATI.
 *
 * Usage on the Mac Studio:
 *   node scripts/send-scorecard.js <dealId>
 *
 * Environment: reads .env in the project root.
 * Requires: the Next.js app to be running (npm run start or npm run dev)
 *           on LINK_BASE_URL so the PDF route can render.
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { signDealToken, buildMagicLink } from '../lib/jwt.js';
import { getDealById } from '../lib/sheets.js';
import { sendDocument, sendText } from '../lib/wati.js';

async function main() {
  const dealId = process.argv[2];
  if (!dealId) {
    console.error('Usage: node scripts/send-scorecard.js <dealId>');
    process.exit(1);
  }

  const base = process.env.LINK_BASE_URL || 'http://localhost:3000';

  console.log(`[1/4] Loading deal ${dealId}…`);
  const deal = await getDealById(dealId);
  if (!deal) { console.error('Deal not found in Master Sheet.'); process.exit(2); }
  if (!deal.borrower_phone) { console.error('Borrower phone missing. Cannot send.'); process.exit(3); }

  console.log('[2/4] Signing magic link token…');
  const token = await signDealToken(dealId, 30);
  const link = buildMagicLink(dealId, token);

  console.log('[3/4] Generating PDF via /api/deal/:id/pdf…');
  const pdfUrl = `${base}/api/deal/${encodeURIComponent(dealId)}/pdf?t=${encodeURIComponent(token)}`;
  const res = await fetch(pdfUrl);
  if (!res.ok) { console.error('PDF generation failed:', res.status, await res.text()); process.exit(4); }
  const buf = Buffer.from(await res.arrayBuffer());

  const outDir = join(tmpdir(), 'posfin-scorecards');
  mkdirSync(outDir, { recursive: true });
  const filePath = join(outDir, `posfin-scorecard-${dealId}.pdf`);
  writeFileSync(filePath, buf);
  console.log(`      wrote ${filePath}`);

  console.log('[4/4] Delivering via WATI…');
  const caption = `Your Posfin Scorecard — live view: ${link}`;
  await sendDocument(deal.borrower_phone, filePath, caption);
  await sendText(
    deal.borrower_phone,
    `Tap here to see your deal update live: ${link}`
  );

  console.log('✅ Delivered to', deal.borrower_phone);
  console.log('   Magic link:', link);
}

main().catch(err => { console.error(err); process.exit(99); });
