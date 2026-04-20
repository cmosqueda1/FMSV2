const BASE = "https://fms.item.com";
const FMS_CLIENT = "FMS_WEB";
const COMPANY_ID = "SBFH";
const COOKIE_NAME = "fms_session";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(
    raw.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const idx = part.indexOf("=");
      return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
    })
  );
}

function serializeCookie(name, value, req, maxAge = 60 * 60 * 8) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearCookie(name, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!decoded?.fmsToken || !decoded?.authorization) return null;
    return decoded;
  } catch {
    return null;
  }
}

function saveSession(res, req, session) {
  const encoded = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, encoded, req));
}

function removeSession(res, req) {
  res.setHeader("Set-Cookie", clearCookie(COOKIE_NAME, req));
}

function buildHeaders(session, includeJson = false) {
  const headers = {
    accept: "application/json",
    "fms-client": FMS_CLIENT,
    "fms-token": session.fmsToken,
    authorization: session.authorization,
    "company-id": session.companyId || COMPANY_ID
  };
  if (includeJson) headers["content-type"] = "application/json";
  return headers;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function callFms(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let jsonData = null;
  try {
    jsonData = text ? JSON.parse(text) : null;
  } catch {
    jsonData = null;
  }
  return { response, text, jsonData };
}

module.exports = {
  BASE,
  COMPANY_ID,
  FMS_CLIENT,
  COOKIE_NAME,
  json,
  getSession,
  saveSession,
  removeSession,
  buildHeaders,
  readBody,
  callFms
};
