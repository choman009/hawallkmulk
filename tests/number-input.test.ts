import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatNumericInput,
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
