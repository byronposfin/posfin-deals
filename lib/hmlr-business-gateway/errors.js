export class HmlrBusinessGatewayError extends Error {
  constructor(message, { code = 'HMLR_ERROR', category = 'gateway', retryable = false, raw = undefined } = {}) {
    super(message);
    this.name = 'HmlrBusinessGatewayError';
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.raw = raw;
  }
}

export const HMLR_BUSINESS_RULES = Object.freeze({
  INVALID_TITLE: {
    category: 'invalid_title',
    message: 'Invalid title number — check the title reference before ordering official copies.',
    retryable: false,
    match: [/invalid\s+title/i, /title\s+number.*invalid/i, /BG.*invalid.*title/i],
  },
  CLOSED_TITLE: {
    category: 'closed_title',
    message: 'Closed title — HMLR has marked this title as closed; order cannot proceed for this title number.',
    retryable: false,
    match: [/closed\s+title/i, /title.*closed/i],
  },
  PENDING_APPLICATION: {
    category: 'pending_application',
    message: 'Pending application — HMLR indicates a pending application may affect availability or ordering.',
    retryable: true,
    match: [/pending\s+application/i, /application.*pending/i],
  },
  FEE_MISMATCH: {
    category: 'fee_mismatch',
    message: 'Fee mismatch — HMLR rejected the order because supplied/expected fees did not reconcile.',
    retryable: false,
    match: [/fee\s+mismatch/i, /fee.*incorrect/i, /incorrect.*fee/i],
  },
  NOT_COMPUTERISED: {
    category: 'not_computerised',
    message: 'Title not computerised — HMLR Business Gateway cannot supply this title automatically.',
    retryable: false,
    match: [/not\s+computerised/i, /non[-\s]?computerised/i, /not\s+available\s+electronically/i],
  },
  UNAVAILABLE_DOCUMENT: {
    category: 'document_unavailable',
    message: 'Requested official copy document is not currently available for this title.',
    retryable: false,
    match: [/document.*unavailable/i, /not.*available/i, /no\s+document/i],
  },
});

export function classifyHmlrBusinessRule(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input || {});
  const upper = text.toUpperCase();

  for (const [code, rule] of Object.entries(HMLR_BUSINESS_RULES)) {
    if (upper.includes(code) || rule.match.some((rx) => rx.test(text))) {
      return { code, ...rule };
    }
  }

  const explicitCode = text.match(/(?:code|errorCode|reasonCode)["':\s=]+([A-Z0-9_.-]+)/i)?.[1];
  if (explicitCode) {
    return {
      code: explicitCode,
      category: 'business_rule',
      message: `HMLR business-rule response: ${explicitCode}`,
      retryable: false,
    };
  }

  return null;
}

export function throwIfHmlrBusinessError(payload) {
  const classified = classifyHmlrBusinessRule(payload);
  if (!classified) return;
  throw new HmlrBusinessGatewayError(classified.message, {
    code: classified.code,
    category: classified.category,
    retryable: classified.retryable,
    raw: payload,
  });
}
