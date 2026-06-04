// Thin client for the reports API. Shared by the resident and chief views.

export async function fetchReports() {
  const res = await fetch("/api/reports");
  if (!res.ok) throw new Error("Failed to load reports.");
  return res.json();
}

// Create a report. Resolves to the created report INCLUDING its delete code
// (the server returns the code only on creation).
export async function createReport(data) {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "送出失敗，請稍後再試。");
  return body;
}

// Delete a report. `auth` is either { code } (resident) or { password } (chief).
export async function deleteReport(id, auth) {
  const res = await fetch(`/api/reports/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auth),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "刪除失敗，請稍後再試。");
  return body;
}

export async function updateStatus(id, status) {
  const res = await fetch(`/api/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("狀態更新失敗。");
  return res.json();
}

// Validate the chief password against the server. Returns true/false.
export async function chiefAuth(password) {
  const res = await fetch("/api/chief/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => ({}));
  return body.ok === true;
}
