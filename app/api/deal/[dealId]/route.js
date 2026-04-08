import { NextResponse } from 'next/server';
import { getDealById, sanitiseForBorrower } from '@/lib/sheets';
import { verifyDealToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, { params }) {
  const { dealId } = params;
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 });

  const payload = await verifyDealToken(token);
  if (!payload || payload.dealId !== dealId) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  const deal = await getDealById(dealId);
  if (!deal) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ deal: sanitiseForBorrower(deal), ts: Date.now() });
}
