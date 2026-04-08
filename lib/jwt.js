import { SignJWT, jwtVerify } from 'jose';

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
}

export async function signDealToken(dealId, ttlDays = 30) {
  return await new SignJWT({ dealId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlDays}d`)
    .setIssuer('posfin-deals')
    .sign(secret());
}

export async function verifyDealToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'posfin-deals' });
    return payload;
  } catch {
    return null;
  }
}

export function buildMagicLink(dealId, token) {
  const base = process.env.LINK_BASE_URL || 'https://deals.posfincapital.com';
  return `${base}/d/${encodeURIComponent(dealId)}?t=${encodeURIComponent(token)}`;
}
