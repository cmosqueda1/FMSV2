const { json, readBody, requireSession, buildHeaders } = require('./_lib/fms');

const actions = {
  billing: { method: 'GET', path: (orderNo) => `/fms-platform-order/billing-information/getbillinginformationbyid?order_no=${encodeURIComponent(orderNo)}` },
  consignee: { method: 'GET', path: (orderNo) => `/fms-platform-order/consignee/${encodeURIComponent(orderNo)}` },
  detail: { method: 'GET', path: (orderNo) => `/fms-platform-dispatch-management/order/get-order-detail?orderNo=${encodeURIComponent(orderNo)}` },
  files: { method: 'GET', path: (orderNo) => `/fms-platform-order/files/${encodeURIComponent(orderNo)}` },
  estimate: { method: 'GET', path: (orderNo) => `/fms-platform-order/estimate-freight/${encodeURIComponent(orderNo)}` },
  basic: { method: 'GET', path: (orderNo) => `/fms-platform-order/shipper/getshipment-orderbasic/${encodeURIComponent(orderNo)}` },
  history: { method: 'GET', path: (orderNo) => `/fms-platform-order/shipment-order-history/${encodeURIComponent(orderNo)}` },
  actual: { method: 'GET', path: (orderNo) => `/fms-platform-order/actual-freight/${encodeURIComponent(orderNo)}` },
  shipper: { method: 'GET', path: (orderNo) => `/fms-platform-order/shipper/${encodeURIComponent(orderNo)}` },
  status: { method: 'GET', path: (orderNo) => `/fms-platform-order/shipper/getshipment-orderbasic-headinfo/${encodeURIComponent(orderNo)}` },
  tasks: { method: 'GET', path: (orderNo) => `/fms-platform-dispatch-management/order/get-order-tasks?orderNo=${encodeURIComponent(orderNo)}` }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const body = await readBody(req);
    const action = String(body.action || '').trim().toLowerCase();
    const orderNo = String(body.orderNo || '').trim();
    if (!action || !actions[action]) return json(res, 400, { ok: false, message: 'Unsupported order action.' });
    if (!orderNo) return json(res, 400, { ok: false, message: 'Order number is required.' });

    const route = actions[action];
    const upstream = await fetch(`https://fms.item.com${route.path(orderNo)}`, {
      method: route.method,
      headers: buildHeaders(session)
    });

    const raw = await upstream.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
    if (!upstream.ok) return json(res, upstream.status, { ok: false, message: `Order ${action} failed.`, upstream: payload });

    return json(res, 200, {
      ok: true,
      group: 'order',
      action,
      orderNo,
      data: payload?.data ?? null,
      upstream: payload
    });
  } catch (error) {
    return json(res, 500, { ok: false, message: error.message });
  }
};
