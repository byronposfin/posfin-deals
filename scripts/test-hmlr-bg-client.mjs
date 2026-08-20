import assert from 'node:assert/strict';
import { HmlrBusinessGatewayClient, classifyHmlrBusinessRule, HmlrBusinessGatewayError } from '../lib/hmlr-business-gateway/index.js';
import { buildOfficialCopyTitleKnownEnvelope, requestedOfficialCopyCode } from '../lib/hmlr-business-gateway/xml.js';

let networkCalls = 0;
const fetchImpl = async () => {
  networkCalls += 1;
  throw new Error('Network calls are forbidden in offline HMLR tests');
};

const client = new HmlrBusinessGatewayClient({
  fetchImpl,
  config: {
    environment: 'test',
    liveEnabled: false,
    baseUrl: 'https://bgtest.landregistry.gov.uk',
    authorisedUserId: 'BHILL3122',
    authorisedUserPassword: undefined,
    vddKey: undefined,
    endpoints: {
      availabilityPath: '/stub/availability',
      officialCopySoapPath: '/stub/order',
      pollPath: '/stub/poll',
      retrievePath: '/stub/retrieve',
    },
  },
});

const availability = await client.checkAvailability('ab123456');
assert.equal(availability.titleNumber, 'AB123456');
assert.equal(availability.mode, 'stub');

assert.equal(requestedOfficialCopyCode({ register: true, titlePlan: false }), '10');
assert.equal(requestedOfficialCopyCode({ register: false, titlePlan: true }), '20');
assert.equal(requestedOfficialCopyCode({ register: true, titlePlan: true }), '30');

const envelope = buildOfficialCopyTitleKnownEnvelope({
  titleNumber: 'AB123456',
  register: true,
  titlePlan: true,
  customerReference: 'POSFIN-TEST',
  propertyDescription: '1 Test Street',
  config: client.config,
});
assert.match(envelope, /<ns3:performTitleKnownSearch>/);
assert.match(envelope, /<ns1:RequestedOfficialCopyCode>30<\/ns1:RequestedOfficialCopyCode>/);
assert.match(envelope, /<ns1:PropertyDescription>1 Test Street<\/ns1:PropertyDescription>/);
assert.match(envelope, /<ns1:OfficialCopyTypeCode>10<\/ns1:OfficialCopyTypeCode>/);

const order = await client.orderTitle('AB123456', { register: true, titlePlan: true, customerReference: 'POSFIN-TEST', propertyDescription: '1 Test Street' });
assert.equal(order.titleNumber, 'AB123456');
assert.equal(order.requested.register, true);
assert.equal(order.requested.titlePlan, true);
assert.match(order.applicationReference, /^STUB-OC1-AB123456-/);

const poll = await client.pollOrder(order.applicationReference);
assert.equal(poll.ready, true);
assert.equal(poll.documentReferences.length, 2);

const doc = await client.retrieveDocument(order.applicationReference, { documentReference: poll.documentReferences[0] });
assert.equal(doc.contentType, 'application/pdf');
assert.ok(Buffer.isBuffer(doc.pdfBuffer));
assert.equal(networkCalls, 0);

for (const [sample, expected] of [
  ['Invalid title number supplied', 'INVALID_TITLE'],
  ['This is a closed title', 'CLOSED_TITLE'],
  ['Pending application exists', 'PENDING_APPLICATION'],
  ['Fee mismatch detected', 'FEE_MISMATCH'],
  ['Title is not computerised', 'NOT_COMPUTERISED'],
]) {
  assert.equal(classifyHmlrBusinessRule(sample).code, expected);
}

await assert.rejects(() => client.orderTitle('bad title !', { register: true, titlePlan: true }), HmlrBusinessGatewayError);
await assert.rejects(() => client.orderTitle('AB123456', { register: false, titlePlan: false }), HmlrBusinessGatewayError);

console.log('HMLR Business Gateway offline client tests passed; network calls:', networkCalls);
