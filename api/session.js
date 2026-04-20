const { json, getSession } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { loggedIn: false, error: "Method not allowed" });

  const session = getSession(req);
  if (!session) return json(res, 200, { loggedIn: false });

  return json(res, 200, {
    loggedIn: true,
    account: session.account,
    companyId: session.companyId
  });
};
