const { json, getSession, buildHeaders, readBody, callFms } = require("./_shared");

const sectionMap = {
  billing: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/billing-information/getbillinginformationbyid?order_no=${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Billing failed (${response.status}): ${text}`);
    return jsonData?.data || null;
  },
  consignee: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/consignee/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Consignee failed (${response.status}): ${text}`);
    return jsonData?.data || null;
  },
  detail: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/order/get-order-detail?orderNo=${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Detail failed (${response.status}): ${text}`);
    const data = jsonData?.data || {};
    return {
      order_no: data.order_no || data.orderNo || "",
      pro_no: data.pro_no || data.tracking_no || "",
      status_text: data.status_text || data.status || "",
      assign_status_text: data.assign_status_text || "",
      org_terminal: data.org_terminal || "",
      dst_terminal: data.dst_terminal || "",
      carrier: data.carrier || "",
      pickup_date: data.pickup_date || "",
      delivery_date: data.delivery_date || "",
      raw: data
    };
  },
  files: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/files/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Files failed (${response.status}): ${text}`);
    return Array.isArray(jsonData?.data) ? jsonData.data : [];
  },
  estimate: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/estimate-freight/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Estimate failed (${response.status}): ${text}`);
    return jsonData?.data || null;
  },
  basic: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/shipper/getshipment-orderbasic/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Basic failed (${response.status}): ${text}`);
    return jsonData?.data || null;
  },
  history: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/shipment-order-history/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`History failed (${response.status}): ${text}`);
    return Array.isArray(jsonData?.data) ? jsonData.data : [];
  },
  tasks: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/order/get-order-tasks?orderNo=${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Tasks failed (${response.status}): ${text}`);
    const data = Array.isArray(jsonData?.data) ? jsonData.data : [];
    return data.map((t) => ({
      task_no: t.task_no ?? null,
      task_type: t.task_type ?? "",
      task_type_group: t.task_type_group ?? "",
      order_no: t.order_no ?? "",
      tracking_no: t.tracking_no ?? "",
      pu_no: t.pu_no ?? "",
      is_show: t.is_show !== false,
      order_shipper_address: t.order_shipper_address || null,
      order_consignee_address: t.order_consignee_address || null,
      raw: t
    }));
  },
  shipper: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/shipper/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Shipper failed (${response.status}): ${text}`);
    return jsonData?.data || null;
  },
  headinfo: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/shipper/getshipment-orderbasic-headinfo/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Head info failed (${response.status}): ${text}`);
    return jsonData?.data || null;
  },
  actualfreight: async (session, orderNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-order/actual-freight/${encodeURIComponent(orderNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Actual freight failed (${response.status}): ${text}`);
    return Array.isArray(jsonData?.data) ? jsonData.data : [];
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const session = getSession(req);
  if (!session) return json(res, 401, { ok: false, error: "No active session" });

  const body = await readBody(req);
  const orderNo = String(body.orderNo || "").trim();
  const sections = Array.isArray(body.sections) && body.sections.length ? body.sections : ["detail", "tasks", "files"];

  if (!orderNo) return json(res, 400, { ok: false, error: "orderNo is required" });

  try {
    const data = {};
    for (const section of sections) {
      if (!sectionMap[section]) continue;
      data[section] = await sectionMap[section](session, orderNo);
    }

    return json(res, 200, { ok: true, orderNo, sections, data });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Order request failed" });
  }
};
