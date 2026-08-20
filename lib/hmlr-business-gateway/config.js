import fs from 'node:fs';

const DEFAULT_TEST_BASE_URL = 'https://bgtest.landregistry.gov.uk';
const DEFAULT_PROD_BASE_URL = 'https://businessgateway.landregistry.gov.uk';

export const HMLR_ENVIRONMENTS = Object.freeze({
  test: DEFAULT_TEST_BASE_URL,
  production: DEFAULT_PROD_BASE_URL,
});

function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required HMLR env var: ${name}`);
  return value;
}

function optionalFile(path, label) {
  if (!path) return undefined;
  if (!fs.existsSync(path)) throw new Error(`${label} not found at configured path: ${path}`);
  return fs.readFileSync(path);
}

export function getHmlrConfig(overrides = {}) {
  const environment = overrides.environment || process.env.HMLR_BG_ENV || 'test';
  const liveEnabled = overrides.liveEnabled ?? boolEnv('HMLR_BG_LIVE_ENABLED', false);
  const baseUrl = overrides.baseUrl || process.env.HMLR_BG_BASE_URL || HMLR_ENVIRONMENTS[environment] || DEFAULT_TEST_BASE_URL;

  const authorisedUserId = overrides.authorisedUserId || process.env.HMLR_BG_AUTHORISED_USER_ID || 'BHILL3122';
  const authorisedUserPassword = overrides.authorisedUserPassword || process.env.HMLR_BG_AUTHORISED_USER_PASSWORD;
  // VDD key is non-secret billing configuration supplied by HMLR/Posfin.
  // Keep it configurable so cert/accreditation changes do not require code changes.
  const vddKey = overrides.vddKey || process.env.HMLR_BG_VDD_KEY || '9674086';
  const expectedPriceAmount = overrides.expectedPriceAmount || process.env.HMLR_BG_EXPECTED_PRICE_AMOUNT || '10';
  const contactName = overrides.contactName || process.env.HMLR_BG_CONTACT_NAME || 'Posfin Capital';
  const contactTelephone = overrides.contactTelephone || process.env.HMLR_BG_CONTACT_TELEPHONE || '02039514283';

  const certPath = overrides.certPath || process.env.HMLR_BG_CLIENT_CERT_PATH;
  const keyPath = overrides.keyPath || process.env.HMLR_BG_CLIENT_KEY_PATH;
  const pfxPath = overrides.pfxPath || process.env.HMLR_BG_CLIENT_PFX_PATH;
  const passphrase = overrides.passphrase || process.env.HMLR_BG_CLIENT_CERT_PASSPHRASE;

  return {
    environment,
    liveEnabled,
    baseUrl,
    authorisedUserId,
    authorisedUserPassword,
    vddKey,
    expectedPriceAmount,
    contactName,
    contactTelephone,
    certPath,
    keyPath,
    pfxPath,
    passphrase,
    endpoints: {
      availabilityPath: overrides.availabilityPath || process.env.HMLR_BG_AVAILABILITY_PATH || '/bg2test/api/v2/titles/{titleNumber}/official-copies/availability',
      officialCopySoapPath: overrides.officialCopySoapPath || process.env.HMLR_BG_OFFICIAL_COPY_SOAP_PATH || '/bg2/soap/official-copy-title-known',
      pollPath: overrides.pollPath || process.env.HMLR_BG_POLL_PATH || '/bg2/soap/official-copy-title-known/status',
      retrievePath: overrides.retrievePath || process.env.HMLR_BG_RETRIEVE_PATH || '/bg2/soap/official-copy-title-known/document',
    },
  };
}

export function assertHmlrRuntimeReady(config) {
  if (!config.liveEnabled) return;
  if (!config.authorisedUserPassword) throw new Error('HMLR live mode requires HMLR_BG_AUTHORISED_USER_PASSWORD');
  if (!config.vddKey) throw new Error('HMLR live mode requires HMLR_BG_VDD_KEY');
  if (!config.pfxPath && !(config.certPath && config.keyPath)) {
    throw new Error('HMLR live mode requires either HMLR_BG_CLIENT_PFX_PATH or both HMLR_BG_CLIENT_CERT_PATH and HMLR_BG_CLIENT_KEY_PATH');
  }
}

export function buildMutualTlsAgentOptions(config) {
  const options = {};
  if (config.pfxPath) {
    options.pfx = optionalFile(config.pfxPath, 'HMLR client PFX');
  } else {
    options.cert = optionalFile(config.certPath, 'HMLR client certificate');
    options.key = optionalFile(config.keyPath, 'HMLR client key');
  }
  if (config.passphrase) options.passphrase = config.passphrase;
  return options;
}

export function redactedConfig(config) {
  return {
    environment: config.environment,
    liveEnabled: config.liveEnabled,
    baseUrl: config.baseUrl,
    authorisedUserId: config.authorisedUserId,
    authorisedUserPassword: config.authorisedUserPassword ? '[set]' : '[missing]',
    vddKey: config.vddKey ? '[set]' : '[missing]',
    certPath: config.certPath ? '[set]' : '[missing]',
    keyPath: config.keyPath ? '[set]' : '[missing]',
    pfxPath: config.pfxPath ? '[set]' : '[missing]',
    expectedPriceAmount: config.expectedPriceAmount,
    contactName: config.contactName,
    contactTelephone: config.contactTelephone,
    endpoints: config.endpoints,
  };
}
