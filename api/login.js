const { json, saveSession, readBody, callFms, COMPANY_ID, FMS_CLIENT } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const body = await readBody(req);
  const account = String(body.account || "").trim();
  const password = String(body.password || "");

  if (!account || !password) {
    return json(res, 400, { ok: false, error: "Account and password are required" });
  }

  try {
    const { response, jsonData, text } = await callFms("/fms-platform-user/Auth/Login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fms-client": FMS_CLIENT
      },
      body: JSON.stringify({ account, password })
    });

    if (!response.ok) {
      return json(res, response.status, {
        ok: false,
        error: jsonData?.msg || jsonData?.message || `Login failed (${response.status})`,
        raw: jsonData || text
      });
    }

    const data = jsonData?.data || {};
    if (!data.token || !data.third_party_token) {
      return json(res, 500, { ok: false, error: "Login did not return required tokens" });
    }

    const session = {
      account,
      fmsToken: data.token,
      authorization: data.third_party_token,
      companyId: COMPANY_ID
    };

    saveSession(res, req, session);
    return json(res, 200, {
      ok: true,
      session: {
        loggedIn: true,
        account,
        companyId: COMPANY_ID
      }
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Unexpected login failure" });
  }
};
