const { json, readBody, requireSession, buildHeaders } = require('./_lib/fms');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const body = await readBody(req);
    const linehaulNos = Array.isArray(body.linehaulNos)
      ? body.linehaulNos.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
      : String(body.linehaulNos || '')
          .split(',')
          .map((n) => Number(String(n).trim()))
          .filter((n) => Number.isFinite(n) && n > 0);

    if (!linehaulNos.length) return json(res, 400, { ok: false, message: 'At least one valid linehaul number is required.' });

    const upstream = await fetch('https://fms.item.com/fms-platform-dispatch-management/route-engine-dispatch/linehaul/get-linehaul', {
      method: 'POST',
      headers: buildHeaders(session, true),
      body: JSON.stringify({ linehaul_no: linehaulNos })
    });

    const raw = await upstream.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
    if (!upstream.ok) return json(res, upstream.status, { ok: false, message: 'Linehaul lookup failed.', upstream: payload });

    return json(res, 200, {
      ok: true,
      group: 'linehaul',
      action: 'lookup',
      linehaulNos,
      data: payload?.data ?? [],
      upstream: payload
    });
  } catch (error) {
    return json(res, 500, { ok: false, message: error.message });
  }
};
