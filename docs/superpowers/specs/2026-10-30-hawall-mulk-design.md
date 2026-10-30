# Hawall mulk — product and system design

Date: 2026-10-30
Status: approved by the user on 2026-10-30. Implementation authorized.

## Intent

Replace a real estate office's paper notebooks with a simple internal daily-work application. Track properties, buyers' requirements, sellers, partner offices, and freelance contributors. User-facing content must support Sorani Kurdish and English completely, with light and dark themes.

This is an internal office system requiring login. A public property marketplace is outside this first release; this is a proposed interpretation of the user's office workflow.

## Confirmed requirements

- Name: Hawall mulk.
- Supabase for database/authentication/storage, prepared for user deployment on Vercel.
- Property types include houses, apartments, land, and other real estate.
- Record buyers' desired type, location, budget, and requirements; record sellers and their properties.
- Keep partner-office names, addresses, and owner/contact phone numbers.
- Track who supplied a property, including freelancers, even when office staff enter it on their behalf.
- Admin-managed accounts and different permissions; user profile includes name and phone.
- Freelancers see their own records and properties/requests explicitly assigned by owner/admin.
- Assign work on the original shared record, rather than creating duplicate copies. Work may involve finding a suitable property or selling one.
- Reference images guide spacious cards, sidebar navigation, clear hierarchy, restrained colors, and simple daily use.
- Build and verify in stages.
- Phone fields expose call (tel:) and WhatsApp (wa.me) actions. Normalize Iraqi local numbers to +964; accept other explicit international numbers. Invalid numbers do not produce actionable links. No automated messages are sent.

## Approaches considered

1. Assignment linked to the original record: current information and work progress stay together. Requires careful database access rules. Recommended and selected explicitly by the user.
2. Separate copies for each freelancer: easier conceptual separation, but prices, statuses, and notes can diverge. Rejected in favor of shared records.

Technology proposal (builder's choice): Next.js App Router with TypeScript, Supabase, and responsive CSS using reusable UI components. This fits Vercel deployment and keeps privileged account operations on the server. No Sites or Higgsfield hosting is required.

## Daily workflows and pages

### Login

Email and password login, logout, and password recovery. No public self-registration. An administrator invites or creates users through a protected server operation. The first owner is bootstrapped using documented setup steps; users cannot choose their own roles.

### Dashboard

Role-scoped counts, recent properties and requests, and pending assignments. Primary actions: add property, add request, and search. No decorative metrics or complex charting without useful underlying data.

### Properties

Searchable, filterable table with optional cards on narrow screens. Fields: reference number, title, type, offer purpose (sale/rent), city, neighborhood, address, price, currency (USD/IQD), area in square meters, bedrooms where applicable, description, status, photos, owner contact, source contributor or partner office, recorded-by user, and timestamps. Required fields: title, type, purpose, location, price/currency, and source. Zero-price or price-on-request behavior must be explicit in the form rather than silently treating missing prices as zero.

Property detail shows the record, permitted contact details, images, assignments, and work updates. Mark sold/rented/withdrawn rather than deleting completed records. Admin may archive records. Rentals and these statuses are proposed useful defaults, not additional user-confirmed requirements.

### Requests

Client name and phone, request type (buy/rent/sell), property type, desired location, budget range/currency, area range, bedrooms, notes, source contributor, assigned work, status, and dates. A seller request may link to a property without duplicating its property details. Buyer/rental requirements can show matching accessible properties using explicit filters; no automated AI claims. Match equal currencies; currency conversion is outside scope. Missing optional criteria do not exclude a record, and matches explain which criteria agree.

### Assignments / My work

Owner/admin selects an existing property or request, assignee, work type (find/sell/follow up), instructions, and optional due date. Assignment statuses: assigned, in progress, completed, canceled. Assignees add updates and change their assignment progress. Closing an assignment does not automatically mark a property sold.

Record access lasts while an assignment is assigned, in progress, or completed; canceling/revoking it removes assignment-based access immediately. Own-record access is independent. These lifecycle choices are builder proposals so completed work remains reviewable.

### Partner offices

Name, address, owner/contact name, phones, and notes. Owner/admin/staff can maintain the directory. Freelancers receive only the partner details embedded in a property/request they may access, not access to the complete directory.

### Team, profile, and settings

Owner/admin manages freelancer and staff accounts, activation, profile data, and allowed permissions. Every user can edit their own display name and phone. Owner manages administrator roles; admin cannot promote themselves or change owner access. Disable accounts without losing historical attribution. Settings cover office name/contact information and defaults; language/theme are per-user preferences.

## Permission model (proposed details)

| Role | Record visibility | Editing | Management |
|---|---|---|---|
| Owner | All office records | All records | All settings, users, admin roles, assignments |
| Admin | All office records | All records | Staff/freelancer accounts, assignments, office settings; no owner/admin-role escalation |
| Staff | All office records | Create and edit operational records | No account, role, or assignment management |
| Freelancer | Own contributed records plus explicitly assigned records | Create own records; edit own unsold/open records; add assignment updates on assigned records | Own profile and preferences only |

Freelancers cannot edit prices, client details, ownership, or source of someone else's assigned record. They can report proposed changes through work updates. Source attribution and entered-by identity are separate and immutable to freelancers. Admins can record a property on behalf of a contributor.

Record visibility includes the contact information needed to execute that assigned task; there is no global contact directory for freelancers. This is a proposed default to review with the user. Team permission settings may turn specific operational capabilities on/off within role limits; they must never widen a freelancer's visibility beyond own/assigned records or permit role escalation.

## Data model and security

- profiles: auth user ID, name, phone, role, active flag, language/theme.
- member_permissions: constrained operational capability overrides, writable only by authorized administrators.
- office_settings: single-office metadata and defaults.
- partner_offices: partner contacts and addresses.
- properties: listing facts, contact fields, source_contributor_id/source_office_id, created_by, state.
- client_requests: client requirements, source/creator attribution, optional linked seller property.
- property_images: property ID, private storage object path, order, metadata.
- assignments: exactly one property or request, assignee, type, instructions, status, due date, assigned_by.
- assignment_updates: assignment ID, author, note, timestamp.
- activity_log: minimal privileged/action history with actor, target, operation, timestamp; avoid dumping contact data or secrets.

PostgreSQL constraints enforce valid targets, ranges, statuses, nonnegative prices, and required relationships. Use versioned SQL migrations. Supabase Row Level Security protects every application table. Database policies, not client filters alone, enforce own/assigned visibility and updates. Safe server/database functions validate assignment targets and assignees. Reassigning ownership/source is privileged. Assigned-record access checks must not grant permission to unrelated linked records.

User-facing Supabase configuration uses its public/publishable key. Any service-role/admin key remains server-only, is never committed, and is used only after verifying the authenticated administrator. Authorization applies to server actions as well as database access. Disabled users lose data access even with an existing session. Private photo storage uses access policies and short-lived signed URLs; metadata/storage policies use the same record visibility rules.

Account creation requires real Supabase configuration. Local preview without credentials must be explicitly labeled demo mode, use fictional sample records, never imply authentication or production persistence, and remain separate from live data.

## UX, localization, and themes

Default Sorani (ckb) with RTL page direction; English uses LTR. Translate navigation, forms, validation, status labels, confirmations, empty/loading/error states, and accessibility labels. Phone numbers, emails, codes, and numeric amounts retain readable direction. Use a Kurdish-capable font with a local/system fallback. Format dates/numbers for the selected locale; store timestamps consistently. Keep currencies explicit.

Visual direction: light neutral workspace, white rounded cards, dark navigation emphasis, a restrained lime accent inspired by reference 1, and soft status colors inspired by reference 3. The dark theme uses corresponding semantic tokens. Prioritize lists and fast entry rather than a dense kanban board. Responsive sidebar becomes a mobile drawer. Forms group essential fields first and optional details second; show clear validation and save progress. Provide keyboard operation, visible focus, readable contrast, and labeled controls.

## Delivery stages and checks

1. Foundation and visual shell: bilingual layout, themes, navigation, login screens, labeled demo preview. Verify RTL/LTR and responsive behavior.
2. Data and authentication: migrations, profiles, owner bootstrap, RLS, storage, protected sessions, account administration. Verify own/assigned/forbidden access using multiple identities.
3. Office workflows: property/request CRUD, partners, filters, matching, assignment work and attribution. Verify create/edit/archive, assignment access and revocation, and invalid inputs.
4. Hardening and handoff: permission tests, type/build checks, relevant browser checks, environment example, setup guide, Supabase migration/bootstrap steps, and Vercel deployment instructions. Confirm no secrets are tracked.

Each stage is checked before proceeding; the final result must distinguish verified local functionality from integration steps awaiting a configured Supabase project. No automatic deployment is promised without the relevant account access and configuration.

## Non-goals and boundaries

No public marketplace, payments, accounting/commission calculation, chat, WhatsApp automation, or currency exchange service in this release. No real office data is seeded. One office organization is assumed; partner offices are directory entries, not tenants. Avoid making the interface complex for hypothetical future requirements.

## Review status

User approved the design and asked to begin, including phone and WhatsApp contact buttons. Implement in the existing workspace.
