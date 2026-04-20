const {
  DEFAULT_COMPANY_ID,
  FMS_CLIENT,
  json,
  readBody,
  buildSessionCookie
} = require('./_lib/fms');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed' });

  try {
    const body = await readBody(req);
    const account = String(body.account || '').trim();
    const password = String(body.password || '').trim();
    const companyId = String(body.companyId || DEFAULT_COMPANY_ID).trim() || DEFAULT_COMPANY_ID;

    if (!account || !password) {
      return json(res, 400, { ok: false, message: 'Account and password are required.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let upstream;
    try {
      upstream = await fetch('https://fms.item.com/fms-platform-user/Auth/Login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'fms-client': FMS_CLIENT
        },
        body: JSON.stringify({ account, password }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const raw = await upstream.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }

    if (!upstream.ok) {
      return json(res, upstream.status, {
        ok: false,
        message: payload?.message || payload?.msg || 'Login failed.',
        upstream: payload
      });
    }

    const data = payload?.data || {};
    if (!data.token || !data.third_party_token) {
      return json(res, 502, { ok: false, message: 'Login succeeded but expected tokens were missing.', upstream: payload });
    }

    const session = {
      fmsToken: data.token,
      authorization: data.third_party_token,
      companyId,
      account,
      createdAt: Date.now(),
      expiresIn: 7200
    };

    res.setHeader('Set-Cookie', buildSessionCookie(session));
    return json(res, 200, {
      ok: true,
      account,
      companyId,
      expiresIn: 7200,
      redirect: '/index.html'
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      message: error.name === 'AbortError' ? 'Login request timed out.' : error.message
    });
  }
};
