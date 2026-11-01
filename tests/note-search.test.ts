import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesNote } from "../src/lib/note-search.ts";
test("notebook finds local and international phone formats, both phones, prices and Kurdish digits", () => {
  const r = {
    title: "خانووی عەنکاوە",
    phone: "+9647500000007",
    phone_secondary: "+9647700000007",
    price: 125000,
  };
  for (const q of [
    "07500000007",
    "٠٧٧٠٠٠٠٠٠٠٧",
    "+9647700000007",
    "125000",
    "١٢٥٠٠٠",
    "عەنکاوە",
  ])
    assert.equal(matchesNote(r, q), true, q);
  assert.equal(matchesNote(r, "07700000009"), false);
});
