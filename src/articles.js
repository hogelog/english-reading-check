// Article selection: prefer unseen articles, avoid recent ones, never repeat consecutively.
export function pickArticle(allArticles, history, difficulty, recentAvoid = 5) {
  const pool = allArticles.filter((a) => a.difficulty === difficulty);
  const candidates = pool.length > 0 ? pool : allArticles;
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const recentIds = new Set(history.slice(-recentAvoid).map((h) => h.articleId));
  const lastId = history.length > 0 ? history[history.length - 1].articleId : null;

  // 1) Unseen & not recent
  const seenIds = new Set(history.map((h) => h.articleId));
  let options = candidates.filter((a) => !seenIds.has(a.id) && !recentIds.has(a.id));
  // 2) Any non-recent
  if (options.length === 0) {
    options = candidates.filter((a) => !recentIds.has(a.id));
  }
  // 3) Anything except the last one (avoid consecutive repeat)
  if (options.length === 0) {
    options = candidates.filter((a) => a.id !== lastId);
  }
  if (options.length === 0) options = candidates;

  const idx = Math.floor(Math.random() * options.length);
  return options[idx];
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
