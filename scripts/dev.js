// Dev server: zero-dependency static file server for local development.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const useDist = process.argv.includes("--dist");
const root = useDist ? path.resolve("dist") : path.resolve(".");
const port = Number(process.env.PORT || 8080);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, path.normalize(p).replace(/^[/\\]+/, ""));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
});

server.listen(port, () => {
  console.log(`Daily English Reading Check dev server: http://localhost:${port}/`);
});
