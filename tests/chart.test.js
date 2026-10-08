import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLineChart } from "../chart.js";

describe("buildLineChart", () => {
  it("renders one dot per value", () => {
    const svg = buildLineChart([60, 80, 100]);
    assert.ok(svg.startsWith("<svg"));
    assert.equal((svg.match(/<circle/g) || []).length, 3);
  });

  it("handles empty data", () => {
    const svg = buildLineChart([]);
    assert.ok(svg.includes("no data"));
  });

  it("handles a single value", () => {
    const svg = buildLineChart([73]);
    assert.equal((svg.match(/<circle/g) || []).length, 1);
  });
});
