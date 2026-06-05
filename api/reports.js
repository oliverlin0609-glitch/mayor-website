// Vercel serverless function: /api/reports
//   GET  -> list all reports (delete codes stripped)
//   POST -> create a report (returns the new report incl. its delete code)
import { listReports, createReport } from "../lib/core.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const result = await listReports();
    return res.status(result.status).json(result.body);
  }
  if (req.method === "POST") {
    const result = await createReport(req.body || {});
    return res.status(result.status).json(result.body);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
