import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, contactLinks } from "../src/lib/phone.ts";
import {
  canSeeRecord,
  canEditRecord,
  validateRecord,
} from "../src/lib/domain.ts";
import { matchingProperties } from "../src/lib/matching.ts";

test("properties and partner offices accept a blank second phone but reject invalid filled numbers", () => {
  const property = {
    title: "House",
    type: "house",
    purpose: "sale",
    city: "Erbil",
    currency: "USD",
    phone: "07501234567",
  };
  const office = { name: "Office", phone: "07501234567" };
  for (const [table, record] of [
    ["properties", property],
    ["partner_offices", office],
  ] as const) {
    for (const phone_secondary of [
      undefined,
      null,
      "",
      "  ",
      "07701234567",
      "٠٧٧٠١٢٣٤٥٦٧",
      "+447700900123",
    ]) {
      assert.deepEqual(
        validateRecord(table, { ...record, phone_secondary }),
        [],
      );
    }
    for (const phone_secondary of ["123", "bad", "javascript:alert(1)"]) {
      assert.ok(
        validateRecord(table, { ...record, phone_secondary }).includes(
          "phone_secondary",
        ),
      );
    }
    assert.ok(
      validateRecord(table, {
        ...record,
        phone: "",
        phone_secondary: "07701234567",
      }).includes("phone"),
    );
  }
});

test("phone actions normalize Iraqi local and Kurdish digits", () => {
  assert.equal(normalizePhone("٠٧٥٠ ١٢٣ ٤٥٦٧"), "+9647501234567");
  assert.equal(normalizePhone("۰۷۷۰۱۲۳۴۵۶۷"), "+9647701234567");
  assert.equal(normalizePhone("00964 (750) 123-4567"), "+9647501234567");
  assert.deepEqual(contactLinks("+44 7700 900123"), {
    call: "tel:+447700900123",
    whatsapp: "https://wa.me/447700900123",
  });
  for (const value of [
    "",
    "abc",
    "123",
    "javascript:alert(1)",
    "07501234567ext2",
    "+000123456789",
  ])
    assert.equal(normalizePhone(value), null);
});
const profile = { id: "freelancer", role: "freelancer" as const, active: true };
const own = {
  id: "p1",
  source_contributor_id: "freelancer",
  created_by: "admin",
  status: "available",
};
const other = { ...own, id: "p2", source_contributor_id: "other" };
test("visibility respects source, assignments, revocation and disabled accounts", () => {
  assert.equal(canSeeRecord(profile, own, []), true);
  assert.equal(canSeeRecord(profile, other, []), false);
  const a = {
    property_id: "p2",
    request_id: null,
    assignee_id: "freelancer",
    status: "in_progress",
  };
  assert.equal(canSeeRecord(profile, other, [a]), true);
  assert.equal(
    canSeeRecord(profile, other, [{ ...a, status: "canceled" }]),
    false,
  );
  assert.equal(canSeeRecord({ ...profile, active: false }, own, []), false);
  assert.equal(canEditRecord(profile, other), false);
  assert.equal(canEditRecord(profile, { ...own, status: "sold" }), false);
});
test("validation rejects invalid ranges and contact values", () => {
  assert.ok(
    validateRecord("properties", { title: "", price: -1, phone: "123" }).length,
  );
  assert.ok(
    validateRecord("client_requests", {
      client_name: "A",
      phone: "07501234567",
      budget_min: 900,
      budget_max: 100,
    }).includes("budget"),
  );
  assert.equal(
    validateRecord("partner_offices", { name: "Office", phone: "07501234567" })
      .length,
    0,
  );
});
test("matching respects currency, type, location and purpose without excluding optional criteria", () => {
  const p = {
    id: "1",
    type: "house",
    purpose: "sale",
    city: "Erbil",
    neighborhood: "Ankawa",
    price: 150000,
    currency: "USD",
    area: 200,
    bedrooms: 3,
    status: "available",
  };
  const r = {
    type: "house",
    kind: "buy",
    city: "erbil",
    neighborhood: "",
    currency: "USD",
    budget_min: 100000,
    budget_max: 200000,
    area_min: null,
    area_max: null,
    bedrooms: null,
  };
  assert.equal(matchingProperties(r, [p]).length, 1);
  assert.equal(matchingProperties({ ...r, currency: "IQD" }, [p]).length, 0);
  assert.equal(matchingProperties({ ...r, kind: "rent" }, [p]).length, 0);
  assert.equal(matchingProperties({ ...r, kind: "sell" }, [p]).length, 0);
  assert.equal(matchingProperties(r, [{ ...p, status: "sold" }]).length, 0);
  assert.equal(matchingProperties({ ...r, area_min: 250 }, [p]).length, 0);
});
