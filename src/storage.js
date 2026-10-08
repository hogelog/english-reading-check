// Storage layer: all data stays in LocalStorage. No server, no tracking.
const HISTORY_KEY = "derc:history:v1";
const DIFFICULTY_KEY = "derc:difficulty:v1";
const THEME_KEY = "derc:theme:v1";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveResult(entry) {
  const history = loadHistory();
  history.push(entry);
  // Keep at most 365 entries to avoid unbounded growth.
  const trimmed = history.slice(-365);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded: drop oldest half and retry once.
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed.slice(-180)));
    } catch {
      /* ignore */
    }
  }
  return trimmed;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function loadDifficulty() {
  const v = localStorage.getItem(DIFFICULTY_KEY);
  return ["Pre-A1", "A1", "A2", "B1", "B2", "C1"].includes(v) ? v : "B1";
}

export function saveDifficulty(level) {
  localStorage.setItem(DIFFICULTY_KEY, level);
}

export function loadTheme() {
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : "auto";
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function entryWords(entry, articlesById) {
  if (Number.isFinite(entry.words)) return entry.words;
  const a = articlesById ? articlesById[entry.articleId] : null;
  return a ? a.text.split(/\s+/).filter(Boolean).length : 0;
}

export function buildShareText({ date, title, difficulty, score, total, durationSeconds, words, wpm, marks, url }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const lines = [
    `📖 Daily English Reading Check (${date})`,
    `${title} [${difficulty}]`,
    `${score}/${total} (${pct}%) · ${formatDuration(durationSeconds)} · ${words} words · ${wpm} wpm`,
  ];
  if (marks) lines.push(marks.map((ok, i) => `Q${i + 1} ${ok ? "✓" : "✕"}`).join(" "));
  if (url) lines.push(url);
  return lines.join("\n");
}

export function computeStreak(history, now = new Date()) {
  const days = new Set(history.map((h) => h.date));
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(fmt(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function entryWpm(entry, articlesById) {
  const mins = (entry.durationSeconds || 0) / 60;
  return mins > 0 ? Math.round(entryWords(entry, articlesById) / mins) : 0;
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Stats helpers (pure, testable without localStorage)
export function computeStats(history) {
  const n = history.length;
  if (n === 0) {
    return { count: 0, avgAccuracy: 0, avgSeconds: 0 };
  }
  let accSum = 0;
  let secSum = 0;
  for (const h of history) {
    accSum += h.total > 0 ? h.score / h.total : 0;
    secSum += h.durationSeconds || 0;
  }
  return {
    count: n,
    avgAccuracy: (accSum / n) * 100,
    avgSeconds: Math.round(secSum / n),
  };
}

export function lastNDaysLabel(dateStr, now = new Date()) {
  // Returns "Today" / "Yesterday" / "N days ago" based on calendar dates.
  const toDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const parse = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  const diff = Math.round((toDay(now) - parse(dateStr)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}
