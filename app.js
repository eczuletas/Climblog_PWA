const STORAGE_KEY = "climblog.sessions.v1";
let sessions = loadSessions();

const $ = (id) => document.getElementById(id);
const form = $("climb-form");
const heightInput = $("height");
const wallInput = $("wall");
const notesInput = $("notes");

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveSessions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
function formatNumber(value) { return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }); }
function formatDate(iso) { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function formatShortDate(iso) { return new Date(iso).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }); }
function totalFeet() { return sessions.reduce((sum, item) => sum + Number(item.height), 0); }
function showToast(message) { const toast = $("toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }

function render() {
  const total = totalFeet();
  $("total-feet").textContent = formatNumber(total);
  $("session-summary").textContent = sessions.length ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} logged` : "No sessions logged yet";
  $("clear-button").hidden = sessions.length === 0;
  const recent = sessions.slice(0, 7);
  const average = recent.length ? recent.reduce((sum, item) => sum + Number(item.height), 0) / recent.length : 0;
  $("average-label").textContent = recent.length ? `Avg. ${formatNumber(average)} ft` : "";
  renderChart(recent);
  renderHistory();
}

function renderChart(items) {
  const chart = $("chart");
  if (!items.length) { chart.innerHTML = '<div class="empty-state">Your recent sessions will appear here.</div>'; return; }
  const max = Math.max(...items.map((item) => Number(item.height)), 1);
  chart.innerHTML = items.slice().reverse().map((item, index, reversed) => {
    const height = Math.max(4, (Number(item.height) / max) * 100);
    const isLatest = index === reversed.length - 1;
    return `<div class="bar-wrap"><span class="bar-value">${formatNumber(item.height)}</span><div class="bar ${isLatest ? "latest" : ""}" style="height:${height}%" title="${formatNumber(item.height)} feet"></div><span class="bar-date">${formatShortDate(item.date)}</span></div>`;
  }).join("");
}

function renderHistory() {
  const list = $("history-list");
  if (!sessions.length) { list.innerHTML = '<div class="empty-state">No climbs logged yet. Add your first session above.</div>'; return; }
  list.innerHTML = sessions.map((item) => `<article class="history-item"><div class="history-main"><div class="history-icon" aria-hidden="true">↗</div><div><div class="history-title">${escapeHtml(item.wall || "Climbing session")}</div><div class="history-date">${formatDate(item.date)}${item.notes ? ` · ${escapeHtml(item.notes)}` : ""}</div></div></div><div class="history-main"><div class="history-feet">${formatNumber(item.height)} <small>ft</small></div><button class="delete-button" type="button" data-delete="${item.id}" aria-label="Delete this session">×</button></div></article>`).join("");
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const height = Number(heightInput.value);
  if (!height || height <= 0) return;
  sessions.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), date: new Date().toISOString(), height, wall: wallInput.value.trim(), notes: notesInput.value.trim() });
  saveSessions(); form.reset(); render(); heightInput.focus(); showToast("Session saved");
});

$("history-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  sessions = sessions.filter((item) => item.id !== button.dataset.delete); saveSessions(); render(); showToast("Session removed");
});

$("clear-button").addEventListener("click", () => {
  if (!sessions.length || !confirm("Delete all climbing sessions?")) return;
  sessions = []; saveSessions(); render(); showToast("History cleared");
});

$("export-button").addEventListener("click", () => {
  if (!sessions.length) { showToast("There is no data to export yet"); return; }
  const rows = [["Date", "Height (feet)", "Wall", "Notes"], ...sessions.map((item) => [formatDate(item.date), item.height, item.wall || "", item.notes || ""] )];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "climblog-sessions.csv"; link.click(); URL.revokeObjectURL(link.href); showToast("Data exported");
});

$("today-label").textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date());
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
render();
