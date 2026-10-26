import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Webhook } from "svix";
import {
  MESSAGE_CATALOG,
  renderMessage,
} from "../../lib/communications/templates";
import { verifyEmailEvent } from "../../lib/communications/webhook";
import { emailConfig } from "../../lib/communications/config";
const id = "00000000-0000-4000-8000-000000000031";
test("all operational templates use authenticated links and truthful, private content", () => {
  for (const kind of Object.keys(MESSAGE_CATALOG)) {
    const m = renderMessage(
      kind,
      id,
      "ready_for_pickup",
      "https://parcelsjm.vercel.app",
    );
    assert(m.subject.length > 5);
    assert(m.html.includes('lang="en"'));
    assert(m.text.includes(id));
    assert(!/Token|TRN|home address|filename|attachment:/.test(m.text));
    const links = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    assert(links.every((x) => x.startsWith("https://parcelsjm.vercel.app/")));
  }
  assert.match(
    renderMessage("document_uploaded", id, "", "https://parcelsjm.vercel.app")
      .text,
    /quarantine/,
  );
  assert.match(
    renderMessage("payment_verified", id, "", "https://parcelsjm.vercel.app")
      .text,
    /partial payment/i,
  );
  assert.throws(() =>
    renderMessage("made_up", id, "", "https://parcelsjm.vercel.app"),
  );
  assert.throws(() =>
    renderMessage("support_reply", id, "", "https://parcelsjm.vercel.app", 2),
  );
});
test("webhooks require the original signed payload and reject stale or forged signatures", () => {
  const secret =
      "whsec_" +
      Buffer.from("test-key-32-bytes-for-svix-fixture!").toString("base64"),
    svix = new Webhook(secret),
    now = new Date();
  const payload = JSON.stringify({
    type: "email.delivered",
    data: { email_id: "provider-test", tags: { notification_id: id } },
  });
  const signature = svix.sign("evt-fixture", now, payload);
  const headers = new Headers({
    "svix-id": "evt-fixture",
    "svix-timestamp": String(Math.floor(now.getTime() / 1000)),
    "svix-signature": signature,
  });
  assert.equal(verifyEmailEvent(payload, headers, secret)?.hint, id);
  assert.throws(() => verifyEmailEvent(payload + " ", headers, secret));
  const stale = new Date(Date.now() - 600000);
  headers.set("svix-timestamp", String(Math.floor(stale.getTime() / 1000)));
  headers.set("svix-signature", svix.sign("evt-fixture", stale, payload));
  assert.throws(() => verifyEmailEvent(payload, headers, secret));
});
test("email gates fail closed for previews, arbitrary links and unapproved modes", () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, {
      COMMUNICATIONS_ENABLED: "true",
      APP_BASE_URL: "https://parcelsjm.vercel.app",
      STAFF_NOTIFICATION_EMAIL: "staff@example.test",
      RESEND_API_KEY: "fixture",
      SUPABASE_SERVICE_ROLE_KEY: "fixture",
      NEXT_PUBLIC_SUPABASE_URL: "https://database.example.test",
      EMAIL_DELIVERY_MODE: "test",
    });
    assert(emailConfig());
    process.env.APP_BASE_URL = "https://evil.example";
    assert.equal(emailConfig(), null);
    process.env.APP_BASE_URL = "https://parcelsjm.vercel.app";
    process.env.VERCEL_ENV = "preview";
    process.env.EMAIL_DELIVERY_MODE = "live";
    assert.equal(emailConfig(), null);
  } finally {
    for (const k of Object.keys(process.env))
      if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});
test("atomic queue isolates customers, freezes retries, tracks monotonic delivery and prevents stale/replayed sends", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create table auth.identities(id uuid primary key,user_id uuid,identity_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to authenticated,service_role;`,
    );
    for (const f of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql") && !f.endsWith("_email_scheduler.sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    const a = id,
      b = "00000000-0000-4000-8000-000000000032",
      owner = "00000000-0000-4000-8000-000000000033";
    for (const [who, email] of [
      [a, "qa-a@example.test"],
      [b, "qa-b@example.test"],
      [owner, "qa-owner@example.test"],
    ])
      await db.query(
        `insert into auth.users values($1,$2,now(),'{"full_name":"Synthetic Person","phone":"8765550100","policy_version":"test"}')`,
        [who, email],
      );
    await db.exec(
      "update public.profiles set account_status='active';delete from public.notification_jobs;",
    );
    await db.query(
      "insert into private.communication_test_profiles values($1)",
      [a],
    );
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner')",
      [owner],
    );
    const as = async (who: string, role = "authenticated") => {
      await db.exec("reset role;set role " + role);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        who,
      ]);
    };
    const scalar = async (sql: string, args: unknown[] = []) =>
      Object.values(
        (await db.query<Record<string, unknown>>(sql, args)).rows[0],
      )[0] as string;
    await as(a);
    const request = "00000000-0000-4000-8000-000000000041";
    const pkg = await scalar(
      "select public.create_pre_alert($1,'MAIL-TEST','Sample store','','Sample goods',1,12,'USD','')",
      [request],
    );
    assert.equal(
      await scalar(
        "select public.create_pre_alert($1,'MAIL-TEST','Sample store','','Sample goods',1,12,'USD','')",
        [request],
      ),
      pkg,
    );
    await assert.rejects(
      db.query("select * from public.notification_jobs"),
      /permission/,
    );
    await assert.rejects(
      db.query(
        "select public.claim_email_jobs('test',gen_random_uuid(),'staff@example.test')",
      ),
      /permission/,
    );
    await assert.rejects(
      db.query("select public.notification_delivery_page()"),
      /Owner/,
    );
    await db.exec("reset role");
    assert.equal(
      Number(await scalar("select count(*)from public.notification_jobs")),
      1,
    );
    assert.equal(
      await scalar("select scope from public.notification_jobs"),
      "test",
    );
    await as("", "service_role");
    const token = "00000000-0000-4000-8000-000000000051";
    const job = (
      await db.query<{ id: string }>(
        "select * from public.claim_email_jobs('test',$1,'staff@example.test')",
        [token],
      )
    ).rows[0];
    assert(job);
    assert.equal(
      (
        await db.query(
          "select * from public.claim_email_jobs('test',gen_random_uuid(),'staff@example.test')",
        )
      ).rows.length,
      0,
    );
    const payload = {
      from: "Parcels JA <support@parcelsjm.com>",
      to: ["delivered@resend.dev"],
      subject: "Fixture",
      text: "Private reference",
      tags: [{ name: "notification_id", value: job.id }],
    };
    await db.query("select public.prepare_email($1,$2,$3)", [
      job.id,
      token,
      JSON.stringify(payload),
    ]);
    const frozen = await scalar("select public.prepare_email($1,$2,$3)", [
      job.id,
      token,
      JSON.stringify({ ...payload, text: "Changed" }),
    ]);
    assert.deepEqual(frozen, payload);
    assert.equal(
      await scalar(
        "select public.record_email_delivery('evt-one','provider-one','email.delivered',$1)",
        [job.id],
      ),
      "recorded",
    );
    await db.query(
      "select public.finish_email($1,$2,'provider-one','accepted',null)",
      [job.id, token],
    );
    assert.equal(
      await scalar("select state from public.notification_jobs where id=$1", [
        job.id,
      ]),
      "delivered",
    );
    assert.equal(
      await scalar(
        "select public.record_email_delivery('evt-one','provider-one','email.bounced',$1)",
        [job.id],
      ),
      "duplicate",
    );
    await db.query(
      "select public.record_email_delivery('evt-two','provider-one','email.sent',$1)",
      [job.id],
    );
    assert.equal(
      await scalar("select state from public.notification_jobs where id=$1", [
        job.id,
      ]),
      "delivered",
    );
    await db.query(
      "select public.record_email_delivery('evt-three','provider-one','email.complained',$1)",
      [job.id],
    );
    await db.query(
      "select public.record_email_delivery('evt-four','provider-one','email.bounced',$1)",
      [job.id],
    );
    assert.equal(
      await scalar("select state from public.notification_jobs where id=$1", [
        job.id,
      ]),
      "complained",
    );
    assert.equal(
      await scalar("select reason from private.email_suppressions"),
      "complained",
    );
    await db.exec("reset role");
    await db.query(
      "update auth.users set email='new-qa@example.test'where id=$1",
      [a],
    );
    await db.query(
      "insert into public.notification_jobs(event_key,profile_id,audience,recipient_email,scope,kind,resource_id,state)values('stale-recipient',$1,'customer','old@example.test','test','support_reply',$1,'pending')",
      [a],
    );
    await as("", "service_role");
    await db.query(
      "select public.claim_email_jobs('test',gen_random_uuid(),'staff@example.test')",
    );
    assert.equal(
      await scalar(
        "select state from public.notification_jobs where event_key='stale-recipient'",
      ),
      "suppressed",
    );
    await db.query(
      "insert into public.notification_jobs(event_key,audience,recipient_email,scope,kind,resource_id,state,attempts,first_attempt_at,lease_until)values('ambiguous','test','delivered@resend.dev','test','test_message',$1,'sending',1,now()-interval '24 hours',now()-interval '1 minute'),('exhausted','test','delivered@resend.dev','test','test_message',$1,'sending',5,now()-interval '1 hour',now()-interval '1 minute')",
      [a],
    );
    await db.query(
      "select public.claim_email_jobs('test',gen_random_uuid(),'staff@example.test')",
    );
    assert.equal(
      Number(
        await scalar(
          "select count(*)from public.notification_jobs where state='review'",
        ),
      ),
      2,
    );
    await as(owner);
    const page = await scalar("select public.notification_delivery_page()");
    assert(!JSON.stringify(page).includes("recipient_email"));
    await assert.rejects(
      db.query(
        "select public.retry_email_job($1,'Review expired provider window')",
        [job.id],
      ),
      /Not safe/,
    );
    await as(b);
    await assert.rejects(
      db.query("select public.notification_delivery_page()"),
      /Owner/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.notification_jobs"),
      /permission/,
    );
  } finally {
    await db.close();
  }
});
