import { test } from "node:test";
import assert from "node:assert/strict";
import { mutationErrorKey } from "../src/lib/mutation-errors.ts";
import { deleteDemoRecord } from "../src/lib/delete-record.ts";
import { initialDemo } from "../src/lib/demo.ts";

test("missing schema, access and session failures have actionable messages without exposing values", () => {
  for (const table of ["properties", "partner_offices"]) {
    assert.equal(
      mutationErrorKey({
        code: "PGRST204",
        message: `Could not find the 'phone_secondary' column of '${table}' in the schema cache`,
      }),
      "schemaUpdateRequired",
    );
  }
  assert.equal(
    mutationErrorKey({
      code: "PGRST202",
      message: "Could not find public.delete_record",
    }),
    "schemaUpdateRequired",
  );
  assert.equal(
    mutationErrorKey({ code: "42501", message: "row-level security" }),
    "permissionDenied",
  );
  assert.equal(
    mutationErrorKey({ code: "23514", message: "sensitive contact" }),
    "validationError",
  );
  assert.equal(mutationErrorKey({ code: "PGRST301" }), "sessionError");
  assert.equal(mutationErrorKey(new Error("sessionError")), "sessionError");
  assert.equal(
    mutationErrorKey({ code: "unknown", message: "private data" }),
    "genericError",
  );
});

test("demo deletion removes dependent tasks and updates but preserves unrelated records", () => {
  const data = initialDemo();
  const target = data.properties[0];
  const task = data.assignments.find((a) => a.property_id === target.id)!;
  data.assignment_updates.push({
    id: "test-update",
    assignment_id: task.id,
    author_id: data.profiles[0].id,
    note: "test",
    created_at: new Date().toISOString(),
  });
  const next = deleteDemoRecord(data, "properties", target.id);
  assert.ok(!next.properties.some((p) => p.id === target.id));
  assert.ok(!next.assignments.some((a) => a.property_id === target.id));
  assert.ok(!next.assignment_updates.some((u) => u.assignment_id === task.id));
  assert.equal(next.properties.length, data.properties.length - 1);
  assert.equal(data.properties.length, 6);
  const office = data.partner_offices[0];
  const officeDeleted = deleteDemoRecord(data, "partner_offices", office.id);
  assert.equal(officeDeleted.properties.length, data.properties.length);
  assert.ok(
    !officeDeleted.properties.some((p) => p.source_office_id === office.id),
  );
});
