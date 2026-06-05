// Vercel serverless function: /api/reports/:id/status
//   PATCH -> update a report's status (Chief View action)
import { updateStatus } from "../../../lib/core.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const result = await updateStatus(req.query.id, req.body || {});
  return res.status(result.status).json(result.body);
}
