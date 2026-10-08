// Pure SVG line chart builder (no dependencies, testable in Node).
export function buildLineChart(values, options = {}) {
  const { width = 300, height = 120, min = 0, max = 100, ticks = [100, 80, 60, 40], suffix = "%" } = options;
  const padL = 34;
  const padB = 16;
  const padT = 8;
  const padR = 8;
  const W = width;
  const H = height;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="presentation">`;
  for (const t of ticks) {
    const y = padT + ih - ((t - min) / (max - min)) * ih;
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>`;
    svg += `<text x="${padL - 4}" y="${y + 4}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.7">${t}${suffix}</text>`;
  }
  if (values.length === 0) {
    svg += `<text x="${padL + 8}" y="${padT + 20}" font-size="12" fill="currentColor" opacity="0.7">no data</text>`;
    svg += `</svg>`;
    return svg;
  }
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? padL + iw / 2 : padL + (i / (values.length - 1)) * iw;
    const clamped = Math.max(min, Math.min(max, v));
    const y = padT + ih - ((clamped - min) / (max - min)) * ih;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, v };
  });
  if (pts.length > 1) {
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    svg += `<path d="${esc(d)}" fill="none" stroke="currentColor" stroke-width="2"/>`;
  }
  for (const p of pts) {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="currentColor"><title>${Math.round(p.v)}${suffix}</title></circle>`;
  }
  // x labels: 1, middle, last
  const labels = new Set([0, Math.floor((pts.length - 1) / 2), pts.length - 1]);
  for (const i of labels) {
    const p = pts[i];
    if (!p) continue;
    svg += `<text x="${p.x}" y="${H - 2}" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${i + 1}</text>`;
  }
  svg += `</svg>`;
  return svg;
}
