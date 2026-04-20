const { json, clearSessionCookie } = require('./_lib/fms');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return json(res, 200, { ok: true });
};
