import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALL_ARTICLES } from "../articles-all.js";
import { pickArticle, wordCount } from "../articles.js";

describe("article dataset", () => {
  it("has at least 30 sets", () => {
    assert.ok(ALL_ARTICLES.length >= 30, `got ${ALL_ARTICLES.length}`);
  });

  it("covers A2/B1/B2/C1", () => {
    const diffs = new Set(ALL_ARTICLES.map((a) => a.difficulty));
    for (const d of ["A2", "B1", "B2", "C1"]) assert.ok(diffs.has(d), `missing ${d}`);
  });

  it("has unique ids", () => {
    const ids = ALL_ARTICLES.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("each article has 5 valid questions", () => {
    for (const a of ALL_ARTICLES) {
      assert.ok(a.title, `${a.id}: missing title`);
      assert.ok(a.text, `${a.id}: missing text`);
      assert.equal(a.questions.length, 5, `${a.id}: want 5 questions`);
      for (const [i, q] of a.questions.entries()) {
        assert.ok(q.question, `${a.id} Q${i + 1}: missing question`);
        assert.equal(q.choices.length, 4, `${a.id} Q${i + 1}: want 4 choices`);
        assert.ok(
          Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3,
          `${a.id} Q${i + 1}: bad answer`,
        );
        assert.ok(q.explanation, `${a.id} Q${i + 1}: missing explanation`);
      }
    }
  });

  it("texts are 250-600 words", () => {
    for (const a of ALL_ARTICLES) {
      const n = wordCount(a.text);
      assert.ok(n >= 250 && n <= 600, `${a.id}: ${n} words`);
    }
  });
});

describe("pickArticle", () => {
  const fake = [
    { id: "x-1", difficulty: "B1" },
    { id: "x-2", difficulty: "B1" },
    { id: "x-3", difficulty: "B1" },
    { id: "x-4", difficulty: "B1" },
    { id: "x-5", difficulty: "B1" },
    { id: "x-6", difficulty: "B1" },
  ];

  it("prefers unseen articles", () => {
    const history = [{ articleId: "x-1" }, { articleId: "x-2" }];
    for (let i = 0; i < 20; i++) {
      const a = pickArticle(fake, history, "B1");
      assert.ok(!["x-1", "x-2"].includes(a.id));
    }
  });

  it("never repeats consecutively", () => {
    const history = fake.map((f) => ({ articleId: f.id }));
    const last = history[history.length - 1].articleId;
    for (let i = 0; i < 20; i++) {
      const a = pickArticle(fake, history, "B1");
      assert.notEqual(a.id, last);
    }
  });

  it("varies across picks (not fixed)", () => {
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      seen.add(pickArticle(fake, [], "B1").id);
    }
    assert.ok(seen.size > 1, "same article every time");
  });

  it("falls back when difficulty pool is empty", () => {
    const a = pickArticle(fake, [], "C1");
    assert.ok(a, "should fall back to all articles");
  });
});
