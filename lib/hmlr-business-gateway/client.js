import https from 'node:https';
import { getHmlrConfig, assertHmlrRuntimeReady, buildMutualTlsAgentOptions, redactedConfig } from './config.js';
import { HmlrBusinessGatewayError, throwIfHmlrBusinessError } from './errors.js';
import {
  buildOfficialCopyTitleKnownEnvelope,
  buildPollEnvelope,
  buildRetrieveEnvelope,
  parseAcknowledgement,
  parseStatus,
  parseDocumentResponse,
} from './xml.js';

function joinUrl(baseUrl, path) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function endpointFromTemplate(template, values = {}) {
  let path = template;
  for (const [key, value] of Object.entries(values)) {
    path = path.replaceAll(`{${key}}`, encodeURIComponent(value));
  }
  return path;
}

function validateTitleNumber(titleNumber) {
  const normalized = String(titleNumber || '').toUpperCase().replace(/\s+/g, '').trim();
  if (!/^[A-Z]{0,3}\d{1,6}[ZT]?$/.test(normalized)) {
    throw new HmlrBusinessGatewayError('Invalid title number format before HMLR call.', {
      code: 'INVALID_TITLE_FORMAT',
      category: 'invalid_title',
      retryable: false,
    });
  }
  return normalized;
}

function assertAtLeastOneDocument({ register, titlePlan }) {
  if (!register && !titlePlan) {
    throw new HmlrBusinessGatewayError('At least one official copy document must be requested.', {
      code: 'NO_DOCUMENT_SELECTED',
      category: 'validation',
      retryable: false,
    });
  }
}

async function defaultFetch(url, options) {
  return fetch(url, options);
}

export class HmlrBusinessGatewayClient {
  constructor({ config = getHmlrConfig(), fetchImpl = defaultFetch } = {}) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  getRuntimeStatus() {
    return redactedConfig(this.config);
  }

  async checkAvailability(titleNumber) {
    const normalizedTitle = validateTitleNumber(titleNumber);
    if (!this.config.liveEnabled) return this.stubAvailability(normalizedTitle);

    assertHmlrRuntimeReady(this.config);
    const url = joinUrl(this.config.baseUrl, endpointFromTemplate(this.config.endpoints.availabilityPath, { titleNumber: normalizedTitle }));
    const res = await this.fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      agent: new https.Agent(buildMutualTlsAgentOptions(this.config)),
    });
    const text = await res.text();
    if (!res.ok) this.raiseHttpError('availability check', res.status, text);

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    throwIfHmlrBusinessError(json);
    return this.normaliseAvailability(normalizedTitle, json);
  }

  async orderTitle(titleNumber, { register = true, titlePlan = true, customerReference, propertyDescription } = {}) {
    const normalizedTitle = validateTitleNumber(titleNumber);
    assertAtLeastOneDocument({ register, titlePlan });

    if (!this.config.liveEnabled) {
      return this.stubOrder(normalizedTitle, { register, titlePlan, customerReference, propertyDescription });
    }

    assertHmlrRuntimeReady(this.config);
    const envelope = buildOfficialCopyTitleKnownEnvelope({
      titleNumber: normalizedTitle,
      register,
      titlePlan,
      customerReference,
      propertyDescription,
      config: this.config,
    });

    const xml = await this.postSoap(this.config.endpoints.officialCopySoapPath, envelope, 'OfficialCopyTitleKnown');
    throwIfHmlrBusinessError(xml);
    const ack = parseAcknowledgement(xml);
    if (!ack.applicationReference) {
      throw new HmlrBusinessGatewayError('HMLR order acknowledgement did not contain an application/document reference.', {
        code: 'MISSING_ACK_REFERENCE',
        category: 'parse',
        raw: xml,
      });
    }
    return {
      titleNumber: normalizedTitle,
      requested: { register, titlePlan },
      applicationReference: ack.applicationReference,
      status: ack.status || 'ACKNOWLEDGED',
      message: ack.message,
      raw: ack.raw,
    };
  }

  async pollOrder(reference) {
    if (!reference) throw new Error('pollOrder requires an HMLR application/reference id');
    if (!this.config.liveEnabled) return this.stubPoll(reference);

    assertHmlrRuntimeReady(this.config);
    const envelope = buildPollEnvelope({ reference, config: this.config });
    const xml = await this.postSoap(this.config.endpoints.pollPath, envelope, 'OfficialCopyTitleKnownStatus');
    throwIfHmlrBusinessError(xml);
    return parseStatus(xml);
  }

  async retrieveDocument(reference, { documentReference } = {}) {
    if (!reference) throw new Error('retrieveDocument requires an HMLR application/reference id');
    if (!this.config.liveEnabled) return this.stubRetrieve(reference, { documentReference });

    assertHmlrRuntimeReady(this.config);
    const envelope = buildRetrieveEnvelope({ reference, documentReference, config: this.config });
    const xml = await this.postSoap(this.config.endpoints.retrievePath, envelope, 'OfficialCopyTitleKnownDocument');
    throwIfHmlrBusinessError(xml);
    return parseDocumentResponse(xml);
  }

  async postSoap(path, envelope, soapAction) {
    const url = joinUrl(this.config.baseUrl, path);
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: soapAction,
      },
      body: envelope,
      agent: new https.Agent(buildMutualTlsAgentOptions(this.config)),
    });
    const text = await res.text();
    if (!res.ok) this.raiseHttpError(soapAction, res.status, text);
    return text;
  }

  raiseHttpError(action, status, body) {
    throwIfHmlrBusinessError(body);
    throw new HmlrBusinessGatewayError(`HMLR ${action} HTTP ${status}`, {
      code: `HTTP_${status}`,
      category: 'http',
      retryable: status >= 500,
      raw: body,
    });
  }

  normaliseAvailability(titleNumber, json) {
    const text = JSON.stringify(json);
    throwIfHmlrBusinessError(text);
    return {
      titleNumber,
      registerAvailable: /register/i.test(text) ? !/register[^}]*false/i.test(text) : undefined,
      titlePlanAvailable: /(titlePlan|title plan|plan)/i.test(text) ? !/(titlePlan|title plan|plan)[^}]*false/i.test(text) : undefined,
      documents: json.documents || json.availableDocuments || json.officialCopies || [],
      raw: json,
    };
  }

  stubAvailability(titleNumber) {
    return {
      titleNumber,
      mode: 'stub',
      liveEnabled: false,
      registerAvailable: null,
      titlePlanAvailable: null,
      documents: [],
      message: 'Offline stub: no HMLR Business Gateway call made. Enable only after mutual TLS certificate is installed and HMLR testing is approved.',
    };
  }

  stubOrder(titleNumber, { register, titlePlan, customerReference, propertyDescription }) {
    const requestedAt = new Date().toISOString();
    const applicationReference = `STUB-OC1-${titleNumber}-${requestedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    return {
      titleNumber,
      mode: 'stub',
      liveEnabled: false,
      requested: { register, titlePlan },
      customerReference: customerReference || applicationReference,
      propertyDescription: propertyDescription || 'Security property',
      applicationReference,
      status: 'STUB_ACKNOWLEDGED',
      message: 'Offline stub only — no HMLR endpoint was called. Ready for cert drop-in testing.',
    };
  }

  stubPoll(reference) {
    return {
      mode: 'stub',
      liveEnabled: false,
      applicationReference: reference,
      status: 'STUB_READY',
      ready: true,
      documentReferences: [`${reference}-REGISTER`, `${reference}-TITLEPLAN`],
      message: 'Offline stub poll — documents represented by synthetic references only.',
    };
  }

  stubRetrieve(reference, { documentReference } = {}) {
    const label = documentReference || `${reference}-DOCUMENT`;
    const pdfText = `%PDF-1.4\n% Stub HMLR official copy placeholder for ${label}. No live call made.\n`;
    return {
      mode: 'stub',
      liveEnabled: false,
      applicationReference: reference,
      documentReference: label,
      contentType: 'application/pdf',
      fileName: `${label}.pdf`,
      pdfBuffer: Buffer.from(pdfText, 'utf8'),
      message: 'Offline stub retrieve — replace with live Business Gateway retrieval after certificate installation.',
    };
  }
}

export function createHmlrBusinessGatewayClient(options = {}) {
  return new HmlrBusinessGatewayClient(options);
}

export async function checkAvailability(titleNumber, options = {}) {
  return createHmlrBusinessGatewayClient(options).checkAvailability(titleNumber);
}

export async function orderTitle(titleNumber, selection = { register: true, titlePlan: true }, options = {}) {
  return createHmlrBusinessGatewayClient(options).orderTitle(titleNumber, selection);
}
