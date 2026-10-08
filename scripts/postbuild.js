// Post-build: generate dist/sw.js from the template with the hashed asset list
// from Vite's manifest, so the service worker precaches exact filenames.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function postbuild(buildId) {
  const dist = path.join(repoRoot, "dist");
  const manifest = JSON.parse(
    await readFile(path.join(dist, ".vite", "manifest.json"), "utf8"),
  );
  const files = new Set(["./", "./index.html", "./manifest.json", "./icon.svg"]);
  for (const entry of Object.values(manifest)) {
    if (entry.file) files.add("./" + entry.file);
    for (const css of entry.css || []) files.add("./" + css);
  }
  let sw = await readFile(path.join(repoRoot, "src", "sw-template.js"), "utf8");
  sw = sw
    .replace("__CACHE__", `derc-${buildId}`)
    .replace("__ASSETS__", JSON.stringify([...files], null, 2));
  if (sw.includes("__CACHE__") || sw.includes("__ASSETS__")) {
    throw new Error("sw template placeholders not replaced");
  }
  await writeFile(path.join(dist, "sw.js"), sw);
  await writeFile(path.join(dist, ".nojekyll"), "");
  console.log(`sw.js: derc-${buildId}, ${files.size} precached assets`);
}
