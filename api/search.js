const { json, getSession, buildHeaders, readBody, callFms } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const session = getSession(req);
  if (!session) return json(res, 401, { ok: false, error: "No active session" });

  const body = await readBody(req);
  const keyword = String(body.keyword || "").trim().toUpperCase();

  if (!keyword) return json(res, 400, { ok: false, error: "Keyword is required" });

  try {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/search-all?Keyword=${encodeURIComponent(keyword)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });

    if (!response.ok) {
      return json(res, response.status, { ok: false, error: `Search failed (${response.status})`, raw: jsonData || text });
    }

    const data = jsonData?.data || {};
    const summary = Array.isArray(data.summary) ? data.summary : [];
    const trips = Array.isArray(data.trips) ? data.trips : [];
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const lhs = Array.isArray(data.lhs) ? data.lhs : [];

    let resolved = {
      type: "UNSUPPORTED",
      keyword,
      reason: "Search result did not match ORDER, LINEHAUL, or TRIP rules",
      orderNo: null,
      tripNo: null,
      lhNo: null,
      orders,
      trips,
      linehauls: lhs
    };

    if (summary.length === 1 && summary[0].category === "order") {
      resolved = {
        type: "ORDER",
        keyword,
        orderNo: summary[0].number,
        proNo: summary[0].pro_no || null,
        orders,
        trips: [],
        linehauls: []
      };
    } else if (summary.length === 1 && summary[0].category === "lh") {
      resolved = {
        type: "LINEHAUL",
        keyword,
        lhNo: Number(summary[0].number),
        proNo: summary[0].pro_no || null,
        orders: [],
        trips: [],
        linehauls: lhs
      };
    } else if (summary.length === 0 && trips.length === 1 && trips[0].trip_no === keyword) {
      resolved = {
        type: "TRIP",
        keyword,
        tripNo: trips[0].trip_no,
        orders: [],
        trips,
        linehauls: []
      };
    }

    return json(res, 200, { ok: true, data: resolved, raw: jsonData });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Search failed" });
  }
};
