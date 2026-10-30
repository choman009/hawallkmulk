# Hawall mulk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a bilingual internal real estate workspace with Supabase security and Vercel setup.
**Architecture:** Next.js App Router provides a responsive client workspace and protected administrative server endpoints. Supabase stores normalized operational records with RLS; a clearly labeled offline demo exercises workflows before credentials are supplied.
**Tech Stack:** Next.js, React, TypeScript, Supabase SSR/client, CSS, Node test runner via tsx.
**Spec:** docs/superpowers/specs/2026-10-30-hawall-mulk-design.md

## Global Constraints

- Name: Hawall mulk.
- Supabase for database/authentication/storage, prepared for user deployment on Vercel.
- Build and verify in stages.
- Freelancers see their own records and properties/requests explicitly assigned by owner/admin.
- Assign work on the original shared record, rather than creating duplicate copies.
- Sorani Kurdish and English completely, with light and dark themes.
- Phone and WhatsApp links on saved phone numbers; invalid numbers have no active links.

## Review Focus

- Local Iraqi, Kurdish/Arabic-digit and international phone input must normalize safely.
- Revoked and disabled memberships must not retain data access.
- Own and assigned records must not leak unrelated requests or partner contacts.
- Mixed-currency or missing-criterion matching must not mislead users.
- Demo edits and persistent language/theme must never masquerade as authenticated server data.

### Task 1: Domain foundation and contact actions

**Files:** package.json, tsconfig.json, src/lib/domain.ts, src/lib/phone.ts, src/lib/matching.ts, tests/domain.test.ts.
**Interfaces:** normalizePhone(value:string):string|null; contactLinks(value:string):{call:string;whatsapp:string}|null; matchingProperties(request, properties): Property[]; canSeeRecord(profile, record, assignments):boolean.
- [x] Create package/config and write failing tests covering phone normalization, own/assigned access, inactive users, canceled assignments, currency/location/budget matching.
- [x] Run `npm test` and observe expected missing-module failure.
- [x] Implement domain types and pure rules; run `npm test` expecting all tests green.

### Task 2: Supabase schema and security

**Files:** supabase/migrations/202610300001_initial.sql, supabase/tests/access.sql, src/lib/supabase/{client,server}.ts, src/app/api/team/route.ts, .env.example.
**Interfaces:** getBrowserClient():SupabaseClient|null; getServerClient():Promise<SupabaseClient>; POST /api/team accepts name, email, role; server verifies active owner/admin and permitted target roles.
- [x] Define schema, constraints, audit triggers, bootstrap, own/assigned visibility, immutable attribution, scoped updates, private image storage and staff/admin capability checks.
- [x] Add transactional SQL access checks for freelancer create/edit/read, assigned progress, canceled/inactive access, assignment escalation, and storage visibility. Include Supabase-local execution instructions; do not claim DB tests executed without a database.
- [x] Implement SSR/session helpers and verified administrative invitation endpoint. Run TypeScript checks once app/config exists.

### Task 3: Bilingual workspace and daily workflows

**Files:** src/app/{layout,page,globals.css}, src/app/auth/callback/route.ts, src/components/{workspace,forms,icons,contact-actions}.tsx, src/lib/{i18n,demo,repository}.ts.
**Interfaces:** localized dictionary uses matching keys for ckb/en; repository loads session-scoped records and persists create/update/archive/assignment operations through Supabase or labeled demo storage.
- [x] Build shell, dashboard, tables/cards, search, details, property/request/partner forms, assignment updates, team invitation, settings, profile, login/recovery.
- [x] Implement complete RTL/LTR and theme switching, mobile navigation, accessible dialog/form feedback, photo upload, and safe call/WhatsApp actions.
- [x] Add meaningful tests for record validation and capability restrictions before implementing those rules; run tests and typecheck.

### Task 4: Verification and deployment handoff

**Files:** README.md, docs/SETUP-ckb.md, docs/PROGRESS.md, appropriate test corrections.
- [x] Run tests, TypeScript and production build. Use available browser UI for representative Kurdish/English, mobile, theme, CRUD, matching, and assignment interactions.
- [x] Request one fresh review of security and core workflows; fix important findings with regression tests where possible.
- [x] Document actual checked behavior, unexecuted Supabase integration checks, environment/bootstrap/recovery/Vercel steps and limitations. Keep secrets out of tracked files.

## Execution notes

User explicitly authorized starting implementation; continue inline without another approval round. The workspace is a new non-Git directory, so no worktree or commit history exists to preserve. Keep a persistent progress ledger rather than using Git-only skill scripts.

