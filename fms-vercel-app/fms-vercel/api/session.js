const { json, getSession } = require('./_lib/fms');

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) return json(res, 200, { ok: true, authenticated: false });
  return json(res, 200, {
    ok: true,
    authenticated: true,
    companyId: session.companyId,
    account: session.account || 'Active User',
    expiresIn: session.expiresIn || 7200
  });
};
