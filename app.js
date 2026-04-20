const state = {
  session: null,
  currentView: "home",
  context: {
    type: null,
    orderNo: "",
    tripNo: "",
    lhNo: ""
  },
  latestResults: {},
  orderSections: new Set(["billing", "detail", "files"]),
  tripSections: new Set(["detail", "files"])
};

const views = {
  home: document.getElementById("homeView"),
  orders: document.getElementById("ordersView"),
  trips: document.getElementById("tripsView"),
  linehaul: document.getElementById("linehaulView"),
  results: document.getElementById("resultsView")
};

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginMessage = document.getElementById("loginMessage");
const resolveMessage = document.getElementById("resolveMessage");
const resultsCode = document.getElementById("resultsCode");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  await hydrateSession();
}

function bindEvents() {
  document.getElementById("loginForm")?.addEventListener("submit", onLogin);
  document.getElementById("resolveBtn")?.addEventListener("click", resolveKeyword);
  document.getElementById("runOrderBtn")?.addEventListener("click", runOrderLoad);
  document.getElementById("runTripBtn")?.addEventListener("click", runTripLoad);
  document.getElementById("runLinehaulBtn")?.addEventListener("click", runLinehaulLoad);
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.getElementById("clearResultsBtn")?.addEventListener("click", clearResults);

  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", () => setView(el.dataset.view));
  });

  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => setView(el.dataset.jump));
  });

  document.querySelectorAll("#orderChips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      const section = chip.dataset.section;
      if (state.orderSections.has(section)) state.orderSections.delete(section);
      else state.orderSections.add(section);
      rerenderOrderView();
    });
  });

  document.querySelectorAll("#tripChips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      const section = chip.dataset.section;
      if (state.tripSections.has(section)) state.tripSections.delete(section);
      else state.tripSections.add(section);
      rerenderTripView();
    });
  });

  document.querySelectorAll("[data-order-chip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setView("orders");
      const section = btn.dataset.orderChip;
      const target = document.querySelector(`#orderChips .chip[data-section="${section}"]`);
      if (target && !target.classList.contains("active")) target.click();
      target?.scrollIntoView({ block: "nearest", inline: "center" });
    });
  });
}

async function hydrateSession() {
  try {
    const res = await fetch("/api/session", { credentials: "include" });
    const json = await res.json();

    if (json?.loggedIn) {
      state.session = json;
      showApp();
      document.getElementById("sessionLabel").textContent = json.account || "Admin User";
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showApp() {
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  setView(state.currentView);
}

async function onLogin(event) {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";
  loginMessage.className = "form-message";

  const account = document.getElementById("accountInput").value.trim();
  const password = document.getElementById("passwordInput").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ account, password })
    });

    const json = await res.json();

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Login failed");
    }

    loginMessage.textContent = "Login successful. Loading dashboard...";
    loginMessage.className = "form-message success";
    state.session = json.session || { loggedIn: true, account };
    document.getElementById("sessionLabel").textContent = account;
    showApp();
  } catch (err) {
    loginMessage.textContent = err.message || "Login failed";
    loginMessage.className = "form-message error";
  }
}

async function logout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging Out...";
  }

  try {
    const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || "Logout failed");
    }
  } catch (err) {
    console.error(err);
  } finally {
    state.session = null;
    state.context = { type: null, orderNo: "", tripNo: "", lhNo: "" };
    state.latestResults = {};
    clearResults();
    showLogin();
    if (logoutBtn) {
      logoutBtn.disabled = false;
      logoutBtn.textContent = "Log Out";
    }
  }
}

function setView(view) {
  state.currentView = view;
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle("active", key === view);
  });

  document.querySelectorAll(".nav-item[data-view], .mini-tab[data-view]").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === view);
  });
}

async function resolveKeyword() {
  const keyword = document.getElementById("globalKeyword").value.trim();
  if (!keyword) {
    setMessage(resolveMessage, "Enter a keyword first.", true);
    return;
  }

  setMessage(resolveMessage, "Resolving keyword...");
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ keyword })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Resolve failed");

    state.latestResults.search = json;
    writeResults(json);

    const type = json?.data?.type || "UNSUPPORTED";
    state.context.type = type;
    state.context.orderNo = json?.data?.orderNo || "";
    state.context.tripNo = json?.data?.tripNo || "";
    state.context.lhNo = json?.data?.lhNo || "";

    document.getElementById("homeResolvedType").textContent = type;
    document.getElementById("homeOrderNo").textContent = state.context.orderNo || "—";
    document.getElementById("homeTripNo").textContent = state.context.tripNo || "—";
    document.getElementById("homeLhNo").textContent = state.context.lhNo || "—";

    if (state.context.orderNo) document.getElementById("orderInput").value = state.context.orderNo;
    if (state.context.tripNo) document.getElementById("tripInput").value = state.context.tripNo;
    if (state.context.lhNo) document.getElementById("linehaulInput").value = state.context.lhNo;

    if (type === "ORDER") setView("orders");
    else if (type === "TRIP") setView("trips");
    else if (type === "LINEHAUL") setView("linehaul");
    else setView("results");

    setMessage(resolveMessage, `Resolved as ${type}.`);
  } catch (err) {
    setMessage(resolveMessage, err.message || "Resolve failed", true);
  }
}

async function runOrderLoad() {
  const orderNo = document.getElementById("orderInput").value.trim() || state.context.orderNo;
  if (!orderNo) return renderEmpty("orderTableWrap", "Enter or resolve an order first.");

  const sections = Array.from(state.orderSections);
  document.getElementById("orderSummaryLabel").textContent = orderNo;
  document.getElementById("orderTableLabel").textContent = "Loading order data...";

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderNo, sections })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Order load failed");

    state.context.orderNo = orderNo;
    state.latestResults.order = json;
    writeResults(json);
    rerenderOrderView();
  } catch (err) {
    renderEmpty("orderTableWrap", err.message || "Order load failed");
  }
}

async function runTripLoad() {
  const tripNo = document.getElementById("tripInput").value.trim() || state.context.tripNo;
  if (!tripNo) return renderEmpty("tripTableWrap", "Enter or resolve a trip first.");

  const sections = Array.from(state.tripSections);
  document.getElementById("tripSummaryLabel").textContent = tripNo;
  document.getElementById("tripTableLabel").textContent = "Loading trip data...";

  try {
    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tripNo, sections })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Trip load failed");

    state.context.tripNo = tripNo;
    state.latestResults.trip = json;
    writeResults(json);
    rerenderTripView();
  } catch (err) {
    renderEmpty("tripTableWrap", err.message || "Trip load failed");
  }
}

async function runLinehaulLoad() {
  const value = document.getElementById("linehaulInput").value.trim() || `${state.context.lhNo || ""}`.trim();
  if (!value) return renderEmpty("linehaulTableWrap", "Enter or resolve a linehaul number first.");

  const linehaulNos = value.split(",").map((v) => Number(String(v).trim())).filter((n) => Number.isFinite(n) && n > 0);
  document.getElementById("linehaulSummaryLabel").textContent = linehaulNos.join(", ");

  try {
    const res = await fetch("/api/linehaul", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ linehaulNos })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Linehaul load failed");

    state.latestResults.linehaul = json;
    writeResults(json);
    renderLinehaulSummary(json.data || [], linehaulNos);
    renderLinehaulTable(json.data || []);
    document.getElementById("linehaulTableLabel").textContent = `${(json.data || []).length} row(s) returned`;
  } catch (err) {
    renderEmpty("linehaulTableWrap", err.message || "Linehaul load failed");
  }
}

function rerenderOrderView() {
  const json = state.latestResults.order;
  const sections = Array.from(state.orderSections);
  const data = (json && json.data) || {};
  document.getElementById("orderSectionsCount").textContent = sections.length;
  document.getElementById("orderTableLabel").textContent = sections.length
    ? `${sections.length} selected section(s)`
    : "No sections selected";

  if (!json) {
    renderEmpty("orderTableWrap", sections.length
      ? "Click Load Order Data to fetch the selected sections."
      : "Select at least one section.");
    return;
  }

  renderOrderSummary(data, state.context.orderNo || json.orderNo, sections);
  renderSectionTiles("orderSectionCards", filterDataBySections(data, sections));
  renderOrderTable(data, sections);
}

function rerenderTripView() {
  const json = state.latestResults.trip;
  const sections = Array.from(state.tripSections);
  const data = (json && json.data) || {};
  document.getElementById("tripSectionsCount").textContent = sections.length;
  document.getElementById("tripTableLabel").textContent = sections.length
    ? `${sections.length} selected section(s)`
    : "No sections selected";

  if (!json) {
    renderEmpty("tripTableWrap", sections.length
      ? "Click Load Trip Data to fetch the selected sections."
      : "Select at least one section.");
    return;
  }

  renderTripSummary(data, state.context.tripNo || json.tripNo, sections);
  renderSectionTiles("tripSectionCards", filterDataBySections(data, sections));
  renderTripTable(data, sections);
}

function filterDataBySections(data, sections) {
  const allowed = new Set(sections);
  return Object.fromEntries(Object.entries(data || {}).filter(([key]) => allowed.has(key)));
}

function pickStatusText(obj) {
  if (!obj || typeof obj !== "object") return "—";
  return (
    obj.status_text ||
    obj.trip_status_text ||
    obj.assign_status_text ||
    obj.stop_status_text ||
    obj.task_status_text ||
    obj.linehaul_status_text ||
    obj.optimize_status_text ||
    obj.cost_status_text ||
    obj.status ||
    obj.trip_status ||
    obj.assign_status ||
    obj.stop_status ||
    obj.task_status ||
    obj.linehaul_status ||
    obj.optimize_status ||
    obj.cost_status ||
    "—"
  );
}

function renderOrderSummary(data, orderNo, sections) {
  const detail = data.detail || {};
  const headinfo = data.headinfo || {};
  const shipper = data.shipper || {};
  const consignee = data.consignee || {};

  const summary = [
    ["Order No", detail.order_no || headinfo.order_no || orderNo],
    ["PRO No", detail.pro_no || headinfo.pro_no || "—"],
    ["Status", detail.status_text || headinfo.status_text || headinfo.status || "—"],
    ["Assign Status", detail.assign_status_text || headinfo.assign_status_text || "—"],
    ["ORG", detail.org_terminal || shipper.location_name || "—"],
    ["DST", detail.dst_terminal || consignee.location_name || "—"],
    ["Carrier", detail.carrier_name || detail.carrier || headinfo.carrier_name || headinfo.carrier || "—"],
    ["Pickup Date", detail.pickup_date || headinfo.pickup_date || "—"],
    ["Delivery Date", detail.delivery_date || headinfo.delivery_date || "—"],
    ["Sections", sections.join(", ") || "—"]
  ];

  renderSummaryRows("orderSummary", summary);
}

function renderTripSummary(data, tripNo, sections) {
  const detail = data.detail || {};
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const stops = Array.isArray(data.stops) ? data.stops : [];

  const summary = [
    ["Trip No", detail.trip_no || tripNo],
    ["Status", pickStatusText(detail)],
    ["Dispatch Date", detail.dispatch_date || detail.trip_date || "—"],
    ["ORG", detail.org_terminal || detail.origin_terminal || "—"],
    ["DST", detail.dst_terminal || detail.destination_terminal || "—"],
    ["Carrier", detail.carrier_name || detail.carrier || "—"],
    ["Task Count", tasks.length || "—"],
    ["Stop Count", stops.length || "—"],
    ["Sections", sections.join(", ") || "—"]
  ];

  renderSummaryRows("tripSummary", summary);
}

function renderLinehaulSummary(rows, linehaulNos) {
  const first = rows[0] || {};
  const summary = [
    ["Requested LH", linehaulNos.join(", ") || "—"],
    ["Rows Returned", String(rows.length)],
    ["Linehaul No", first.linehaul_no || first.lh_no || "—"],
    ["Status", pickStatusText(first)],
    ["ORG", first.org_terminal || first.origin || "—"],
    ["DST", first.dst_terminal || first.destination || "—"]
  ];

  renderSummaryRows("linehaulSummary", summary);
}

function renderSummaryRows(targetId, pairs) {
  const target = document.getElementById(targetId);
  target.innerHTML = "";
  pairs.forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `<span class="key">${escapeHtml(key)}</span><span class="value">${escapeHtml(String(value ?? "—"))}</span>`;
    target.appendChild(row);
  });
}

function renderSectionTiles(targetId, data) {
  const target = document.getElementById(targetId);
  target.innerHTML = "";

  Object.entries(data).forEach(([key, value]) => {
    const count = Array.isArray(value)
      ? value.length
      : value && typeof value === "object"
        ? Object.keys(value).length
        : (value ? 1 : 0);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<strong>${titleize(key)}</strong><span>${count} loaded</span>`;
    target.appendChild(tile);
  });
}

function renderOrderTable(data, selectedSections = Array.from(state.orderSections)) {
  const rows = [];
  const sections = new Set(selectedSections);
  const detail = data.detail || {};
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const files = Array.isArray(data.files) ? data.files : [];
  const history = Array.isArray(data.history) ? data.history : [];

  if (sections.has("detail") && Object.keys(detail).length) {
    rows.push({
      "Section": "Detail",
      "Reference": detail.order_no || "—",
      "Name": detail.pro_no || "—",
      "ORG": detail.org_terminal || "—",
      "DST": detail.dst_terminal || "—",
      "Status": toBadge(detail.status_text || detail.status || "Loaded")
    });
  }

  if (sections.has("tasks")) {
    tasks.slice(0, 8).forEach((task) => {
      rows.push({
        "Section": "Task",
        "Reference": task.task_no || "—",
        "Name": task.task_type_group || task.task_type || "—",
        "ORG": task.order_shipper_address?.city || "—",
        "DST": task.order_consignee_address?.city || "—",
        "Status": toBadge(task.status_text || task.task_status_text || task.task_type_group || "Task")
      });
    });
  }

  if (sections.has("files")) {
    files.slice(0, 6).forEach((file, index) => {
      rows.push({
        "Section": "File",
        "Reference": file.file_name || file.fileName || `File ${index + 1}`,
        "Name": file.file_type || file.type || "Document",
        "ORG": file.upload_by || file.create_by || "—",
        "DST": file.create_time || file.created_at || "—",
        "Status": toBadge("File")
      });
    });
  }

  if (sections.has("history")) {
    history.slice(0, 6).forEach((item, index) => {
      rows.push({
        "Section": "History",
        "Reference": item.status_text || item.status || item.action || `History ${index + 1}`,
        "Name": item.operator || item.create_by || "—",
        "ORG": item.create_time || item.created_at || "—",
        "DST": item.remark || item.message || "—",
        "Status": toBadge(item.status_text || item.status || "History")
      });
    });
  }

  renderTable("orderTableWrap", rows, ["Section", "Reference", "Name", "ORG", "DST", "Status"], sections);
}

function renderTripTable(data, selectedSections = Array.from(state.tripSections)) {
  const rows = [];
  const sections = new Set(selectedSections);
  const detail = data.detail || {};
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const stops = Array.isArray(data.stops) ? data.stops : [];
  const history = Array.isArray(data.history) ? data.history : [];
  const files = Array.isArray(data.files) ? data.files : [];

  if (sections.has("detail") && Object.keys(detail).length) {
    rows.push({
      "Section": "Detail",
      "Reference": detail.trip_no || "—",
      "Name": pickStatusText(detail),
      "ORG": detail.org_terminal || detail.origin_terminal || "—",
      "DST": detail.dst_terminal || detail.destination_terminal || "—",
      "Status": toBadge(pickStatusText(detail))
    });
  }

  if (sections.has("files")) {
    files.slice(0, 10).forEach((file, index) => {
      rows.push({
        "Section": "File",
        "Reference": file.file_name || file.fileName || `File ${index + 1}`,
        "Name": file.file_type || file.type || "Document",
        "ORG": file.upload_by || file.create_by || "—",
        "DST": file.create_time || file.created_at || "—",
        "Status": toBadge("File")
      });
    });
  }

  if (sections.has("stops")) {
    stops.slice(0, 10).forEach((stop, index) => {
      rows.push({
        "Section": "Stop",
        "Reference": stop.stop_no || stop.stop_seq || `Stop ${index + 1}`,
        "Name": stop.stop_type_text || stop.stop_type || stop.type || "Stop",
        "ORG": stop.city || stop.address?.city || "—",
        "DST": stop.state || stop.address?.state || "—",
        "Status": toBadge(stop.status_text || stop.stop_status_text || stop.stop_status || "Stop")
      });
    });
  }

  if (sections.has("tasks")) {
    tasks.slice(0, 10).forEach((task) => {
      rows.push({
        "Section": "Task",
        "Reference": task.task_no || "—",
        "Name": task.task_type_group || task.task_type || "—",
        "ORG": task.order_shipper_address?.city || "—",
        "DST": task.order_consignee_address?.city || "—",
        "Status": toBadge(task.status_text || task.task_status_text || task.task_status || task.task_type_group || "Task")
      });
    });
  }

  if (sections.has("history")) {
    history.slice(0, 8).forEach((item, index) => {
      rows.push({
        "Section": "History",
        "Reference": item.status_text || item.status || item.action || `History ${index + 1}`,
        "Name": item.operator || item.create_by || "—",
        "ORG": item.create_time || item.created_at || "—",
        "DST": item.remark || item.message || "—",
        "Status": toBadge(item.status_text || item.status || "History")
      });
    });
  }

  renderTable("tripTableWrap", rows, ["Section", "Reference", "Name", "ORG", "DST", "Status"], sections);
}

function renderLinehaulTable(rows) {
  const formatted = (rows || []).slice(0, 20).map((row, index) => ({
    "LH No": row.linehaul_no || row.lh_no || `LH ${index + 1}`,
    "Trip": row.trip_no || row.tripNo || "—",
    "ORG": row.org_terminal || row.origin || "—",
    "DST": row.dst_terminal || row.destination || "—",
    "Status": toBadge(row.status_text || row.status || row.linehaul_status || "Loaded")
  }));

  renderTable("linehaulTableWrap", formatted, ["LH No", "Trip", "ORG", "DST", "Status"]);
}

function renderTable(targetId, rows, columns, selectedSections = null) {
  const target = document.getElementById(targetId);
  if (!rows.length) {
    const suffix = selectedSections && selectedSections.size
      ? "The selected tabs are active, but those sections are not loaded yet. Click the load button to fetch them."
      : "No data returned for the selected sections.";
    target.className = "table-wrap empty-state";
    target.textContent = suffix;
    return;
  }

  target.className = "table-wrap";
  const thead = `<thead><tr>${columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map((row) => `<tr>${columns.map((col) => `<td>${renderCell(row[col])}</td>`).join("")}</tr>`).join("")}</tbody>`;
  target.innerHTML = `<table>${thead}${tbody}</table>`;
}

function renderCell(value) {
  if (typeof value === "string" && value.startsWith("__BADGE__")) {
    const payload = JSON.parse(value.replace("__BADGE__", ""));
    return `<span class="badge ${payload.className}">${escapeHtml(payload.label)}</span>`;
  }
  return escapeHtml(String(value ?? "—"));
}

function toBadge(label) {
  const normalized = String(label || "").toLowerCase();
  let className = "blue";
  if (normalized.includes("transit")) className = "cyan";
  else if (normalized.includes("deliver") || normalized.includes("success")) className = "green";
  else if (normalized.includes("pending") || normalized.includes("hold") || normalized.includes("open")) className = "gold";
  return `__BADGE__${JSON.stringify({ label, className })}`;
}

function renderEmpty(targetId, message) {
  const target = document.getElementById(targetId);
  target.className = "table-wrap empty-state";
  target.textContent = message;
}

function writeResults(data) {
  resultsCode.textContent = JSON.stringify(data, null, 2);
}

function clearResults() {
  state.latestResults = {};
  resultsCode.textContent = "{}";
}

function setMessage(node, text, isError = false) {
  node.textContent = text;
  node.className = `form-message compact ${isError ? "error" : ""}`.trim();
}

function titleize(str) {
  return String(str || "").replace(/[_-]/g, " ").replace(/\w/g, (m) => m.toUpperCase());
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
