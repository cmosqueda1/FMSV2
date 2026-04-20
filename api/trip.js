const { json, getSession, buildHeaders, readBody, callFms } = require("./_shared");

const sectionMap = {
  detail: async (session, tripNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/TripDetail/GetTrip?tripNo=${encodeURIComponent(tripNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Trip detail failed (${response.status}): ${text}`);
    return jsonData?.data || {};
  },
  files: async (session, tripNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/Trips/GetFileInfoByTripId`, {
      method: "POST",
      headers: buildHeaders(session, true),
      body: JSON.stringify({ trip_no: tripNo })
    });
    if (!response.ok) throw new Error(`Trip files failed (${response.status}): ${text}`);
    return jsonData?.data?.files || [];
  },
  history: async (session, tripNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/Trips/GetTripHistory?tripNo=${encodeURIComponent(tripNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Trip history failed (${response.status}): ${text}`);
    return jsonData?.data?.trip_history_list || [];
  },
  stops: async (session, tripNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/TripDetail/GetStopList?tripNo=${encodeURIComponent(tripNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Trip stops failed (${response.status}): ${text}`);
    return jsonData?.data?.stop_list || [];
  },
  tasks: async (session, tripNo) => {
    const { response, jsonData, text } = await callFms(`/fms-platform-dispatch-management/TripDetail/GetTaskList?tripNo=${encodeURIComponent(tripNo)}`, {
      method: "GET",
      headers: buildHeaders(session)
    });
    if (!response.ok) throw new Error(`Trip tasks failed (${response.status}): ${text}`);
    return Array.isArray(jsonData?.data) ? jsonData.data : [];
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const session = getSession(req);
  if (!session) return json(res, 401, { ok: false, error: "No active session" });

  const body = await readBody(req);
  const tripNo = String(body.tripNo || "").trim();
  const sections = Array.isArray(body.sections) && body.sections.length ? body.sections : ["detail", "files", "tasks"];

  if (!tripNo) return json(res, 400, { ok: false, error: "tripNo is required" });

  try {
    const data = {};
    for (const section of sections) {
      if (!sectionMap[section]) continue;
      data[section] = await sectionMap[section](session, tripNo);
    }

    return json(res, 200, { ok: true, tripNo, sections, data });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Trip request failed" });
  }
};
