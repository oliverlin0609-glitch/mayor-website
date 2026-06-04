// Shared front-end constants. Keys are English (used in code/API); labels are
// Traditional Chinese (rendered in the UI).

export const STATUS_LABELS = {
  pending: "待處理",
  in_progress: "處理中",
  resolved: "已完成",
};

// Color tokens reused by status badges and charts (keep in sync with CSS).
export const STATUS_COLORS = {
  pending: "#e53e3e",
  in_progress: "#dd6b20",
  resolved: "#38a169",
};

// Suggested categories shown in the datalist. Residents/chief may also type
// their own category, so these are hints, not a fixed list.
export const CATEGORY_SUGGESTIONS = [
  "鼠患通報",
  "環境髒亂",
  "排水溝 / 孳生源",
  "病媒蚊",
  "流浪動物",
  "其他",
];

// Palette cycled through when charting an arbitrary set of categories.
export const CATEGORY_PALETTE = [
  "#c05621", "#2b6cb0", "#319795", "#805ad5",
  "#d69e2e", "#e53e3e", "#38a169", "#dd6b20",
];

// Format a timestamp into a localized, readable date string.
export function formatDate(ms) {
  return new Date(ms).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Escape arbitrary text so it can be safely inserted as HTML.
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
