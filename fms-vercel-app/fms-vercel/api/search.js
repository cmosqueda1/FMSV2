const { json, readBody, requireSession, buildHeaders } = require('./_lib/fms');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const body = await readBody(req);
    const keyword = String(body.keyword || '').trim().toUpperCase();
    if (!keyword) return json(res, 400, { ok: false, message: 'Keyword is required.' });

    const upstream = await fetch(`https://fms.item.com/fms-platform-dispatch-management/search-all?Keyword=${encodeURIComponent(keyword)}`, {
      method: 'GET',
      headers: buildHeaders(session)
    });

    const raw = await upstream.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
    if (!upstream.ok) return json(res, upstream.status, { ok: false, message: 'Search failed.', upstream: payload });

    const data = payload?.data || {};
    const summary = Array.isArray(data.summary) ? data.summary : [];
    const trips = Array.isArray(data.trips) ? data.trips : [];
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const linehauls = Array.isArray(data.lhs) ? data.lhs : [];

    let resolved = { type: 'UNSUPPORTED', keyword, reason: 'No supported match' };
    if (summary.length === 1 && summary[0].category === 'order') {
      resolved = { type: 'ORDER', orderNo: summary[0].number, proNo: summary[0].pro_no || null };
    } else if (summary.length === 1 && summary[0].category === 'lh') {
      resolved = { type: 'LINEHAUL', lhNo: Number(summary[0].number), proNo: summary[0].pro_no || null };
    } else if (summary.length === 0 && trips.length === 1 && String(trips[0].trip_no).toUpperCase() === keyword) {
      resolved = { type: 'TRIP', tripNo: trips[0].trip_no };
    }

    return json(res, 200, {
      ok: true,
      keyword,
      resolved,
      data: { summary, orders, trips, linehauls }
    });
  } catch (error) {
    return json(res, 500, { ok: false, message: error.message });
  }
};
