// Build driver: validate data -> vite build (hashed assets) -> generate sw.js.
// Single BUILD_ID per run keeps the JS bundle, data query strings and the
// service-worker cache in sync.
import { spawnSync } from "node:child_process";
import { buildId } from "./build-id.js";
import { validateData } from "./validate-data.js";
import { postbuild } from "./postbuild.js";

const id = buildId();
process.env.BUILD_ID = id;

await validateData();

const vite = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  env: process.env,
});
if (vite.status !== 0) process.exit(vite.status ?? 1);

await postbuild(id);
console.log(`Build ${id} -> dist/`);
