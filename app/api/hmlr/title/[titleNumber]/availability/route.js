import { NextResponse } from 'next/server';
import { checkAvailability, HmlrBusinessGatewayError } from '@/lib/hmlr-business-gateway';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  try {
    const result = await checkAvailability(params.titleNumber);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const status = error instanceof HmlrBusinessGatewayError && error.category === 'invalid_title' ? 400 : 500;
    return NextResponse.json({
      ok: false,
      error: {
        message: error.message,
        code: error.code || 'HMLR_AVAILABILITY_ERROR',
        category: error.category || 'unknown',
        retryable: Boolean(error.retryable),
      },
    }, { status });
  }
}
