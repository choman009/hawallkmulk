# Hawall mulk

An internal real estate office workspace in Sorani Kurdish and English. Next.js 16, React, TypeScript and Supabase; ready to configure for Vercel.

## Run locally

Use Node.js 22 or newer (verified here with Node 26).

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Without Supabase variables, the app opens a clearly labeled **demo** containing fictional records. Demo changes stay in browser local storage. The role selector previews visibility; it is not authentication. Do not enter real office data in this mode. Reset using the demo toolbar button.

## Included

- Dashboard, searchable/filterable property and client-request lists, property cards, detail views, editable forms and archival.
- Source contributor attribution separate from the person entering a record.
- Buyer/rental request matching against accessible properties, using exact currency and explicit location/budget/area/bedroom criteria. No implicit currency conversions.
- Shared-record assignments for finding, selling and following up; progress and work notes.
- Partner directory for staff; only linked source names/office contact details for freelancers.
- Owner/admin/staff/freelancer access enforced in PostgreSQL, not only the interface.
- Administrator invitations, active-account and write-capability controls, personal profile/preferences, password recovery/setup.
- Private photo upload (JPG/PNG/WebP, maximum 5 MB each) when Supabase is connected.
- Call and WhatsApp buttons for property/client/partner contact numbers. Iraqi local and Arabic/Kurdish digit inputs normalize to international format. Links open the phone app or WhatsApp; no messages are sent automatically.
- Light/dark themes, RTL/LTR, locally bundled Kurdish and Latin fonts, responsive mobile layout.

## Supabase setup

1. Create a **new** Supabase project. Run the entire `supabase/migrations/202610300001_initial.sql` in its SQL Editor, then run `supabase/migrations/202610310001_secondary_phones.sql`, or apply all migrations in order through the Supabase CLI migration workflow. This migration creates the schema, RLS policies, auth profile trigger, audit triggers and a private `property-images` bucket. It is an initial migration, not an idempotent script for an existing populated schema.
2. Disable public sign-ups in Authentication settings. Configure Site URL and allowed Redirect URLs for your localhost and production domain, including `/auth/callback` and `/auth/confirm`.
3. Create the initial owner through **Authentication → Users → Add user**, using your own real email and a strong password. The auth trigger creates an inactive freelancer profile; it never trusts metadata to assign roles. Then run this in the trusted SQL Editor, replacing the email/name:

```sql
update public.profiles
set role = 'owner', active = true, name = 'Your name'
where id = (select id from auth.users where email = 'you@example.com');
```

4. Set the **Invite user** email template link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite">Accept invitation</a>
```

Set the **Reset password** template link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
```

These token-hash links are important: `/auth/confirm` verifies the token and opens password setup. The separate `/auth/callback` handles PKCE code redirects; default fragment-only invitation redirects should not be used with that route. Set the production Site URL before sending real invitations. Configure SMTP for reliable delivery and observe Supabase email limits.

5. Copy `.env.example` to `.env.local` and fill in values locally:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVER-ONLY-SERVICE-ROLE-KEY
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

The service-role key is required only by the protected invitation endpoint. Never put it in a `NEXT_PUBLIC_` variable or commit it. Use the same origin consistently for auth testing. Restart the dev server after changing environment variables; real login replaces the demo automatically when both public Supabase variables are set.

6. Sign in as owner. Update the office profile and invite staff/freelancers through Team & permissions. Owner may appoint administrators; admins may manage staff/freelancers but cannot promote administrators or alter owner privileges. `Allow record creation & editing` limits operational writes; assignment progress/notes remain available to assignees so read-only contributors can still report their work.

## Access behavior

- Owner/admin sees all office records. Staff sees operational records and the partner directory, but cannot manage accounts, assign work or archive/restore records.
- Freelancers see records whose **source contributor** is themselves, plus records assigned to them. Being the typist alone does not imply ownership. They may edit their own available properties/open requests but cannot change someone else's assigned listing facts, price or source.
- Assigned work exposes that record's client/property contact details and linked partner-office contact details. The source projection contains only names/contact fields, never unrelated profile phones or partner-directory notes.
- Completed assignments retain record access for reviewing completed work. Cancel the assignment to revoke assignment-based access. Own-source access remains independent.
- RLS blocks subsequent reads/writes immediately after revocation or deactivation. The client refreshes its loaded data every minute. Previously downloaded data cannot be recalled, and already-issued photo URLs remain valid for up to 60 seconds. Avoid sharing signed URLs.
- Archive preserves history. Owner/admin deletion uses a private tombstone registry and restrictive RLS to remove records and dependent assignments from access. It retains underlying rows and private files for database maintenance recovery; there is no public hard-delete policy. Activity logs record deletion actors and targets.

## Verify

```powershell
npm test
npm run typecheck
npm run build
```

The database tests execute the actual migration and PostgreSQL RLS/triggers using PGlite, with minimal `auth`/`storage` schemas to simulate Supabase. They cover source/assignment visibility, updates, attribution forgery, role escalation, staff archive restrictions, scoped contacts, revocation, private image policies and inactive accounts. They do not simulate the Supabase Auth service, SMTP, REST API or object delivery.

Before using real data, verify on your configured Supabase project with separate owner, staff and freelancer accounts: invitation/password setup, own/assigned access, source contact projections, edits, revocation, disabled accounts, upload/view/remove photos, recovery links and production redirects. The tests are a useful database check, not a claim of live Supabase verification.

## Deploy on Vercel

1. Put the project into a private Git repository and import it into Vercel, choosing the Next.js framework preset. Use `npm run build`; no static export or custom output directory is needed.
2. Add the four environment variables above to the intended Vercel environment. Set `NEXT_PUBLIC_SITE_URL` to your exact HTTPS production domain. Rebuild after modifying public environment variables.
3. Update Supabase Site URL, redirect allowlist and email templates for that domain. Check the SQL migration has been applied to the same project specified in the variables.
4. Deploy and perform the live-account checklist. Do not publish a demo containing real contact information.

No Supabase project or Vercel deployment was created automatically; account access/configuration was not supplied.

## Project map

### Office branding and mobile home screen

The supplied office logo is used in the workspace and login screen. Browser title, application name, Apple web-app title, and manifest name/short name are all `Hawall mulk`. Android icons include 192px/512px variants and a separately padded maskable icon; Apple uses a 180px touch icon. The manifest opens the home-screen app in standalone mode.

After deploying a branding update, remove an existing old home-screen shortcut and add the site again if the device still shows the old title/icon. Generated assets can be refreshed from `public/brand/logo-original.jpg` with `node scripts/prepare-brand.mjs`; the script only crops/resizes the provided artwork.

- `src/components`: workspace shell, forms, details, assignments, team/settings and authentication.
- `src/lib`: domain rules, bilingual dictionary, phone links, matching, demo/repository and Supabase clients.
- `src/app/api/team`: server-only verified administrator invitations.
- `src/app/auth`: token-hash verification, PKCE callback and password setup.
- `supabase/migrations`: database schema/security/storage.
- `tests`: domain and real PostgreSQL policy regression tests.
- `docs/SETUP-ckb.md`: Kurdish setup guide.

Reference documentation: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase storage policies](https://supabase.com/docs/guides/storage/security/access-control), [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934).

### Updating an existing project: optional second phone

Run only `supabase/migrations/202610310001_secondary_phones.sql` in Supabase SQL Editor. This repeatable migration preserves records and adds optional second phone numbers to properties and partner offices, including their scoped contact projection. Do not rerun the initial migration. Deploy the updated app after applying this file.

### Updating an existing project: administrator deletion

Apply `202610310001_secondary_phones.sql` first if it has not already succeeded, then run `supabase/migrations/202610310002_record_deletion.sql`. Both incremental files are safe to repeat. Never rerun the initial migration on an existing project. The second migration adds the owner/admin deletion RPC, private tombstones, access policies and deleted-link guards. A deleted office keeps its properties and requests, while its directory contact stops being projected. Deleting properties/requests also removes their assignments and updates from access. Existing signed photo URLs expire within 60 seconds. Database maintenance can recover retained rows by removing the corresponding tombstones; no restore UI is provided. Demo deletion removes only local fictional data.

If a save reports a database update requirement, check these files succeeded against the same Supabase project as the Vercel environment variables. A filled second phone cannot be stored before the first update. The app now distinguishes schema, session, access, constraint and linked-record failures without displaying private database error values. Local PostgreSQL tests verify behavior; the production schema and PostgREST service still need verification in your Supabase project.
