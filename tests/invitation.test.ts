import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInvitation } from "../src/lib/invitation.ts";
test("invitations validate contact details and constrain administrative role creation", () => {
  const input = {
    name: " Member ",
    email: "member@example.com",
    phone: "٠٧٥٠١٢٣٤٥٦٧",
    role: "freelancer",
  };
  assert.equal(
    parseInvitation(input, { role: "admin", active: true })?.phone,
    "+9647501234567",
  );
  assert.equal(parseInvitation(input, { role: "staff", active: true }), null);
  assert.equal(parseInvitation(input, { role: "owner", active: false }), null);
  assert.equal(
    parseInvitation(
      { ...input, role: "admin" },
      { role: "admin", active: true },
    ),
    null,
  );
  assert.equal(
    parseInvitation(
      { ...input, role: "owner" },
      { role: "owner", active: true },
    ),
    null,
  );
  assert.equal(
    parseInvitation(
      { ...input, role: "admin" },
      { role: "owner", active: true },
    )?.role,
    "admin",
  );
  assert.equal(
    parseInvitation(
      { ...input, phone: "bad" },
      { role: "owner", active: true },
    ),
    null,
  );
  assert.equal(
    parseInvitation(
      { ...input, email: "bad" },
      { role: "owner", active: true },
    ),
    null,
  );
  assert.equal(
    parseInvitation({ ...input, phone: "" }, { role: "owner", active: true })
      ?.phone,
    "",
  );
});
