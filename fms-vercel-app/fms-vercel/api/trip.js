const { json, readBody, requireSession, buildHeaders } = require('./_lib/fms');

const actions = {
  detail: {
    method: 'GET',
    path: (tripNo) => `/fms-platform-dispatch-management/TripDetail/GetTrip?tripNo=${encodeURIComponent(tripNo)}`
  },
  files: {
    method: 'POST',
    path: () => `/fms-platform-dispatch-management/Trips/GetFileInfoByTripId`,
    body: (tripNo) => JSON.stringify({ trip_no: tripNo })
  },
  history: {
    method: 'GET',
    path: (tripNo) => `/fms-platform-dispatch-management/Trips/GetTripHistory?tripNo=${encodeURIComponent(tripNo)}`
  },
  stops: {
    method: 'GET',
    path: (tripNo) => `/fms-platform-dispatch-management/TripDetail/GetStopList?tripNo=${encodeURIComponent(tripNo)}`
  },
  tasks: {
    method: 'GET',
    path: (tripNo) => `/fms-platform-dispatch-management/TripDetail/GetTaskList?tripNo=${encodeURIComponent(tripNo)}`
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const body = await readBody(req);
    const action = String(body.action || '').trim().toLowerCase();
    const tripNo = String(body.tripNo || '').trim();
    if (!action || !actions[action]) return json(res, 400, { ok: false, message: 'Unsupported trip action.' });
    if (!tripNo) return json(res, 400, { ok: false, message: 'Trip number is required.' });

    const route = actions[action];
    const headers = buildHeaders(session, route.method === 'POST');
    const upstream = await fetch(`https://fms.item.com${route.path(tripNo)}`, {
      method: route.method,
      headers,
      body: route.body ? route.body(tripNo) : undefined
    });

    const raw = await upstream.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
    if (!upstream.ok) return json(res, upstream.status, { ok: false, message: `Trip ${action} failed.`, upstream: payload });

    return json(res, 200, {
      ok: true,
      group: 'trip',
      action,
      tripNo,
      data: payload?.data ?? null,
      upstream: payload
    });
  } catch (error) {
    return json(res, 500, { ok: false, message: error.message });
  }
};
