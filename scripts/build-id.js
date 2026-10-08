// Single source of the per-deploy build id (cache-buster).
export function buildId() {
  if (process.env.BUILD_ID) return process.env.BUILD_ID;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 8);
  return Date.now().toString(36);
}
