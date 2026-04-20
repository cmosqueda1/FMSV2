const { json, removeSession, getSession, buildHeaders, callFms } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  const session = getSession(req);

  try {
    if (session?.fmsToken && session?.authorization) {
      await callFms("/fms-platform-user/Auth/Logout", {
        method: "GET",
        headers: buildHeaders(session)
      });
    }
  } catch (error) {
    console.error("FMS logout failed:", error?.message || error);
  }

  removeSession(res, req);
  return json(res, 200, { ok: true });
};
