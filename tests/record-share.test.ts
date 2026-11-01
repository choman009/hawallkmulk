import { test } from "node:test";
import assert from "node:assert/strict";
import { initialDemo } from "../src/lib/demo.ts";
import { dictionary } from "../src/lib/i18n.ts";
import { recordShareText, recordShareLink } from "../src/lib/record-share.ts";
import { validateRecord } from "../src/lib/domain.ts";
test("request secondary phone is optional and validates filled values", () => {
  const r = { ...initialDemo().client_requests[0] };
  for (const value of [undefined, null, "", "07700000001"])
    assert.deepEqual(
      validateRecord("client_requests", { ...r, phone_secondary: value }),
      [],
    );
  assert.ok(
    validateRecord("client_requests", {
      ...r,
      phone_secondary: "bad",
    }).includes("phone_secondary"),
  );
});
test("WhatsApp drafts include structured visible details, both phones and no internal identifiers", () => {
  const data = initialDemo(),
    d = dictionary("ckb"),
    t = (k: keyof typeof d) => d[k];
  for (const record of [
    data.properties[0],
    { ...data.client_requests[0], phone_secondary: "+9647700000099" },
  ]) {
    const text = recordShareText(record, t),
      link = recordShareLink(record, t);
    assert.ok(text.includes(record.phone));
    assert.ok(text.includes(record.phone_secondary!));
    assert.ok(text.includes("\n"));
    assert.ok(text.includes(d.type));
    assert.ok(!text.includes(record.id));
    assert.ok(!text.includes(record.created_by));
    assert.equal(new URL(link).origin, "https://wa.me");
    assert.equal(new URL(link).searchParams.get("text"), text);
  }
});
