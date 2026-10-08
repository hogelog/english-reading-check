import "./styles.css";
import { pickArticle, wordCount } from "./articles.js";
import {
  loadHistory,
  saveResult,
  clearHistory,
  loadDifficulty,
  saveDifficulty,
  loadTheme,
  saveTheme,
  formatDuration,
  todayKey,
  computeStats,
  lastNDaysLabel,
  entryWords,
  entryWpm,
  buildShareText,
} from "./storage.js";
import { buildLineChart } from "./chart.js";

const $ = (id) => document.getElementById(id);
const views = ["view-home", "view-reading", "view-quiz", "view-result", "view-history"];

let ALL_ARTICLES = [];
let lastShareText = "";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function loadArticles() {
  const levels = ["pre", "a1", "a2", "b1", "b2", "c1"];
  const parts = await Promise.all(
    levels.map(async (level) => {
      const res = await fetch(`./data/${level}.json?v=${__DATA_VERSION__}`);
      if (!res.ok) throw new Error(`failed to load ${level}.json`);
      return res.json();
    }),
  );
  return parts.flat();
}

let state = {
  difficulty: loadDifficulty(),
  article: null,
  startTime: 0,
  qIndex: 0,
  answers: [], // chosen index per question
};

function articlesById() {
  const map = {};
  for (const a of ALL_ARTICLES) map[a.id] = a;
  return map;
}
function showView(id) {
  for (const v of views) $(v).hidden = v !== id;
  const h1 = document.querySelector(`#${id} h1`);
  if (h1) {
    h1.setAttribute("tabindex", "-1");
    h1.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}

// ---------- Theme ----------
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
    $("theme-btn").textContent = window.matchMedia("(prefers-color-scheme: dark)").matches ? "🌙" : "☀️";
  } else {
    root.setAttribute("data-theme", theme);
    $("theme-btn").textContent = theme === "dark" ? "🌙" : "☀️";
  }
}

// ---------- Home ----------
function rowValue(h, lookup) {
  const pct = Math.round(accuracyOf(h));
  return `${h.score}/${h.total} ${pct}% ${formatDuration(h.durationSeconds)} ${entryWords(h, lookup)}w ${h.difficulty}`;
}

function accuracyOf(h) {
  return h.total > 0 ? (h.score / h.total) * 100 : 0;
}

function shareTextFor(h, lookup) {
  const article = lookup[h.articleId];
  const marks =
    article && Array.isArray(h.answers)
      ? article.questions.map((q, i) => h.answers[i] === q.answer)
      : null;
  return buildShareText({
    date: h.date,
    title: article ? article.title : "(unknown article)",
    difficulty: h.difficulty,
    score: h.score,
    total: h.total,
    durationSeconds: h.durationSeconds || 0,
    words: entryWords(h, lookup),
    wpm: entryWpm(h, lookup),
    marks,
    url: "https://hogelog.github.io/english-reading-check/",
  });
}

function appendCopyButton(li, text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost copy-btn";
  btn.textContent = "コピー";
  btn.setAttribute("aria-label", "この結果をコピー");
  btn.addEventListener("click", async () => {
    if (await copyText(text)) {
      btn.textContent = "✓";
      setTimeout(() => (btn.textContent = "コピー"), 2000);
    } else {
      window.alert(text);
    }
  });
  li.appendChild(btn);
}

function renderHome() {
  const history = loadHistory();
  document.querySelectorAll(".chip").forEach((chip) => {
    const active = chip.dataset.diff === state.difficulty;
    chip.setAttribute("aria-checked", String(active));
  });
  $("home-count").textContent = `${ALL_ARTICLES.length} articles`;
  $("est-time").textContent = `推定所要時間: ${state.difficulty === "Pre-A1" || state.difficulty === "A1" ? 3 : 5} min`;
  const last7 = history.slice(-7);
  const stats7 = computeStats(last7);
  $("stat-acc").textContent = last7.length ? `${Math.round(stats7.avgAccuracy)}%` : "—";
  $("stat-time").textContent = last7.length ? formatDuration(stats7.avgSeconds) : "—";
  $("stat-count").textContent = String(history.length);

  const chartCard = $("chart-card");
  if (last7.length >= 2) {
    chartCard.hidden = false;
    $("mini-chart").innerHTML = buildLineChart(last7.map(accuracyOf));
  } else {
    chartCard.hidden = true;
  }

  const recent = history.slice(-3).reverse();
  const ul = $("recent-list");
  ul.innerHTML = "";
  if (recent.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ記録がありません。Start で今日のチェックを始めましょう。";
    ul.appendChild(li);
    return;
  }
  for (const h of recent) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = lastNDaysLabel(h.date);
    const val = document.createElement("span");
    val.textContent = rowValue(h, articlesById());
    li.append(label, val);
    appendCopyButton(li, shareTextFor(h, articlesById()));
    ul.appendChild(li);
  }
}

// ---------- Reading / Quiz ----------
function startSession() {
  const history = loadHistory();
  // Guard against stale cached files: if the chosen difficulty has no loaded
  // data (e.g. old JS mixed with new HTML), reload to fetch the latest files
  // instead of silently serving a wrong difficulty.
  if (!ALL_ARTICLES.some((a) => a.difficulty === state.difficulty)) {
    location.reload();
    return;
  }
  const article = pickArticle(ALL_ARTICLES, history, state.difficulty);
  if (!article) return;
  state.article = article;
  state.answers = [];
  state.qIndex = 0;
  state.startTime = Date.now();
  $("article-diff").textContent = article.difficulty;
  $("article-title").textContent = article.title;
  $("article-words").textContent = `約${article.text.split(/\s+/).filter(Boolean).length} words`;
  const body = $("article-body");
  body.innerHTML = "";
  for (const para of article.text.split(/\n\n+/)) {
    const p = document.createElement("p");
    p.textContent = para.trim();
    body.appendChild(p);
  }
  showView("view-reading");
}

function renderQuiz() {
  const article = state.article;
  const i = state.qIndex;
  const q = article.questions[i];
  $("quiz-progress").textContent = `Question ${i + 1} of ${article.questions.length}`;
  $("quiz-bar").style.width = `${(i / article.questions.length) * 100}%`;
  $("quiz-question").textContent = q.question;
  const box = $("quiz-choices");
  box.innerHTML = "";
  q.choices.forEach((choice, ci) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.textContent = choice;
    btn.addEventListener("click", () => answerQuestion(ci));
    box.appendChild(btn);
  });
  const next = $("quiz-next-btn");
  next.disabled = true;
  next.textContent = i === article.questions.length - 1 ? "結果を見る" : "Next";
  showView("view-quiz");
}

function answerQuestion(choiceIdx) {
  const article = state.article;
  const i = state.qIndex;
  if (state.answers[i] !== undefined) return; // locked: cannot change
  state.answers[i] = choiceIdx;
  const q = article.questions[i];
  const btns = [...document.querySelectorAll("#quiz-choices .choice")];
  btns.forEach((btn, bi) => {
    btn.disabled = true;
    btn.setAttribute("aria-checked", String(bi === choiceIdx));
    if (bi === q.answer) btn.classList.add("is-correct");
    else if (bi === choiceIdx) btn.classList.add("is-wrong");
  });
  $("quiz-bar").style.width = `${((i + 1) / article.questions.length) * 100}%`;
  $("quiz-next-btn").disabled = false;
  $("quiz-next-btn").focus();
}

function nextQuestion() {
  if (state.answers[state.qIndex] === undefined) return;
  if (state.qIndex < state.article.questions.length - 1) {
    state.qIndex += 1;
    renderQuiz();
  } else {
    finishSession();
  }
}

function finishSession() {
  const article = state.article;
  const durationSeconds = Math.round((Date.now() - state.startTime) / 1000);
  let score = 0;
  article.questions.forEach((q, i) => {
    if (state.answers[i] === q.answer) score += 1;
  });
  const prevHistory = loadHistory();
  const prevAvg =
    prevHistory.length > 0 ? Math.round(computeStats(prevHistory).avgAccuracy) + "%" : "—";
  const entry = {
    date: todayKey(),
    score,
    total: article.questions.length,
    durationSeconds,
    difficulty: article.difficulty,
    articleId: article.id,
    words: wordCount(article.text),
    answers: [...state.answers],
  };
  saveResult(entry);

  $("result-score").textContent = `${score} / ${article.questions.length}`;
  $("result-pct").textContent = `${Math.round((score / article.questions.length) * 100)}%`;
  $("result-time").textContent = formatDuration(durationSeconds);
  $("result-diff").textContent = article.difficulty;
  $("result-prev").textContent = prevAvg;
  $("result-words").textContent = `${entry.words} words`;
  $("result-wpm").textContent = `${entryWpm(entry)} wpm`;
  lastShareText = shareTextFor(entry, articlesById());
  $("result-copy-btn").textContent = "結果をコピー";

  const list = $("result-list");
  list.innerHTML = "";
  article.questions.forEach((q, i) => {
    const ok = state.answers[i] === q.answer;
    const li = document.createElement("li");
    const head = document.createElement("p");
    head.className = "review-head";
    const mark = document.createElement("span");
    mark.className = ok ? "mark-ok" : "mark-ng";
    mark.textContent = ok ? "✓" : "✕";
    const title = document.createElement("span");
    title.textContent = `Q${i + 1}`;
    head.append(mark, title);
    const qEl = document.createElement("p");
    qEl.className = "review-q";
    qEl.textContent = q.question;
    li.append(head, qEl);
    if (!ok) {
      const aEl = document.createElement("p");
      aEl.className = "review-a";
      aEl.textContent = `正解: ${q.choices[q.answer]}`;
      const eEl = document.createElement("p");
      eEl.className = "review-exp";
      eEl.textContent = `解説: ${q.explanation}`;
      li.append(aEl, eEl);
    }
    list.appendChild(li);
  });
  showView("view-result");
}

// ---------- History ----------
function renderHistory() {
  const history = loadHistory();
  const stats = computeStats(history);
  $("hist-acc").textContent = history.length ? `${Math.round(stats.avgAccuracy)}%` : "—";
  $("hist-time").textContent = history.length ? formatDuration(stats.avgSeconds) : "—";
  $("hist-count").textContent = String(history.length);
  const lookup = articlesById();
  const totalWords = history.reduce((sum, h) => sum + entryWords(h, lookup), 0);
  $("hist-words").textContent = history.length ? totalWords.toLocaleString("en-US") : "—";

  const last30 = history.slice(-30);
  const card = $("hist-chart-card");
  if (last30.length >= 2) {
    card.hidden = false;
    $("hist-chart").innerHTML = buildLineChart(last30.map(accuracyOf));
  } else {
    card.hidden = true;
  }

  const fill = (elId, items) => {
    const ul = $(elId);
    ul.innerHTML = "";
    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "記録がありません。";
      ul.appendChild(li);
      return;
    }
    for (const h of [...items].reverse()) {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${lastNDaysLabel(h.date)} (${h.date})`;
      const val = document.createElement("span");
      val.textContent = rowValue(h, lookup);
      li.append(label, val);
      appendCopyButton(li, shareTextFor(h, lookup));
      ul.appendChild(li);
    }
  };
  fill("hist-list-7", history.slice(-7));
  fill("hist-list-30", last30);
}

// ---------- Events ----------
async function init() {
  applyTheme(loadTheme());

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.difficulty = chip.dataset.diff;
      saveDifficulty(state.difficulty);
      renderHome();
    });
  });
  $("start-btn").addEventListener("click", startSession);
  $("to-questions-btn").addEventListener("click", () => {
    state.qIndex = 0;
    renderQuiz();
  });
  $("quiz-next-btn").addEventListener("click", nextQuestion);
  $("history-btn").addEventListener("click", () => {
    renderHistory();
    showView("view-history");
  });
  $("home-btn").addEventListener("click", () => {
    renderHome();
    showView("view-home");
  });
  $("result-home-btn").addEventListener("click", () => {
    renderHome();
    showView("view-home");
  });
  $("result-history-btn").addEventListener("click", () => {
    renderHistory();
    showView("view-history");
  });
  $("result-retry-btn").addEventListener("click", startSession);
  $("result-copy-btn").addEventListener("click", async () => {
    const btn = $("result-copy-btn");
    if (await copyText(lastShareText)) {
      btn.textContent = "コピー済み ✓";
      setTimeout(() => (btn.textContent = "結果をコピー"), 2000);
    } else {
      window.alert(lastShareText);
    }
  });
  $("theme-btn").addEventListener("click", () => {
    const cur = loadTheme();
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // cycle: auto -> opposite of system -> other -> auto
    let next;
    if (cur === "auto") next = dark ? "light" : "dark";
    else if (cur === "dark") next = "light";
    else next = "auto";
    saveTheme(next);
    applyTheme(next);
  });
  $("clear-btn").addEventListener("click", () => {
    if (window.confirm("履歴をすべて消去しますか？")) {
      clearHistory();
      renderHistory();
      renderHome();
    }
  });
  $("export-btn").addEventListener("click", async () => {
    const data = JSON.stringify(loadHistory(), null, 2);
    try {
      await navigator.clipboard.writeText(data);
      $("export-btn").textContent = "コピー済み ✓";
      setTimeout(() => ($("export-btn").textContent = "JSON出力"), 2000);
    } catch {
      window.alert(data);
    }
  });

  // Keyboard: 1-4 to answer, Enter for next
  document.addEventListener("keydown", (e) => {
    if (!$("view-quiz").hidden && state.answers[state.qIndex] === undefined) {
      if (["1", "2", "3", "4"].includes(e.key)) {
        answerQuestion(Number(e.key) - 1);
      }
    } else if (!$("view-quiz").hidden && e.key === "Enter" && !$("quiz-next-btn").disabled) {
      nextQuestion();
    }
  });

  // Data (JSON) loads async; UI is wired first so history stays usable on failure.
  const startBtn = $("start-btn");
  startBtn.disabled = true;
  startBtn.textContent = "読み込み中…";
  try {
    ALL_ARTICLES = await loadArticles();
  } catch {
    startBtn.textContent = "読み込みに失敗しました";
    return;
  }
  startBtn.disabled = false;
  startBtn.textContent = "Start";
  renderHome();
}

init();
