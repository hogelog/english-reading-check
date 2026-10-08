import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  globalThis.localStorage = makeLocalStorage();
});

const storage = await import("../src/storage.js");

describe("storage", () => {
  it("saves and loads history, surviving reload", async () => {
    storage.saveResult({
      date: "2026-10-08",
      score: 4,
      total: 5,
      durationSeconds: 272,
      difficulty: "B1",
      articleId: "article-001",
    });
    // Simulate reload: re-import fresh state is module-cached, but data lives in localStorage.
    const raw = globalThis.localStorage.getItem("derc:history:v1");
    assert.ok(raw.includes("article-001"));
    assert.equal(storage.loadHistory().length, 1);
  });

  it("computes accuracy correctly", () => {
    const stats = storage.computeStats([
      { score: 4, total: 5, durationSeconds: 272 },
      { score: 3, total: 5, durationSeconds: 318 },
    ]);
    assert.equal(stats.count, 2);
    assert.equal(Math.round(stats.avgAccuracy), 70);
    assert.equal(stats.avgSeconds, 295);
  });

  it("formats duration as m:ss", () => {
    assert.equal(storage.formatDuration(272), "4:32");
    assert.equal(storage.formatDuration(61), "1:01");
    assert.equal(storage.formatDuration(0), "0:00");
  });

  it("labels Today/Yesterday/N days ago", () => {
    const now = new Date(2026, 9, 8);
    assert.equal(storage.lastNDaysLabel("2026-10-08", now), "Today");
    assert.equal(storage.lastNDaysLabel("2026-10-07", now), "Yesterday");
    assert.equal(storage.lastNDaysLabel("2026-10-06", now), "2 days ago");
  });

  it("persists difficulty selection", () => {
    storage.saveDifficulty("B2");
    assert.equal(storage.loadDifficulty(), "B2");
    assert.equal(storage.loadDifficulty(), "B2");
  });

  it("records words read in saved entry", () => {
    storage.saveResult({
      date: "2026-10-08",
      score: 4,
      total: 5,
      durationSeconds: 272,
      difficulty: "B1",
      articleId: "b1-001",
      words: 331,
    });
    const [entry] = storage.loadHistory();
    assert.equal(entry.words, 331);
  });

  it("derives words and wpm, backfilling legacy entries", () => {
    const lookup = { "b1-001": { text: "one two three four" } };
    assert.equal(storage.entryWords({ words: 331 }, lookup), 331);
    assert.equal(storage.entryWords({ articleId: "b1-001" }, lookup), 4);
    assert.equal(storage.entryWords({ articleId: "unknown" }, lookup), 0);
    // 4 words in 60s -> 4 wpm; 240 words in 120s -> 120 wpm
    assert.equal(storage.entryWpm({ durationSeconds: 60, articleId: "b1-001" }, lookup), 4);
    assert.equal(
      storage.entryWpm({ durationSeconds: 120, words: 240 }, lookup),
      120,
    );
    assert.equal(storage.entryWpm({ durationSeconds: 0, words: 240 }, lookup), 0);
  });
  it("reading time is recorded in saved entry", () => {
    storage.saveResult({
      date: "2026-10-08",
      score: 5,
      total: 5,
      durationSeconds: 301,
      difficulty: "B2",
      articleId: "b2-001",
    });
    const [entry] = storage.loadHistory();
    assert.equal(entry.durationSeconds, 301);
    assert.equal(entry.score, 5);
    assert.equal(entry.difficulty, "B2");
  });
});
