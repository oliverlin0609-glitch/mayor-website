// Chief View (里長版) dashboard: KPI cards, analytics charts, the report
// management table (with images, delete-any, inline status), and a posting form
// whose entries appear as featured "里長公告" on the home page.

import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_PALETTE,
  formatDate,
  escapeHtml,
} from "./config.js";
import { fetchReports, createReport, deleteReport, updateStatus } from "./api.js";
import { confirmBox, alertBox } from "./modal.js";
import { attachImageInput } from "./formImages.js";

const STATUS_ORDER = ["pending", "in_progress", "resolved"];
const charts = {};

// ---------------------------------------------------------------------------
// KPI stat cards
// ---------------------------------------------------------------------------
function renderStats(reports) {
  const counts = { total: reports.length, pending: 0, in_progress: 0, resolved: 0 };
  for (const r of reports) counts[r.status] = (counts[r.status] || 0) + 1;
  document.querySelectorAll("[data-stat]").forEach((el) => {
    el.textContent = counts[el.dataset.stat] ?? 0;
  });
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
function renderStatusChart(reports) {
  const data = STATUS_ORDER.map((s) => reports.filter((r) => r.status === s).length);
  upsertChart("chart-status", {
    type: "doughnut",
    data: {
      labels: STATUS_ORDER.map((s) => STATUS_LABELS[s]),
      datasets: [{ data, backgroundColor: STATUS_ORDER.map((s) => STATUS_COLORS[s]), borderWidth: 0 }],
    },
    options: { plugins: { legend: { position: "bottom" } }, cutout: "62%" },
  });
}

function renderCategoryChart(reports) {
  // Categories are free text, so derive the set dynamically from the data.
  const counts = new Map();
  for (const r of reports) counts.set(r.category, (counts.get(r.category) || 0) + 1);
  const labels = [...counts.keys()];
  const data = [...counts.values()];

  upsertChart("chart-category", {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]),
        borderRadius: 6,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderTrendChart(reports) {
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = day.getTime() + 86400000;
    days.push(day.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }));
    counts.push(reports.filter((r) => r.createdAt >= day.getTime() && r.createdAt < next).length);
  }
  upsertChart("chart-trend", {
    type: "line",
    data: {
      labels: days,
      datasets: [{
        data: counts,
        borderColor: "#2b6cb0",
        backgroundColor: "rgba(43, 108, 176, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#2b6cb0",
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function upsertChart(canvasId, config) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId);
  config.options = { responsive: true, maintainAspectRatio: false, ...config.options };
  charts[canvasId] = new Chart(ctx, config);
}

// ---------------------------------------------------------------------------
// Report management table
// ---------------------------------------------------------------------------
function thumbsHtml(images) {
  if (!images || !images.length) return `<span class="cell-muted">—</span>`;
  return `<div class="table-thumbs">${images
    .map((url) => `<img class="table-thumb" src="${url}" alt="照片" />`)
    .join("")}</div>`;
}

function renderTable(reports) {
  const tbody = document.getElementById("report-tbody");
  if (!reports.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">目前沒有通報紀錄。</td></tr>`;
    return;
  }

  tbody.innerHTML = reports
    .map(
      (r) => `
      <tr>
        <td class="nowrap">${formatDate(r.createdAt)}</td>
        <td>${escapeHtml(r.location)}${r.isChief ? ' <span class="tag-chief">里長</span>' : ""}</td>
        <td>${escapeHtml(r.category)}</td>
        <td class="cell-desc">${escapeHtml(r.description)}</td>
        <td>${thumbsHtml(r.images)}</td>
        <td><span class="badge badge--${r.status}">${STATUS_LABELS[r.status]}</span></td>
        <td class="cell-actions">
          <select class="status-select" data-id="${r.id}" aria-label="變更狀態">
            ${STATUS_ORDER.map(
              (s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`
            ).join("")}
          </select>
          <button class="btn-del" data-id="${r.id}">刪除</button>
        </td>
      </tr>`
    )
    .join("");

  tbody.querySelectorAll(".status-select").forEach((select) =>
    select.addEventListener("change", () => changeStatus(select.dataset.id, select.value))
  );
  tbody.querySelectorAll(".btn-del").forEach((btn) =>
    btn.addEventListener("click", () => deleteAsChief(btn.dataset.id))
  );
}

async function changeStatus(id, status) {
  try {
    await updateStatus(id, status);
    await loadAndRender();
  } catch {
    await alertBox({ title: "更新失敗", message: "狀態更新失敗，請稍後再試。" });
  }
}

async function deleteAsChief(id) {
  const ok = await confirmBox({
    title: "刪除通報",
    message: "確定要刪除這筆通報嗎？此動作無法復原。",
    confirmText: "刪除",
  });
  if (!ok) return;
  try {
    await deleteReport(id, { password: sessionStorage.getItem("chiefPassword") });
    await loadAndRender();
  } catch (err) {
    await alertBox({ title: "刪除失敗", message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Chief posting form (marked as chief via the stored password)
// ---------------------------------------------------------------------------
function initChiefForm() {
  const chiefForm = document.getElementById("chief-report-form");
  const chiefMsg = document.getElementById("chief-report-msg");
  const chiefImages = attachImageInput(chiefForm);

  chiefForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    chiefMsg.textContent = "";
    chiefMsg.className = "form-msg";

    const data = Object.fromEntries(new FormData(chiefForm).entries());
    delete data.images;
    data.images = chiefImages.get();
    data.password = sessionStorage.getItem("chiefPassword"); // marks post as chief

    try {
      const report = await createReport(data);
      chiefForm.reset();
      chiefImages.reset();
      await alertBox({
        title: "已新增里長公告",
        message: "此通報的刪除碼如下（里長可直接刪除，無需此碼）：",
        code: report.deleteCode,
        confirmText: "知道了",
      });
      chiefMsg.textContent = "新增成功！已顯示於首頁里長公告。";
      chiefMsg.classList.add("is-success");
      await loadAndRender();
    } catch (err) {
      chiefMsg.textContent = err.message;
      chiefMsg.classList.add("is-error");
    }
  });
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
async function loadAndRender() {
  try {
    const reports = await fetchReports();
    renderStats(reports);
    renderStatusChart(reports);
    renderCategoryChart(reports);
    renderTrendChart(reports);
    renderTable(reports);
  } catch {
    document.getElementById("report-tbody").innerHTML =
      `<tr><td colspan="7" class="table-empty">資料載入失敗，請確認伺服器是否運作中。</td></tr>`;
  }
}

let wired = false;

export function initChiefDashboard() {
  if (!wired) {
    document.getElementById("refresh-btn").addEventListener("click", loadAndRender);
    document.getElementById("chief-logout").addEventListener("click", () => {
      sessionStorage.removeItem("chiefAuthed");
      sessionStorage.removeItem("chiefPassword");
      location.hash = "home";
    });
    initChiefForm();
    wired = true;
  }
  loadAndRender();
}

initChiefDashboard.refresh = loadAndRender;
