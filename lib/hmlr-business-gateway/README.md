# HMLR Business Gateway client — offline scaffold

Purpose: isolate HM Land Registry Business Gateway automation behind one swappable module for official copy title pulls.

## Public spec targets

- Developer pack: `https://landregistry.github.io/bgtechdoc`
- Pre-check service: **Official Copy Document Availability V2** — RESTful availability check before ordering.
- Ordering service: **Official Copy Title Known** — SOAP/XML OC1 order for title register + title plan.

## Safety lock

This scaffold makes **no HMLR calls by default**.

`HMLR_BG_LIVE_ENABLED` defaults to `false`. In this state:

- `checkAvailability(titleNumber)` returns an offline stub.
- `orderTitle(titleNumber, { register, titlePlan })` returns a synthetic `STUB-OC1-*` acknowledgement.
- `pollOrder(reference)` returns synthetic ready document references.
- `retrieveDocument(reference)` returns a placeholder PDF buffer.

Do not flip live mode until HMLR client mutual-TLS certs have arrived and test accreditation is approved.

## Primary interface

```js
import { orderTitle, checkAvailability, createHmlrBusinessGatewayClient } from '@/lib/hmlr-business-gateway';

await checkAvailability('AB123456');
await orderTitle('AB123456', { register: true, titlePlan: true });

const client = createHmlrBusinessGatewayClient();
const order = await client.orderTitle('AB123456', { register: true, titlePlan: true });
const status = await client.pollOrder(order.applicationReference);
const pdf = await client.retrieveDocument(order.applicationReference, { documentReference: status.documentReferences[0] });
```

Everything else in the Posfin title-pull pipeline should call this interface only.

## Env/config — no secrets in repo

Set these only in local/Vercel env or vault:

```bash
HMLR_BG_ENV=test
HMLR_BG_LIVE_ENABLED=false
HMLR_BG_BASE_URL=https://bgtest.landregistry.gov.uk
HMLR_BG_AUTHORISED_USER_ID=BHILL3122
HMLR_BG_AUTHORISED_USER_PASSWORD=***
HMLR_BG_VDD_KEY=9674086

# Use either PFX or PEM pair once HMLR issues cert
HMLR_BG_CLIENT_PFX_PATH=/secure/path/hmlr-client.p12
HMLR_BG_CLIENT_CERT_PASSPHRASE=***
# or
HMLR_BG_CLIENT_CERT_PATH=/secure/path/hmlr-client.crt
HMLR_BG_CLIENT_KEY_PATH=/secure/path/hmlr-client.key
HMLR_BG_CLIENT_CERT_PASSPHRASE=***
```

`BHILL3122` is a non-secret AU ordering ID. The VDD key is non-secret billing configuration and defaults to Posfin's configured VDD key, but remains overridable by env. Password and cert material must stay env/vault only.

## Server scaffold endpoints

These routes are safe offline stubs until `HMLR_BG_LIVE_ENABLED=true`:

- `GET /api/hmlr/title/:titleNumber/availability`
- `POST /api/hmlr/title/:titleNumber/order` body: `{ "register": true, "titlePlan": true }`
- `GET /api/hmlr/title/order/:reference`

## Business-rule handling

The client maps common HMLR business-rule outcomes into `HmlrBusinessGatewayError`:

- invalid title
- closed title
- pending application
- fee mismatch
- not-computerised / not electronically available
- unavailable document

Pipeline code should surface `error.message`, `error.code`, `error.category`, and `error.retryable` to operators rather than swallowing the response.

## Certificate drop-in checklist

1. Store cert/key/PFX in secure local path or Vercel secret-compatible storage.
2. Set env vars above.
3. Confirm exact HMLR test endpoint paths from final accreditation pack; if different, patch only `config.js` endpoint paths or env vars.
4. Run offline tests first: `npm run test:hmlr`.
5. Set `HMLR_BG_LIVE_ENABLED=true` in a controlled test environment only.
6. Run one known test title through availability → order → poll → retrieve.
7. Only after HMLR accreditation, point `HMLR_BG_ENV=production` / prod base URL.
