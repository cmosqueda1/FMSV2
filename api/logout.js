const { json, removeSession } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });
  removeSession(res, req);
  return json(res, 200, { ok: true });
};
