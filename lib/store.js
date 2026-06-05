// Storage abstraction shared by the local Express server and the Vercel
// serverless functions.
//
//   - When DATABASE_URL is set (e.g. on Vercel) -> Neon Postgres.
//   - Otherwise (local dev) -> a JSON file under ./data.
//
// Both back ends expose the same async API so the rest of the app never has to
// know which one is active.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const USE_DB = Boolean(DATABASE_URL);

// --- shared row <-> report mapping ----------------------------------------
function rowToReport(row) {
  return {
    id: row.id,
    location: row.location,
    category: row.category,
    description: row.description,
    reporterName: row.reporter_name,
    images: typeof row.images === "string" ? JSON.parse(row.images) : row.images || [],
    isChief: row.is_chief,
    status: row.status,
    deleteCode: row.delete_code,
    createdAt: Number(row.created_at),
  };
}

// ===========================================================================
// Postgres (Neon) implementation
// ===========================================================================
let _sql;
async function getSql() {
  if (!_sql) {
    const { neon } = await import("@neondatabase/serverless");
    _sql = neon(DATABASE_URL);
    await _sql`
      CREATE TABLE IF NOT EXISTS reports (
        id            text PRIMARY KEY,
        location      text NOT NULL,
        category      text NOT NULL,
        description   text NOT NULL,
        reporter_name text NOT NULL DEFAULT '',
        images        text NOT NULL DEFAULT '[]',
        is_chief      boolean NOT NULL DEFAULT false,
        status        text NOT NULL DEFAULT 'pending',
        delete_code   text NOT NULL,
        created_at    bigint NOT NULL
      )`;
  }
  return _sql;
}

const dbStore = {
  async list() {
    const sql = await getSql();
    const rows = await sql`SELECT * FROM reports ORDER BY created_at DESC`;
    return rows.map(rowToReport);
  },
  async insert(r) {
    const sql = await getSql();
    await sql`
      INSERT INTO reports
        (id, location, category, description, reporter_name, images, is_chief, status, delete_code, created_at)
      VALUES
        (${r.id}, ${r.location}, ${r.category}, ${r.description}, ${r.reporterName},
         ${JSON.stringify(r.images)}, ${r.isChief}, ${r.status}, ${r.deleteCode}, ${r.createdAt})`;
    return r;
  },
  async find(id) {
    const sql = await getSql();
    const rows = await sql`SELECT * FROM reports WHERE id = ${id}`;
    return rows.length ? rowToReport(rows[0]) : null;
  },
  async remove(id) {
    const sql = await getSql();
    await sql`DELETE FROM reports WHERE id = ${id}`;
  },
  async setStatus(id, status) {
    const sql = await getSql();
    const rows = await sql`UPDATE reports SET status = ${status} WHERE id = ${id} RETURNING *`;
    return rows.length ? rowToReport(rows[0]) : null;
  },
};

// ===========================================================================
// JSON file implementation (local development)
// ===========================================================================
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DATA_FILE = join(DATA_DIR, "reports.json");

async function readFileReports() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}
async function writeFileReports(reports) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(reports, null, 2));
}

const fileStore = {
  async list() {
    const reports = await readFileReports();
    return reports.sort((a, b) => b.createdAt - a.createdAt);
  },
  async insert(r) {
    const reports = await readFileReports();
    reports.push(r);
    await writeFileReports(reports);
    return r;
  },
  async find(id) {
    return (await readFileReports()).find((r) => r.id === id) || null;
  },
  async remove(id) {
    const reports = (await readFileReports()).filter((r) => r.id !== id);
    await writeFileReports(reports);
  },
  async setStatus(id, status) {
    const reports = await readFileReports();
    const report = reports.find((r) => r.id === id);
    if (!report) return null;
    report.status = status;
    await writeFileReports(reports);
    return report;
  },
};

// Export whichever back end is active.
export const store = USE_DB ? dbStore : fileStore;
export const STORAGE_MODE = USE_DB ? "postgres" : "file";
