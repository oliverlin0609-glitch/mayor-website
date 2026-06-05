// Vercel serverless function: /api/chief/auth
//   POST -> validate the chief password
import { chiefAuth } from "../../lib/core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const result = chiefAuth(req.body || {});
  return res.status(result.status).json(result.body);
}
