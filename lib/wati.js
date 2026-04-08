// Minimal WATI client for document + template message sending.
// See Posfin memory: Tenant 10104554, endpoint https://live-mt-server.wati.io/10104554

const BASE = process.env.WATI_ENDPOINT || 'https://live-mt-server.wati.io/10104554';
const TOKEN = process.env.WATI_BEARER_TOKEN || '';

function headers() {
  return {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/json',
  };
}

export async function sendDocument(phoneE164, filePath, caption = '') {
  const { default: fetch, FormData, fileFromSync } = await import('node-fetch');
  const form = new FormData();
  form.set('file', fileFromSync(filePath));
  if (caption) form.set('caption', caption);
  const url = `${BASE}/api/v1/sendSessionFile/${encodeURIComponent(phoneE164)}`;
  const res = await fetch(url, { method: 'POST', headers: headers(), body: form });
  if (!res.ok) throw new Error(`WATI sendDocument failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function sendText(phoneE164, message) {
  const { default: fetch } = await import('node-fetch');
  const url = `${BASE}/api/v1/sendSessionMessage/${encodeURIComponent(phoneE164)}?messageText=${encodeURIComponent(message)}`;
  const res = await fetch(url, { method: 'POST', headers: headers() });
  if (!res.ok) throw new Error(`WATI sendText failed: ${res.status} ${await res.text()}`);
  return res.json();
}
