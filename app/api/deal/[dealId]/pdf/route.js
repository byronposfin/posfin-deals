import { NextResponse } from 'next/server';
import { getDealById, sanitiseForBorrower } from '@/lib/sheets';
import { verifyDealToken, signDealToken, buildMagicLink } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { dealId } = params;
  const token = new URL(req.url).searchParams.get('t');
  const payload = token ? await verifyDealToken(token) : null;
  if (!payload || payload.dealId !== dealId) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  const deal = await getDealById(dealId);
  if (!deal) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Lazy import so dev servers without Playwright still boot.
  const { chromium } = await import('playwright');
  const freshToken = await signDealToken(dealId, 30);
  const url = buildMagicLink(dealId, freshToken) + '&print=1';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 820, height: 1160 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' } });
  await browser.close();

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="posfin-scorecard-${dealId}.pdf"`,
    },
  });
}
