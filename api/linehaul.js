const { json, getSession, buildHeaders, readBody, callFms } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const session = getSession(req);
  if (!session) return json(res, 401, { ok: false, error: "No active session" });

  const body = await readBody(req);
  const linehaulNos = Array.isArray(body.linehaulNos) ? body.linehaulNos.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0) : [];

  if (!linehaulNos.length) return json(res, 400, { ok: false, error: "At least one linehaul number is required" });

  try {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/route-engine-dispatch/linehaul/get-linehaul`, {
      method: "POST",
      headers: buildHeaders(session, true),
      body: JSON.stringify({ linehaul_no: linehaulNos })
    });

    if (!response.ok) {
      return json(res, response.status, { ok: false, error: `Linehaul request failed (${response.status})`, raw: jsonData || text });
    }

    return json(res, 200, { ok: true, requested: linehaulNos, data: jsonData?.data || [] });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Linehaul request failed" });
  }
};
