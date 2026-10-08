// Build: validate article data, then copy static files to dist/.
// No bundler, no minifier dependency — output stays tiny and auditable.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(root);
const dist = path.join(repoRoot, "dist");

const { ALL_ARTICLES } = await import("../articles-all.js");

const errors = [];
const ids = new Set();
for (const a of ALL_ARTICLES) {
  if (!a.id || ids.has(a.id)) errors.push(`duplicate/missing id: ${a.id}`);
  ids.add(a.id);
  if (!["A2", "B1", "B2", "C1"].includes(a.difficulty)) errors.push(`${a.id}: bad difficulty`);
  if (!a.title || !a.text) errors.push(`${a.id}: missing title/text`);
  const words = a.text.split(/\s+/).filter(Boolean).length;
  if (words < 250 || words > 600) errors.push(`${a.id}: ${words} words (want 300-500)`);
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
for (const d of ["A2", "B1", "B2", "C1"]) {
  if (!byDiff[d]) errors.push(`no articles for ${d}`);
}
if (ALL_ARTICLES.length < 30) errors.push(`only ${ALL_ARTICLES.length} articles (need >= 30)`);

if (errors.length > 0) {
  console.error("Build validation failed:");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "articles.js",
  "articles-all.js",
  "articles-a2.js",
  "articles-b1.js",
  "articles-b2.js",
  "articles-c1.js",
  "storage.js",
  "chart.js",
  "manifest.json",
  "icon.svg",
  "sw.js",
];
for (const f of files) {
  const src = path.join(repoRoot, f);
  if (existsSync(src)) await cp(src, path.join(dist, f));
}
// GitHub Pages: serve index.html for unknown paths (SPA fallback is not needed,
// but .nojekyll avoids Jekyll processing of underscore files).
await writeFile(path.join(dist, ".nojekyll"), "");
console.log(`Built ${ALL_ARTICLES.length} articles ${JSON.stringify(byDiff)} -> dist/`);
