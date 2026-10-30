import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AuthSessionMissingError,
  AuthApiError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { loadWorkspace } from "../src/lib/repository.ts";

function authClient(error: Error | null, user: null = null) {
  let recordReads = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user }, error }) },
    from: () => {
      recordReads++;
      throw new Error("Unexpected database read");
    },
  } as unknown as SupabaseClient;
  return { client, recordReads: () => recordReads };
}

test("first visit without a session opens login without an error or record reads", async () => {
  const stub = authClient(new AuthSessionMissingError());
  assert.equal(
    await loadWorkspace({ allowSignedOut: true, client: stub.client }),
    null,
  );
  assert.equal(stub.recordReads(), 0);
});

test("missing session remains an error during an authenticated operation", async () => {
  const stub = authClient(new AuthSessionMissingError());
  await assert.rejects(
    () => loadWorkspace({ client: stub.client }),
    /sessionError/,
  );
});

test("initial restoration does not silence rejected or failed authentication requests", async () => {
  for (const error of [
    new AuthApiError("Invalid JWT", 401, "bad_jwt"),
    new Error("Network unavailable"),
  ]) {
    const stub = authClient(error);
    await assert.rejects(
      () => loadWorkspace({ allowSignedOut: true, client: stub.client }),
      /sessionError/,
    );
    assert.equal(stub.recordReads(), 0);
  }
});
