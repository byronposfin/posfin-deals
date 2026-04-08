import { google } from 'googleapis';

// Canonical column order for the Deals tab. Extend as needed.
// Add these columns to the Master Sheet if they don't already exist.
export const DEAL_COLUMNS = [
  'deal_id',            // A - unique, e.g. POS-2026-0001
  'created_at',         // B - ISO date
  'borrower_name',      // C
  'borrower_phone',     // D - E.164, for WATI delivery
  'borrower_email',     // E
  'property_address',   // F
  'property_type',      // G
  'property_value',     // H - number (GBP)
  'loan_amount',        // I - number (GBP)
  'loan_term_months',   // J - number
  'loan_purpose',       // K
  'rate_indication',    // L - e.g. "0.85% pm"
  'stage',              // M - one of: application | offer | legal | completion
  'next_action',        // N - short sentence
  'next_action_owner',  // O - borrower | posfin
  'tasks_json',         // P - JSON array of tasks
  'updated_at',         // Q - ISO timestamp, auto
  'assigned_broker',    // R - byron | chris
  'lender',             // S - e.g. Somo, MT Finance
  'notes_internal',     // T - not shown to borrower
];

function authClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT(email, undefined, key, [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);
}

export async function getSheets() {
  const auth = authClient();
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

function rowToDeal(row) {
  const obj = {};
  DEAL_COLUMNS.forEach((col, i) => { obj[col] = row[i] ?? ''; });
  // Coerce types
  obj.property_value = Number(obj.property_value) || 0;
  obj.loan_amount = Number(obj.loan_amount) || 0;
  obj.loan_term_months = Number(obj.loan_term_months) || 0;
  obj.ltv = obj.property_value > 0 ? Math.round((obj.loan_amount / obj.property_value) * 1000) / 10 : 0;
  try { obj.tasks = JSON.parse(obj.tasks_json || '[]'); } catch { obj.tasks = []; }
  return obj;
}

export async function getDealById(dealId) {
  const sheets = await getSheets();
  const tab = process.env.DEALS_TAB_NAME || 'Deals';
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.MASTER_SHEET_ID,
    range: `${tab}!A2:T10000`,
  });
  const rows = res.data.values || [];
  const row = rows.find(r => (r[0] || '').trim() === dealId.trim());
  if (!row) return null;
  return rowToDeal(row);
}

export function sanitiseForBorrower(deal) {
  if (!deal) return null;
  // Strip internal fields before sending to client
  const { notes_internal, assigned_broker, ...safe } = deal;
  return safe;
}
