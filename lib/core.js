// Framework-agnostic request handlers. Each returns { status, body } so it can
// be driven by either Express (local) or Vercel serverless functions.

import { randomUUID } from "node:crypto";
import { store } from "./store.js";

const CHIEF_PASSWORD = process.env.CHIEF_PASSWORD || "16881688";
const STATUSES = ["pending", "in_progress", "resolved"];
const MAX_IMAGES = 4;

function generateDeleteCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

function sanitizeImages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s) => typeof s === "string" && s.startsWith("data:image/") && s.length < 4_000_000)
    .slice(0, MAX_IMAGES);
}

// Remove the secret delete code before returning a report to clients.
function toPublic(report) {
  const { deleteCode, ...rest } = report;
  return rest;
}

// --- handlers --------------------------------------------------------------
export async function listReports() {
  const reports = await store.list();
  return { status: 200, body: reports.map(toPublic) };
}

export async function createReport(body = {}) {
  const location = String(body.location || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  const reporterName = String(body.reporterName || "").trim();
  const images = sanitizeImages(body.images);

  if (!location || !description) {
    return { status: 400, body: { error: "通報地點與問題描述為必填欄位。" } };
  }
  if (!category) {
    return { status: 400, body: { error: "請選擇或輸入問題類別。" } };
  }

  const isChief = String(body.password || "") === CHIEF_PASSWORD;

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

  await store.insert(report);
  // Return the full report (incl. delete code) only to the author.
  return { status: 201, body: report };
}

export async function deleteReport(id, body = {}) {
  const report = await store.find(id);
  if (!report) return { status: 404, body: { error: "找不到該通報。" } };

  const isChief = String(body.password || "") === CHIEF_PASSWORD;
  const codeMatches = String(body.code || "") !== "" && String(body.code) === report.deleteCode;

  if (!isChief && !codeMatches) {
    return { status: 403, body: { error: "刪除碼錯誤，無法刪除此通報。" } };
  }

  await store.remove(id);
  return { status: 200, body: { ok: true } };
}

export async function updateStatus(id, body = {}) {
  const status = String(body.status || "").trim();
  if (!STATUSES.includes(status)) {
    return { status: 400, body: { error: "Invalid status value." } };
  }
  const updated = await store.setStatus(id, status);
  if (!updated) return { status: 404, body: { error: "找不到該通報。" } };
  return { status: 200, body: toPublic(updated) };
}

export function chiefAuth(body = {}) {
  return { status: 200, body: { ok: String(body.password || "") === CHIEF_PASSWORD } };
}
