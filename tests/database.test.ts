import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  free: "00000000-0000-4000-8000-000000000003",
  other: "00000000-0000-4000-8000-000000000004",
  p1: "10000000-0000-4000-8000-000000000001",
  p2: "10000000-0000-4000-8000-000000000002",
  r1: "20000000-0000-4000-8000-000000000001",
  a1: "40000000-0000-4000-8000-000000000001",
};
test("PostgreSQL migration enforces own/assigned scope, progress, revocation, profile roles and image policies", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
   create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth,storage to authenticated; grant execute on function auth.uid() to authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
   grant select,insert,delete on storage.objects to authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300001_initial.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`insert into auth.users(id) values('${ids.owner}'),('${ids.admin}'),('${ids.free}'),('${ids.other}');
   update public.profiles set active=true; update public.profiles set role='owner' where id='${ids.owner}'; update public.profiles set role='admin' where id='${ids.admin}';
   insert into public.properties(id,title,type,purpose,city,phone,source_contributor_id,created_by) values
    ('${ids.p1}','Own','house','sale','Erbil','+9647501234567','${ids.free}','${ids.owner}'),
    ('${ids.p2}','Assigned','house','sale','Erbil','+9647501234567','${ids.other}','${ids.owner}');
   insert into public.client_requests(id,client_name,phone,kind,type,city,source_contributor_id,created_by) values('${ids.r1}','Client','+9647501234567','buy','house','Erbil','${ids.other}','${ids.owner}');
   insert into public.assignments(id,property_id,assignee_id,kind,assigned_by) values('${ids.a1}','${ids.p2}','${ids.free}','sell','${ids.owner}');
   insert into storage.objects(bucket_id,name) values('property-images','${ids.p2}/photo.jpg');`);
    async function asUser<T>(id: string, sql: string) {
      await db.exec(
        `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);`,
      );
      try {
        return await db.query<T>(sql);
      } finally {
        await db.exec("rollback");
      }
    }
    await t.test(
      "own and assigned properties readable; unrelated requests/partners hidden",
      async () => {
        assert.equal(
          (await asUser(ids.free, "select id from public.properties")).rows
            .length,
          2,
        );
        assert.equal(
          (await asUser(ids.free, "select id from public.client_requests")).rows
            .length,
          0,
        );
        assert.equal(
          (await asUser(ids.free, "select id from public.partner_offices")).rows
            .length,
          0,
        );
        assert.equal(
          (await asUser(ids.free, "select id from public.profiles")).rows
            .length,
          1,
        );
      },
    );
    await t.test(
      "own property edits work; assigned property price edits do not",
      async () => {
        assert.equal(
          (
            await asUser(
              ids.free,
              `update public.properties set price=1 where id='${ids.p1}' returning id`,
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await asUser(
              ids.free,
              `update public.properties set price=1 where id='${ids.p2}' returning id`,
            )
          ).rows.length,
          0,
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `update public.properties set source_contributor_id='${ids.other}' where id='${ids.p1}'`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `update public.properties set status='sold' where id='${ids.p1}'`,
          ),
        );
      },
    );
    await t.test(
      "freelancer can create an own request but cannot forge attribution",
      async () => {
        assert.equal(
          (
            await asUser(
              ids.free,
              `insert into public.properties(title,phone,type,purpose,city,source_contributor_id) values('New property','+9647501234567','house','sale','Erbil','${ids.free}') returning id`,
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await asUser(
              ids.free,
              `insert into public.client_requests(client_name,phone,kind,type,city,source_contributor_id) values('New','+9647501234567','buy','house','Erbil','${ids.free}') returning id`,
            )
          ).rows.length,
          1,
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `insert into public.client_requests(client_name,phone,kind,type,city,source_contributor_id) values('New','+9647501234567','buy','house','Erbil','${ids.other}')`,
          ),
        );
      },
    );
    await t.test(
      "read-only membership blocks operational writes but allows assigned progress",
      async () => {
        await db.exec(
          `update public.profiles set can_write=false where id='${ids.free}'`,
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `insert into public.properties(title,phone,type,purpose,city,source_contributor_id) values('Forbidden','+9647501234567','house','sale','Erbil','${ids.free}')`,
          ),
        );
        assert.equal(
          (
            await asUser(
              ids.free,
              `update public.properties set price=1 where id='${ids.p1}' returning id`,
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await asUser(
              ids.free,
              `update public.assignments set status='in_progress' where id='${ids.a1}' returning id`,
            )
          ).rows.length,
          1,
        );
        await db.exec(
          `update public.profiles set can_write=true where id='${ids.free}'`,
        );
      },
    );
    await t.test(
      "photo insert requires an editable existing property",
      async () => {
        assert.equal(
          (
            await asUser(
              ids.free,
              `insert into storage.objects(bucket_id,name) values('property-images','${ids.p1}/own.jpg') returning name`,
            )
          ).rows.length,
          1,
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `insert into storage.objects(bucket_id,name) values('property-images','${ids.p2}/assigned.jpg')`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.admin,
            `insert into storage.objects(bucket_id,name) values('property-images','bad-path')`,
          ),
        );
      },
    );
    await t.test(
      "assignment assignee may update progress and notes, never target or assignee",
      async () => {
        assert.equal(
          (
            await asUser(
              ids.free,
              `update public.assignments set status='in_progress' where id='${ids.a1}' returning id`,
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await asUser(
              ids.free,
              `insert into public.assignment_updates(assignment_id,note) values('${ids.a1}','Called owner') returning id`,
            )
          ).rows.length,
          1,
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `update public.assignments set request_id='${ids.r1}',property_id=null where id='${ids.a1}'`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `insert into public.assignments(request_id,assignee_id,kind) values('${ids.r1}','${ids.free}','find')`,
          ),
        );
      },
    );
    await t.test(
      "self and administrator privilege escalation are rejected",
      async () => {
        await assert.rejects(() =>
          asUser(
            ids.free,
            `update public.profiles set role='owner' where id='${ids.free}'`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.admin,
            `update public.profiles set role='admin' where id='${ids.free}'`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.owner,
            `update public.profiles set active=false where id='${ids.owner}'`,
          ),
        );
        assert.equal(
          (
            await asUser(
              ids.owner,
              `update public.profiles set can_write=false where id='${ids.free}' returning id`,
            )
          ).rows.length,
          1,
        );
      },
    );
    await t.test(
      "private image visibility follows assignment revocation",
      async () => {
        assert.equal(
          (await asUser(ids.free, "select * from storage.objects")).rows.length,
          1,
        );
        await db.exec(
          `update public.assignments set status='canceled' where id='${ids.a1}'`,
        );
        assert.equal(
          (await asUser(ids.free, "select id from public.properties")).rows
            .length,
          1,
        );
        assert.equal(
          (await asUser(ids.free, "select * from storage.objects")).rows.length,
          0,
        );
        await assert.rejects(() =>
          asUser(
            ids.free,
            `insert into public.assignment_updates(assignment_id,note) values('${ids.a1}','Forbidden')`,
          ),
        );
      },
    );
    await t.test(
      "staff can edit operational facts but cannot archive or restore records",
      async () => {
        await db.exec(
          `update public.profiles set role='staff' where id='${ids.other}'`,
        );
        assert.equal(
          (
            await asUser(
              ids.other,
              `update public.properties set price=2 where id='${ids.p1}' returning id`,
            )
          ).rows.length,
          1,
        );
        await assert.rejects(() =>
          asUser(
            ids.other,
            `update public.properties set status='archived' where id='${ids.p1}'`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.other,
            `update public.client_requests set status='archived' where id='${ids.r1}'`,
          ),
        );
        await assert.rejects(() =>
          asUser(
            ids.other,
            `insert into public.properties(title,type,purpose,city,phone,status) values('No','house','sale','Erbil','+9647501234567','archived')`,
          ),
        );
        await db.exec(
          `update public.properties set status='archived' where id='${ids.p1}'`,
        );
        assert.equal(
          (
            await asUser(
              ids.other,
              `update public.properties set status='available' where id='${ids.p1}' returning id`,
            )
          ).rows.length,
          0,
        );
        await db.exec(
          `update public.properties set status='available' where id='${ids.p1}'`,
        );
      },
    );
    await t.test(
      "source projection exposes only contacts for accessible records, never directory notes",
      async () => {
        await db.exec(`insert into public.partner_offices(id,name,phone,notes) values('30000000-0000-4000-8000-000000000001','Visible office','+9647501234567','Private directory note'),('30000000-0000-4000-8000-000000000002','Hidden office','+9647501234568','Hidden');
    update public.properties set source_office_id='30000000-0000-4000-8000-000000000001' where id='${ids.p1}';
    update public.properties set source_office_id='30000000-0000-4000-8000-000000000002' where id='${ids.p2}';`);
        const result = await asUser<{
          record_id: string;
          office_name: string;
          contributor_name: string;
        }>(ids.free, "select * from public.visible_record_sources()");
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].record_id, ids.p1);
        assert.equal(result.rows[0].office_name, "Visible office");
        assert.ok(
          !JSON.stringify(result.rows).includes("Private directory note"),
        );
        assert.ok(!JSON.stringify(result.rows).includes("Hidden office"));
      },
    );
    await t.test(
      "inactive user with a valid subject loses all operational access",
      async () => {
        await db.exec(
          `update public.profiles set active=false where id='${ids.free}'`,
        );
        assert.equal(
          (await asUser(ids.free, "select id from public.properties")).rows
            .length,
          0,
        );
        assert.equal(
          (await asUser(ids.free, "select * from public.office_settings")).rows
            .length,
          0,
        );
        assert.equal(
          (await asUser(ids.free, "select id from public.profiles")).rows
            .length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
