// Small helpers shared by the API route handlers
export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

// In-memory limiter for sign-in, sign-up and public forms: `max` attempts per `windowMs` per key
const hits = globalThis.__fpRateHits || (globalThis.__fpRateHits = new Map());
export const rateLimited = (key, max = 10, windowMs = 10 * 60 * 1000) => {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
};

export const clientIp = (request) =>
  (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';

// Trimmed string, cut to `max` characters
export const text = (value, max = 120) => String(value ?? '').trim().slice(0, max);
