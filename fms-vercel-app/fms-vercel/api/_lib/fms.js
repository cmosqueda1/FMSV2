const BASE = 'https://fms.item.com';
const DEFAULT_COMPANY_ID = 'SBFH';
const FMS_CLIENT = 'FMS_WEB';
const SESSION_COOKIE = 'fms_session';
const SESSION_MAX_AGE = 60 * 60 * 2;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return raw.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function encodeSession(session) {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
}

function decodeSession(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function buildSessionCookie(session) {
  const encoded = encodeSession(session);
  return `${SESSION_COOKIE}=${encoded}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const session = decodeSession(cookies[SESSION_COOKIE]);
  if (!session) return null;
  if (!session.fmsToken || !session.authorization || !session.companyId) return null;
  return session;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function buildHeaders(session, includeJson = false) {
  const headers = {
    accept: 'application/json',
    'fms-client': FMS_CLIENT,
    'fms-token': session.fmsToken,
    authorization: session.authorization,
    'company-id': session.companyId || DEFAULT_COMPANY_ID
  };
  if (includeJson) headers['content-type'] = 'application/json';
  return headers;
}

async function fmsFetch(path, session, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`FMS request failed (${res.status})`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    json(res, 401, { ok: false, message: 'No active FMS session.' });
    return null;
  }
  return session;
}

module.exports = {
  BASE,
  DEFAULT_COMPANY_ID,
  FMS_CLIENT,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  json,
  parseCookies,
  encodeSession,
  decodeSession,
  buildSessionCookie,
  clearSessionCookie,
  getSession,
  readBody,
  buildHeaders,
  fmsFetch,
  requireSession
};
