// Local development server. In production the app runs on Vercel via the
// serverless functions in /api; this Express server reuses the very same core
// handlers so local and production behave identically.

import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { listReports, createReport, deleteReport, updateStatus, chiefAuth } from "./lib/core.js";
import { STORAGE_MODE } from "./lib/store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "16mb" }));
app.use(express.static(join(__dirname, "public")));

// Send a { status, body } result from a core handler.
const send = (res, result) => res.status(result.status).json(result.body);

app.post("/api/chief/auth", (req, res) => send(res, chiefAuth(req.body)));
app.get("/api/reports", async (_req, res) => send(res, await listReports()));
app.post("/api/reports", async (req, res) => send(res, await createReport(req.body)));
app.delete("/api/reports/:id", async (req, res) => send(res, await deleteReport(req.params.id, req.body)));
app.patch("/api/reports/:id/status", async (req, res) => send(res, await updateStatus(req.params.id, req.body)));

app.listen(PORT, () => {
  console.log(`Jingzhong Ville site running at http://localhost:${PORT} (storage: ${STORAGE_MODE})`);
});
