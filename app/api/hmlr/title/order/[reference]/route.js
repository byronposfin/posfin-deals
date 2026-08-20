import { NextResponse } from 'next/server';
import { createHmlrBusinessGatewayClient, HmlrBusinessGatewayError } from '@/lib/hmlr-business-gateway';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const documentReference = searchParams.get('documentReference') || undefined;
    const client = createHmlrBusinessGatewayClient();
    const status = await client.pollOrder(params.reference);
    const document = status.ready ? await client.retrieveDocument(params.reference, { documentReference }) : null;

    return NextResponse.json({
      ok: true,
      status,
      document: document ? {
        mode: document.mode,
        contentType: document.contentType,
        fileName: document.fileName,
        documentReference: document.documentReference,
        hasPdf: Boolean(document.pdfBuffer || document.pdfBase64),
        message: document.message,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: {
        message: error.message,
        code: error.code || 'HMLR_RETRIEVE_ERROR',
        category: error.category || 'unknown',
        retryable: Boolean(error.retryable),
      },
    }, { status: error instanceof HmlrBusinessGatewayError && error.category === 'invalid_title' ? 400 : 500 });
  }
}
