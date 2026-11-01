import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatNumericInput,
  formatDisplayNumber,
  parseNumericInput,
} from "../src/lib/number-input.ts";
test("numeric fields group thousands while submitting exact numeric values", () => {
  for (const [raw, display, n] of [
    ["250000", "250,000", 250000],
    ["250000.75", "250,000.75", 250000.75],
    ["٢٥٠٠٠٠", "250,000", 250000],
    ["1,250,000", "1,250,000", 1250000],
    ["0", "0", 0],
  ] as const) {
    assert.equal(formatNumericInput(raw), display);
    assert.equal(parseNumericInput(display), n);
  }
  assert.equal(formatNumericInput(""), "");
  assert.equal(formatNumericInput("250000."), "250,000.");
});

test("display preserves decimals without rounding while grouping thousands", () => {
  for (const [value, expected] of [
    [7.5, "7.5"],
    [7.123456789, "7.123456789"],
    [250000.75, "250,000.75"],
    [250000, "250,000"],
    [0, "0"],
    [0.0000001, "0.0000001"],
    [-1250.125, "-1,250.125"],
  ] as const)
    assert.equal(formatDisplayNumber(value), expected);
});
