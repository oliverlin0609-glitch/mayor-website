import express from "express";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const REPORTS_FILE = join(DATA_DIR, "reports.json");
const PORT = process.env.PORT || 3000;

// Chief View password. Anyone holding this can enter the dashboard and delete
// any report without the per-report code.
const CHIEF_PASSWORD = "16881688";

// Valid statuses. Categories are free text (residents may type their own), so
// they are not whitelisted — only length-limited.
const STATUSES = ["pending", "in_progress", "resolved"];
const MAX_IMAGES = 4;

// Keep only valid, reasonably sized image data URLs (max 4).
function sanitizeImages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s) => typeof s === "string" && s.startsWith("data:image/") && s.length < 4_000_000)
    .slice(0, MAX_IMAGES);
}

// Generate a random three-digit delete code (100–999) for a new report.
function generateDeleteCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

// Strip secret fields before sending a report to the client. The delete code
// must never be exposed through the listing API, otherwise anyone could read
// it and delete the report.
function toPublicReport(report) {
  const { deleteCode, ...publicFields } = report;
  return publicFields;
}

// ---------------------------------------------------------------------------
// File-based storage helpers
// ---------------------------------------------------------------------------
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
}

async function loadReports() {
  if (!existsSync(REPORTS_FILE)) return [];
  try {
    return JSON.parse(await readFile(REPORTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function saveReports(reports) {
  await ensureDataDir();
  await writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// ---------------------------------------------------------------------------
// App + API
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: "16mb" })); // allow embedded (compressed) images
app.use(express.static(join(__dirname, "public")));

// Verify the chief password (used to unlock the Chief View).
app.post("/api/chief/auth", (req, res) => {
  const password = String(req.body.password || "");
  res.json({ ok: password === CHIEF_PASSWORD });
});

// List all reports, newest first. Delete codes are stripped out.
app.get("/api/reports", async (_req, res) => {
  const reports = await loadReports();
  res.json(reports.sort((a, b) => b.createdAt - a.createdAt).map(toPublicReport));
});

// Create a new report (resident or chief). The response includes the generated
// delete code exactly once so the author can save it.
app.post("/api/reports", async (req, res) => {
  const location = String(req.body.location || "").trim();
  const category = String(req.body.category || "").trim();
  const description = String(req.body.description || "").trim();
  const reporterName = String(req.body.reporterName || "").trim();
  const images = sanitizeImages(req.body.images);

  if (!location || !description) {
    return res.status(400).json({ error: "通報地點與問題描述為必填欄位。" });
  }
  if (!category) {
    return res.status(400).json({ error: "請選擇或輸入問題類別。" });
  }

  // Posts are marked as chief-authored only when the correct chief password is
  // supplied. Chief posts are featured at the top of the resident home page.
  const isChief = String(req.body.password || "") === CHIEF_PASSWORD;

  const report = {
    id: randomUUID(),
    location: location.slice(0, 120),
    category: category.slice(0, 40),
    description: description.slice(0, 2000),
    reporterName: reporterName.slice(0, 60),
    images,
    isChief,
    status: "pending",
    deleteCode: generateDeleteCode(),
    createdAt: Date.now(),
  };

  const reports = await loadReports();
  reports.push(report);
  await saveReports(reports);

  // Return the full report (including the delete code) only to the author.
  res.status(201).json(report);
});

// Update a report's status (Chief View action).
app.patch("/api/reports/:id/status", async (req, res) => {
  const status = String(req.body.status || "").trim();
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const reports = await loadReports();
  const report = reports.find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: "找不到該通報。" });

  report.status = status;
  await saveReports(reports);
  res.json(toPublicReport(report));
});

// Delete a report. Authorized either by the correct per-report delete code
// (any resident) or by the chief password (deletes anything).
app.delete("/api/reports/:id", async (req, res) => {
  const code = String(req.body.code || "");
  const password = String(req.body.password || "");

  const reports = await loadReports();
  const index = reports.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "找不到該通報。" });

  const isChief = password === CHIEF_PASSWORD;
  const codeMatches = code !== "" && code === reports[index].deleteCode;

  if (!isChief && !codeMatches) {
    return res.status(403).json({ error: "刪除碼錯誤，無法刪除此通報。" });
  }

  reports.splice(index, 1);
  await saveReports(reports);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Jingzhong Ville sanitation site running at http://localhost:${PORT}`);
});
