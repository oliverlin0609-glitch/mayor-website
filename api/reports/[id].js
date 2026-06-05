// Vercel serverless function: /api/reports/:id
//   DELETE -> remove a report (authorized by per-report code or chief password)
import { deleteReport } from "../../lib/core.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const result = await deleteReport(req.query.id, req.body || {});
  return res.status(result.status).json(result.body);
}
