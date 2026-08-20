import { NextResponse } from 'next/server';
import { createHmlrBusinessGatewayClient, HmlrBusinessGatewayError } from '@/lib/hmlr-business-gateway';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}));
    const register = body.register !== false;
    const titlePlan = body.titlePlan !== false;
    const customerReference = body.customerReference;
    const propertyDescription = body.propertyDescription;

    const client = createHmlrBusinessGatewayClient();
    const order = await client.orderTitle(params.titleNumber, { register, titlePlan, customerReference, propertyDescription });
    const poll = await client.pollOrder(order.applicationReference);

    return NextResponse.json({ ok: true, order, poll });
  } catch (error) {
    const status = error instanceof HmlrBusinessGatewayError && ['invalid_title', 'validation'].includes(error.category) ? 400 : 500;
    return NextResponse.json({
      ok: false,
      error: {
        message: error.message,
        code: error.code || 'HMLR_ORDER_ERROR',
        category: error.category || 'unknown',
        retryable: Boolean(error.retryable),
      },
    }, { status });
  }
}
