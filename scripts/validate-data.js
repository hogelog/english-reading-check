// Validate article data (runs as part of `npm run build`).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wordCount } from "../src/articles.js";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function validateData() {
  const ALL_ARTICLES = [];
  for (const level of ["pre", "a1", "a2", "b1", "b2", "c1"]) {
    const raw = await readFile(path.join(repoRoot, "public", "data", `${level}.json`), "utf8");
    ALL_ARTICLES.push(...JSON.parse(raw));
  }

  const errors = [];
  const ids = new Set();
  for (const a of ALL_ARTICLES) {
    if (!a.id || ids.has(a.id)) errors.push(`duplicate/missing id: ${a.id}`);
    ids.add(a.id);
    if (!["Pre-A1", "A1", "A2", "B1", "B2", "C1"].includes(a.difficulty)) {
      errors.push(`${a.id}: bad difficulty`);
    }
    if (!a.title || !a.text) errors.push(`${a.id}: missing title/text`);
    const words = wordCount(a.text);
    const minWords = a.difficulty === "Pre-A1" ? 60 : a.difficulty === "A1" ? 120 : 250;
    if (words < minWords || words > 600) errors.push(`${a.id}: ${words} words`);
    if (!Array.isArray(a.questions) || a.questions.length !== 5) {
      errors.push(`${a.id}: want exactly 5 questions`);
    } else {
      a.questions.forEach((q, i) => {
        if (!q.question || !Array.isArray(q.choices) || q.choices.length !== 4) {
          errors.push(`${a.id} Q${i + 1}: need 4 choices`);
        }
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
          errors.push(`${a.id} Q${i + 1}: bad answer index`);
        }
        if (!q.explanation) errors.push(`${a.id} Q${i + 1}: missing explanation`);
      });
    }
  }
  const byDiff = {};
  for (const a of ALL_ARTICLES) byDiff[a.difficulty] = (byDiff[a.difficulty] || 0) + 1;
  for (const d of ["Pre-A1", "A1", "A2", "B1", "B2", "C1"]) {
    if (!byDiff[d]) errors.push(`no articles for ${d}`);
  }
  if (ALL_ARTICLES.length < 30) errors.push(`only ${ALL_ARTICLES.length} articles (need >= 30)`);

  if (errors.length > 0) {
    console.error("Data validation failed:");
    for (const e of errors) console.error(" - " + e);
    process.exit(1);
  }
  console.log(`Data OK: ${ALL_ARTICLES.length} articles ${JSON.stringify(byDiff)}`);
}
