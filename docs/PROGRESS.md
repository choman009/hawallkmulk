# Execution ledger — 2026-10-30-hawall-mulk

Plan: docs/superpowers/plans/2026-10-30-hawall-mulk.md
Spec: docs/superpowers/specs/2026-10-30-hawall-mulk-design.md

User authorized implementation, including WhatsApp/call actions. Proceed inline in the specified new directory. No Git repository exists, so Git-only task scripts/commits and worktree setup are inapplicable. No live Supabase credentials have been supplied. Demo must remain clearly labeled; SQL integration verification remains pending until a Supabase instance is available.

## Completed implementation

- Task 1: domain/contact/matching/access rules. Missing-module RED observed, then 4 domain tests GREEN. Arabic and Kurdish digit phones produce safe international call/WhatsApp links.
- Task 2: migration, auth profile bootstrap, role/record/assignment/storage RLS, scoped source contacts, invitation endpoint and auth routes. Added PGlite to execute actual PostgreSQL migration/policies in a local simulated Supabase schema. This replaced the planned standalone SQL test script with repeatable automated tests.
- Task 3: bilingual workspace, dashboard, property/request/partner entry and details, filters/cards, matching, assignments/notes/progress, team permissions/invites, settings/profile, login/recovery/setup and private photos. Fonts are bundled locally.
- Task 4: independent review performed by implementation_review. No Critical findings. Both Important findings fixed: staff archival is blocked by SQL and UI; scoped partner contact projection is available on accessible records. Regression tests observed RED then GREEN. Source contributor names use the same scoped projection without widening the profile directory.

## Investigation and rulings

- Initial npm registry access failed with ENOTFOUND in the network sandbox. Normal npm registry dependencies were installed after approved escalation. No credentials were required or exposed.
- PostgreSQL tests exposed a trigger referencing a property-only/missing field and SELECT policies unable to see an INSERT RETURNING row. Nested record-type checks and row-based source visibility corrected both. Existing regression tests now pass.
- Per-user preferences apply at initial authenticated load and login. Periodic refresh does not reset unsaved local selections.
- Operational write capability uses the constrained `profiles.can_write` flag rather than a free-form permissions table. It limits create/edit operations; assigned progress reporting remains available. This preserves the approved visibility boundary and is documented in README.
- Private image signed URLs expire after 60 seconds; existing downloaded bytes cannot be revoked. Database access revokes immediately, loaded client data refreshes every minute. README describes these practical limits.
- The workspace is dedicated and not a Git checkout, so no worktree, commit, push or deployment was created.

## Browser checks performed

- Sorani RTL and English LTR, theme switching, desktop and 390px mobile layout, mobile navigation.
- Created QA property using Arabic-digit Iraqi local phone; verified normalized call/WhatsApp hrefs without initiating calls or sending messages.
- Assigned that same record to a freelancer; verified it becomes visible with no price-edit action. Added a work update and changed assignment progress.
- Rejected reversed client budget range, then saved a valid buyer request and verified the matching-property result.
- Linked partner office to a property and confirmed freelancer receives that contact on the assigned record without a partner-directory navigation item.

## Verification limits

No real Supabase/Vercel project configuration was supplied. Live email delivery, cross-device Supabase sessions, REST integration, real Storage object delivery and production redirects remain unverified. Setup instructions explicitly require token-hash invitation/recovery email templates. All records used in browser checks were fictional.

## Final verification

2026-10-30: 17 tests passed, TypeScript check passed, production build passed, and Prettier check passed. Production preview served successfully at http://127.0.0.1:3000. Login/demo entry and team contact creation were exercised with fictional inputs; reset restored the clean demo. Screenshot: docs/screenshots/dashboard-ckb.jpg. No production credentials, live project mutation, email delivery, or deployment was performed.


## Kurdish typography revision

Bundled Noto Kufi Arabic locally for Kurdish headings/navigation/actions, paired with Noto Sans Arabic for body/forms. Kurdish body text is 15px, common labels/rows 14px, metadata at least 12px. Removed negative heading tracking for Arabic, adjusted line height and sidebar width. Production build passed. Browser verified both fonts loaded, 15px body and 14px rows; preview refreshed. Screenshot: docs/screenshots/typography-ckb.jpg. No application behavior changed.

