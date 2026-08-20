export function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function textBetween(xml, tagNames) {
  const tags = Array.isArray(tagNames) ? tagNames : [tagNames];
  for (const tag of tags) {
    const rx = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i');
    const match = xml.match(rx);
    if (match) return decodeXml(match[1].trim());
  }
  return undefined;
}

export function allTextBetween(xml, tagName) {
  const rx = new RegExp(`<(?:\\w+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`, 'gi');
  return [...xml.matchAll(rx)].map((m) => decodeXml(m[1].trim()));
}

export function decodeXml(value = '') {
  return String(value)
    .replaceAll('&apos;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

export function buildAuthorisedUserSoapHeader(config) {
  return `
    <bg:AuthorisedUser>
      <bg:Username>${escapeXml(config.authorisedUserId)}</bg:Username>
      <bg:Password>${escapeXml(config.authorisedUserPassword || '__ENV_HMLR_BG_AUTHORISED_USER_PASSWORD__')}</bg:Password>
    </bg:AuthorisedUser>
    <bg:BillingDetails>
      <bg:VDDKey>${escapeXml(config.vddKey || '__ENV_HMLR_BG_VDD_KEY__')}</bg:VDDKey>
    </bg:BillingDetails>`;
}

export function requestedOfficialCopyCode({ register = true, titlePlan = true }) {
  if (register && titlePlan) return '30'; // Register and Title plan
  if (register) return '10'; // Register only
  if (titlePlan) return '20'; // Title plan only (schema label: Title only)
  throw new Error('At least one official copy document must be selected');
}

export function buildOfficialCopyTitleKnownEnvelope({ titleNumber, register = true, titlePlan = true, config, customerReference, propertyDescription }) {
  const ref = customerReference || `POSFIN-${String(titleNumber).toUpperCase()}-${Date.now()}`;
  const messageId = `Msg-${ref}`.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 60);
  const copyCode = requestedOfficialCopyCode({ register, titlePlan });

  // Body follows HMLR public example:
  // documents/official_copy_known/OfficialCopyTitleKnownV2_1_Example.xml
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bg="http://www.landregistry.gov.uk/BusinessGateway" xmlns:ns1="http://www.oscre.org/ns/eReg-Final/2011/RequestTitleKnownOfficialCopyV2_1" xmlns:ns3="http://officialcopyv2_1.ws.bg.lr.gov/">
  <soapenv:Header>${buildAuthorisedUserSoapHeader(config)}</soapenv:Header>
  <soapenv:Body>
    <ns3:performTitleKnownSearch>
      <arg0>
        <ns1:ID>
          <ns1:MessageID>${escapeXml(messageId)}</ns1:MessageID>
        </ns1:ID>
        <ns1:Product>
          <ns1:ExternalReference>
            <ns1:Reference>${escapeXml(ref)}</ns1:Reference>
          </ns1:ExternalReference>
          <ns1:CustomerReference>
            <ns1:Reference>${escapeXml(ref)}</ns1:Reference>
          </ns1:CustomerReference>
          <ns1:SubjectProperty>
            <ns1:TitleNumber>${escapeXml(String(titleNumber).toUpperCase().trim())}</ns1:TitleNumber>
          </ns1:SubjectProperty>
          <ns1:ExpectedPrice>
            <ns1:GrossPriceAmount>${escapeXml(config.expectedPriceAmount || '10')}</ns1:GrossPriceAmount>
          </ns1:ExpectedPrice>
          <ns1:Contact>
            <ns1:Name>${escapeXml(config.contactName || 'Posfin Capital')}</ns1:Name>
            <ns1:Communication>
              <ns1:Telephone>${escapeXml(config.contactTelephone || '02039514283')}</ns1:Telephone>
            </ns1:Communication>
          </ns1:Contact>
          <ns1:TitleKnownOfficialCopy>
            <ns1:RequestedOfficialCopyCode>${copyCode}</ns1:RequestedOfficialCopyCode>
            <ns1:PropertyDescription>${escapeXml((propertyDescription || 'Security property').slice(0, 130))}</ns1:PropertyDescription>
            <ns1:OfficialCopyTypeCode>10</ns1:OfficialCopyTypeCode>
            <ns1:ContinueIfTitleIsClosedAndContinuedIndicator>false</ns1:ContinueIfTitleIsClosedAndContinuedIndicator>
            <ns1:NotifyIfPendingFirstRegistrationIndicator>false</ns1:NotifyIfPendingFirstRegistrationIndicator>
            <ns1:NotifyIfPendingApplicationIndicator>false</ns1:NotifyIfPendingApplicationIndicator>
            <ns1:SendBackDatedIndicator>false</ns1:SendBackDatedIndicator>
            <ns1:ContinueIfActualFeeExceedsExpectedFeeIndicator>true</ns1:ContinueIfActualFeeExceedsExpectedFeeIndicator>
          </ns1:TitleKnownOfficialCopy>
        </ns1:Product>
      </arg0>
    </ns3:performTitleKnownSearch>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function buildPollEnvelope({ reference, config }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bg="http://www.landregistry.gov.uk/BusinessGateway">
  <soapenv:Header>${buildAuthorisedUserSoapHeader(config)}</soapenv:Header>
  <soapenv:Body>
    <bg:OfficialCopyTitleKnownStatusRequest>
      <bg:ApplicationReference>${escapeXml(reference)}</bg:ApplicationReference>
    </bg:OfficialCopyTitleKnownStatusRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function buildRetrieveEnvelope({ reference, documentReference, config }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bg="http://www.landregistry.gov.uk/BusinessGateway">
  <soapenv:Header>${buildAuthorisedUserSoapHeader(config)}</soapenv:Header>
  <soapenv:Body>
    <bg:OfficialCopyTitleKnownDocumentRequest>
      <bg:ApplicationReference>${escapeXml(reference)}</bg:ApplicationReference>
      ${documentReference ? `<bg:DocumentReference>${escapeXml(documentReference)}</bg:DocumentReference>` : ''}
    </bg:OfficialCopyTitleKnownDocumentRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function parseAcknowledgement(xml) {
  return {
    applicationReference: textBetween(xml, ['ApplicationReference', 'Reference', 'MessageId', 'AcknowledgementReference']),
    status: textBetween(xml, ['Status', 'ApplicationStatus', 'ResponseStatus']),
    message: textBetween(xml, ['Message', 'Description', 'ResultText']),
    raw: xml,
  };
}

export function parseStatus(xml) {
  const documentReferences = [
    ...allTextBetween(xml, 'DocumentReference'),
    ...allTextBetween(xml, 'DocumentId'),
  ].filter(Boolean);
  return {
    applicationReference: textBetween(xml, ['ApplicationReference', 'Reference']),
    status: textBetween(xml, ['Status', 'ApplicationStatus', 'ResponseStatus']),
    message: textBetween(xml, ['Message', 'Description', 'ResultText']),
    documentReferences: [...new Set(documentReferences)],
    ready: /ready|complete|completed|available|fulfilled/i.test(xml),
    raw: xml,
  };
}

export function parseDocumentResponse(xml) {
  const base64 = textBetween(xml, ['Document', 'DocumentData', 'PDF', 'PdfData', 'Attachment']);
  return {
    contentType: textBetween(xml, ['ContentType', 'MimeType']) || 'application/pdf',
    fileName: textBetween(xml, ['FileName', 'Filename']) || undefined,
    documentReference: textBetween(xml, ['DocumentReference', 'DocumentId']) || undefined,
    pdfBase64: base64,
    pdfBuffer: base64 ? Buffer.from(base64, 'base64') : undefined,
    raw: xml,
  };
}
