# 100mph — Backend Build Specification

**Status:** the React Native client is built and running end to end against local mock data. There is no backend. This document is the complete specification for the server side: the data model, the API contract, the domain flows, the decisions that keep those flows from conflicting, and the order to build it in.

It is written against the code as it exists today. Every client seam is named with its file, so nothing here is speculative.

---

## 1. What exists today

An Expo Router (SDK 57 / RN 0.86 / React 19) app for a physiotherapist-led rehab program.

| Layer | Where | State |
|---|---|---|
| Routing | [app/](app/) — `(auth)`, `(tabs)`, four modals | Complete |
| Design system | [src/theme/](src/theme/), [src/components/ui/](src/components/ui/) | Complete, dark/light |
| Domain types | [src/data/types.ts](src/data/types.ts) | Complete — snake_case, already shaped for Postgres |
| Mock data | [src/data/mock.ts](src/data/mock.ts) | The entire "backend" today |
| Derivations | [src/data/selectors.ts](src/data/selectors.ts), [src/data/calendar.ts](src/data/calendar.ts) | Complete, pure functions |
| State | Five React context providers, each backed by `AsyncStorage` | Complete, device-local |

The five providers are the **integration seams**. Each one already isolates "where the data comes from" behind a hook, which is why this is a data-source swap and not a rewrite:

| Provider | File | Storage key | Becomes |
|---|---|---|---|
| `AuthProvider` | [src/auth/AuthProvider.tsx](src/auth/AuthProvider.tsx) | `app.auth.phone` | Real OTP + password auth, token store |
| `ProgramProvider` | [src/program/ProgramProvider.tsx](src/program/ProgramProvider.tsx) | `app.program.selected` | `users.active_program_id` |
| `ScheduleProvider` | [src/schedule/ScheduleProvider.tsx](src/schedule/ScheduleProvider.tsx) | `app.schedule.{programId}`, `app.completed.{programId}` | Schedule versions + session logs |
| `MembershipProvider` | [src/membership/MembershipProvider.tsx](src/membership/MembershipProvider.tsx) | `app.membership` | Razorpay subscriptions, webhook-driven |
| `CheckInProvider` | [src/checkin/CheckInProvider.tsx](src/checkin/CheckInProvider.tsx) | `app.checkins` | `check_ins` table |

Plus one content seam: `getProgramData(programId)` in [src/program/programData.ts](src/program/programData.ts#L34) — currently returns identical content for all four programs. This is deliberate and documented in the file. It is the single function that becomes an API call.

---

## 2. Source-of-truth decisions

These are the decisions that stop the flows from conflicting. **Read this section before writing any table.** Each one resolves a real ambiguity in the current types, and getting any of them wrong produces a system that drifts silently.

### 2.1 The weekly template is the plan; dated rows are only facts that happened

`types.ts` defines a `Session` table with `scheduled_date` and `status`, implying the server pre-materializes a dated row per training day. The client does not work that way: [`buildWeek`](src/data/selectors.ts#L58) derives the seven real dates from a `ScheduleMap` template plus a flat list of completed dates, with `resolveStatus` computing `completed | scheduled | upcoming | rest | missed` on the fly.

**Decision: the client's model wins. The server never pre-materializes scheduled sessions.**

- `user_schedule_days` holds the plan — 7 rows per user per program.
- `session_logs` holds only sessions that were actually completed. Append-only history.
- There is no `GET /week` endpoint. The client already computes the week correctly, including timezone handling.

*Why:* pre-materializing means every schedule edit has to reconcile future rows, and a background job has to create rows forever. The template is small, exact, and correct at any horizon. **Consequence:** the `Session` interface in `types.ts` is renamed and narrowed to a completion log — see §8.1.

### 2.2 Schedules are versioned with an effective date

[`resolveStatus`](src/data/selectors.ts#L32) marks a past day `missed` if the current schedule has a session on it, `rest` if it does not. Because the client stores one mutable `ScheduleMap`, **editing your schedule today rewrites last Tuesday's history.** Move Flow off Tuesday and a missed Tuesday retroactively becomes a rest day.

**Decision: `user_schedules` is versioned with `effective_from`. Past days resolve against the version that was live on that date.**

`PUT /schedule` creates a new version rather than mutating rows. Default `effective_from` is the **Monday of the current week** — mid-week edits should not rewrite days already lived. The client sends the whole `ScheduleMap`; the server diffs it.

### 2.3 A session log records what was done, not just when

[`completeSession(iso)`](src/schedule/ScheduleProvider.tsx#L145) stores only a date string. Which session type was performed is inferred from the *current* schedule at read time — so §2.2's edit also rewrites what you did.

**Decision: `session_logs` snapshots `session_type_id` at completion time**, plus the prescription text per exercise. History becomes immutable. This is also what makes the coach view and adherence metrics trustworthy.

### 2.4 Denormalized counters are server-computed and read-only

`Progress.deposits_made` and `Progress.workouts_completed` are written by the client as the constants `1` and `0` ([CheckInProvider.tsx:70-71](src/checkin/CheckInProvider.tsx#L70-L71)). They are never updated when a session completes. Today they are decorative; wired to a server they become a lie.

**Decision: the client stops sending them. The server derives them from `session_logs` and returns them read-only.** Reject them if present in a write body.

### 2.5 Dates are the user's local calendar day; timestamps are UTC

[calendar.ts](src/data/calendar.ts#L53) deliberately avoids `toISOString()` so the date is the device's local day. This is correct and must be preserved.

**Decision:**
- `local_date` columns are Postgres `date`. Never a timestamp, never derived server-side from `now()`.
- `completed_at`, `created_at`, `updated_at` are `timestamptz` in UTC.
- The **client** supplies `local_date`. The server validates it is within `[today_utc - 2, today_utc + 2]` to bound clock abuse, and rejects otherwise.
- `users.timezone` (IANA, default `Asia/Kolkata`) is required — server-side cron for reminders and streaks cannot exist without it. The client sends it from `Intl.DateTimeFormat().resolvedOptions().timeZone` on every login.

*Why not recompute server-side:* a user training at 11:30pm IST would have their session filed to the next day by a UTC server. The device knows what day it is for the person; the server does not.

### 2.6 Entitlement is server-side and never trusted from the client

`MembershipProvider.cancelMembership()` sets a local flag. `changePlan` computes `renewsOn` as `started_at + duration_days` on the device. None of this can gate content.

**Decision: subscription state is written *only* by payment-provider webhooks.** `GET /me` returns a computed `entitlement` object; every content and media endpoint checks it server-side. `renews_on` is a server field, not a client computation — it must survive proration, failed payments, and retries, none of which `+ duration_days` models.

### 2.7 Program defaults and user schedules are different tables

`WeeklyScheduleEntry` carries a `user_id` but is used to build `defaultSchedule` — a program-level template ([mock.ts](src/data/mock.ts), `weeklySchedule` → `defaultSchedule`). One type is doing two jobs.

**Decision: split.** `program_default_schedule` (program-scoped, no user) seeds `user_schedule_days` (user-scoped) the first time a user picks a program. `ScheduleProvider.isDefault` compares against the program default returned in the content bundle.

### 2.8 The client talks to an API layer, never to the database directly

Supabase's PostgREST + RLS is tempting and fast. Do not point the app at it.

**Decision: one versioned HTTP API (`/v1`) in front of Postgres. RLS stays on as defense in depth, not as the access layer.**

*Why:* the client's shapes are not the table shapes (`ScheduleMap` is a 7-key object, not 7 rows; `ProgramData` is a joined bundle). Entitlement checks, billing, media signing, and OTP cannot live in RLS. And a shipped mobile app cannot be migrated in lockstep with a schema — you need a contract you can version. Reads and writes both go through the API so there is exactly one path to reason about.

---

## 3. Recommended stack

| Concern | Choice | Note |
|---|---|---|
| Database | Postgres 15+ (Supabase or RDS) | Types already mirror it |
| API | Node 20 + Hono or Fastify, TypeScript, deployed on Fly/Railway/Cloud Run | Share the `types.ts` shapes as a published package |
| Auth | Own JWT issuance (access 15m / refresh 30d, rotating) over Supabase Auth or a plain `users` table | See §5.1 for why OTP is custom |
| SMS OTP | MSG91 or Twilio Verify | Indian numbers; DLT-registered sender required for India |
| Payments | Razorpay Subscriptions | Prices are ₹; Razorpay handles UPI/cards/netbanking natively |
| Media | Mux or Cloudflare Stream | Do not roll your own HLS transcoding |
| Files/images | S3 or Supabase Storage + CDN | |
| Push | Expo Push Notifications | Client is Expo; no APNs/FCM plumbing needed |
| Jobs | pg-boss (Postgres-backed) or Inngest | Timezone-aware reminders, streak rollups |
| Observability | Sentry (client + server), structured JSON logs, OpenTelemetry traces | |

Keep the API stateless. Everything schedulable is a Postgres-backed job so there is one durable store.

---

## 4. Data model

Postgres DDL, elided to the essentials. `id uuid primary key default gen_random_uuid()` throughout — or UUIDv7 for the tables the client generates ids for (§7.2).

### 4.1 Identity and access

```sql
create type user_role as enum ('member', 'coach', 'admin');

create table users (
  id                uuid primary key,
  full_name         text not null,
  email             citext unique,
  phone             text unique,                    -- E.164, e.g. +919000000000
  avatar_url        text,
  timezone          text not null default 'Asia/Kolkata',
  role              user_role not null default 'member',
  active_program_id uuid references programs(id),
  member_since      date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  check (email is not null or phone is not null)    -- at least one identity
);

-- No public sign-up: login.tsx says "Access is provisioned by your coach".
create table invites (
  id          uuid primary key,
  phone       text,
  email       citext,
  program_id  uuid references programs(id),
  plan_id     uuid references plans(id),
  created_by  uuid not null references users(id),
  expires_at  timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references users(id)
);

create table otp_challenges (
  id           uuid primary key,
  phone        text not null,
  code_hash    text not null,                       -- bcrypt/argon2. Never store the code.
  attempts     smallint not null default 0,
  expires_at   timestamptz not null,                -- now() + 5 minutes
  consumed_at  timestamptz,
  request_ip   inet,
  created_at   timestamptz not null default now()
);
create index on otp_challenges (phone, created_at desc);

create table refresh_tokens (
  id          uuid primary key,
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  device_id   text,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table push_tokens (
  id          uuid primary key,
  user_id     uuid not null references users(id) on delete cascade,
  expo_token  text not null unique,
  platform    text not null check (platform in ('ios','android')),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz
);
```

### 4.2 Program content (authored, mostly static)

```sql
create table programs (
  id           uuid primary key,
  name         text not null,
  slug         text not null unique,
  tagline      text not null,
  icon         text not null,                       -- Ionicons glyph name
  sort_order   int not null default 0,
  is_published boolean not null default false,
  content_version int not null default 1,           -- bumped on any content write; drives ETag
  created_at   timestamptz not null default now()
);

create table session_types (
  id                  uuid primary key,
  program_id          uuid not null references programs(id) on delete cascade,
  name                text not null,
  description         text not null,
  icon                text not null,
  is_primary          boolean not null default false,
  frequency_per_week  smallint not null,
  approx_duration_min smallint not null,
  sort_order          int not null default 0
);

create table exercises (
  id                 uuid primary key,
  program_id         uuid not null references programs(id) on delete cascade,
  name               text not null,
  focus              text not null,
  video_asset_id     uuid references media_assets(id),
  thumbnail_asset_id uuid references media_assets(id),
  prerequisites      text not null default 'None',
  instructions       text not null,
  purpose            text not null,
  is_published       boolean not null default true
);

create table session_exercises (
  id              uuid primary key,
  session_type_id uuid not null references session_types(id) on delete cascade,
  exercise_id     uuid not null references exercises(id),
  sort_order      int not null,
  prescription    text not null,                    -- '3 x 2m holds'
  unique (session_type_id, sort_order) deferrable initially deferred
);

-- §2.7: the program's template, distinct from any user's plan.
create table program_default_schedule (
  program_id      uuid not null references programs(id) on delete cascade,
  day_of_week     text not null check (day_of_week in
                    ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  session_type_id uuid references session_types(id),  -- null = rest
  primary key (program_id, day_of_week)
);

create table signature_exercises (
  id          uuid primary key,
  program_id  uuid not null references programs(id) on delete cascade,
  name        text not null,
  description text not null,
  is_central  boolean not null default false
);

create table progression_levels (
  id                     uuid primary key,
  signature_exercise_id  uuid not null references signature_exercises(id) on delete cascade,
  name                   text not null,
  level                  smallint not null,
  goal_label             text not null,
  metric                 text not null check (metric in ('time','reps')),
  unique (signature_exercise_id, level)
);

create table learn_content (
  id                 uuid primary key,
  program_id         uuid not null references programs(id) on delete cascade,
  kind               text not null check (kind in ('mini_lesson','longform')),
  title              text not null,
  subtitle           text not null,
  body_md            text,
  thumbnail_asset_id uuid references media_assets(id),
  video_asset_id     uuid references media_assets(id),
  sort_order         int not null default 0,
  is_published       boolean not null default false
);

-- humanBodyTopics in mock.ts — global, not program-scoped.
create table learn_topics (
  id uuid primary key, title text not null, subtitle text not null,
  icon text not null, sort_order int not null default 0
);
```

### 4.3 User state

```sql
create table user_programs (
  id         uuid primary key,
  user_id    uuid not null references users(id) on delete cascade,
  program_id uuid not null references programs(id),
  started_at timestamptz not null default now(),
  unique (user_id, program_id)
);

-- §2.2: versioned. Never updated in place.
create table user_schedules (
  id             uuid primary key,
  user_id        uuid not null references users(id) on delete cascade,
  program_id     uuid not null references programs(id),
  version        int not null,
  effective_from date not null,
  created_at     timestamptz not null default now(),
  unique (user_id, program_id, version)
);
create index on user_schedules (user_id, program_id, effective_from desc);

create table user_schedule_days (
  schedule_id     uuid not null references user_schedules(id) on delete cascade,
  day_of_week     text not null,
  session_type_id uuid references session_types(id),   -- null = rest
  primary key (schedule_id, day_of_week)
);

-- §2.1 + §2.3: only completed sessions. Immutable facts.
create table session_logs (
  id              uuid primary key,                  -- client-generated UUIDv7
  user_id         uuid not null references users(id) on delete cascade,
  program_id      uuid not null references programs(id),
  session_type_id uuid not null references session_types(id),  -- snapshot
  local_date      date not null,
  completed_at    timestamptz not null default now(),
  source          text not null check (source in ('guided','logged')),
  duration_sec    int,
  created_at      timestamptz not null default now(),
  unique (user_id, program_id, local_date)            -- one per day; makes writes idempotent
);
create index on session_logs (user_id, local_date desc);

create table session_log_exercises (
  id                     uuid primary key,
  session_log_id         uuid not null references session_logs(id) on delete cascade,
  exercise_id            uuid not null references exercises(id),
  sort_order             int not null,
  completed              boolean not null default false,
  prescription_snapshot  text not null
);

create table check_ins (
  id            uuid primary key,                    -- client-generated UUIDv7
  user_id       uuid not null references users(id) on delete cascade,
  local_date    date not null,
  pain_score    smallint check (pain_score between 0 and 10),
  pain_location text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, local_date)                       -- matches the client's one-per-day upsert
);
create index on check_ins (user_id, local_date desc);

create table user_progressions (
  id                           uuid primary key,
  user_id                      uuid not null references users(id) on delete cascade,
  signature_exercise_id        uuid not null references signature_exercises(id),
  current_progression_level_id uuid not null references progression_levels(id),
  updated_at                   timestamptz not null default now(),
  unique (user_id, signature_exercise_id)
);

create table progression_events (
  id                    uuid primary key,
  user_id               uuid not null references users(id) on delete cascade,
  signature_exercise_id uuid not null references signature_exercises(id),
  from_level_id         uuid references progression_levels(id),
  to_level_id           uuid not null references progression_levels(id),
  reason                text not null check (reason in ('self_reported','coach_set','auto')),
  actor_id              uuid references users(id),
  created_at            timestamptz not null default now()
);
```

### 4.4 Billing

```sql
create type subscription_status as enum
  ('pending','trialing','active','past_due','cancelled','expired');

create table plans (
  id                uuid primary key,
  name              text not null,                  -- 'Monthly'
  description       text not null,
  duration_days     smallint not null,
  amount_minor      int not null,                   -- 149900 = ₹1,499. NEVER a float.
  currency          char(3) not null default 'INR',
  price_label       text not null,                  -- display only: '₹1,499 / month'
  provider_plan_id  text,                           -- Razorpay plan id
  is_active         boolean not null default true,
  sort_order        int not null default 0
);

create table subscriptions (
  id                       uuid primary key,
  user_id                  uuid not null references users(id) on delete cascade,
  plan_id                  uuid not null references plans(id),
  provider                 text not null default 'razorpay',
  provider_subscription_id text unique,
  status                   subscription_status not null default 'pending',
  current_period_start     date not null,
  current_period_end       date not null,           -- §2.6: this is renews_on. Server-owned.
  cancel_at_period_end     boolean not null default false,
  started_at               timestamptz not null default now(),
  cancelled_at             timestamptz,
  updated_at               timestamptz not null default now()
);
create unique index one_live_sub_per_user on subscriptions (user_id)
  where status in ('trialing','active','past_due');

create table payments (
  id                  uuid primary key,
  subscription_id     uuid not null references subscriptions(id),
  provider_payment_id text not null unique,
  amount_minor        int not null,
  currency            char(3) not null,
  status              text not null,
  created_at          timestamptz not null default now()
);

-- Idempotency for webhooks. Insert before processing; unique violation = already seen.
create table webhook_events (
  id                uuid primary key,
  provider          text not null,
  provider_event_id text not null,
  type              text not null,
  payload           jsonb not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  error             text,
  unique (provider, provider_event_id)
);
```

### 4.5 Media

```sql
create table media_assets (
  id            uuid primary key,
  kind          text not null check (kind in ('video','image')),
  storage_key   text not null,
  mime          text not null,
  bytes         bigint,
  duration_sec  int,
  width         int,
  height        int,
  provider      text,                               -- 'mux' | 's3'
  provider_id   text,                               -- Mux asset id
  playback_id   text,
  poster_key    text,
  status        text not null default 'uploading'
                  check (status in ('uploading','processing','ready','failed')),
  created_at    timestamptz not null default now()
);
```

### 4.6 Audit

```sql
create table audit_log (
  id          uuid primary key,
  actor_id    uuid references users(id),
  action      text not null,                        -- 'schedule.update', 'member.program_change'
  entity      text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
```

Every coach/admin write to a member's record goes here. This is health-adjacent data; you will be asked who changed what.

---

## 5. API surface

Base: `https://api.100mph.in/v1`. JSON only. `Authorization: Bearer <access_token>` except where noted.

### 5.1 Auth

Custom OTP rather than a hosted provider, because [login.tsx](app/(auth)/login.tsx#L34) hardcodes `+91`, [verify.tsx](app/(auth)/verify.tsx#L10) fixes a 6-digit code, and India requires a DLT-registered SMS template. You need control of the template, the resend window, and the throttle.

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/otp/request` | `{ phone }` | `{ challenge_id, expires_at, resend_after_sec }` |
| `POST` | `/auth/otp/verify` | `{ challenge_id, code, device_id, timezone }` | `{ access_token, refresh_token, user }` |
| `POST` | `/auth/password` | `{ email, password, device_id, timezone }` | same |
| `POST` | `/auth/password/forgot` | `{ email }` | `202` always (no account enumeration) |
| `POST` | `/auth/password/reset` | `{ token, password }` | `204` |
| `POST` | `/auth/refresh` | `{ refresh_token }` | rotated pair |
| `POST` | `/auth/logout` | `{ refresh_token, expo_token? }` | `204` |

Rules:
- **Invite-gated.** `otp/request` for an unknown phone with no open invite returns `202` with the same body as success, then sends nothing. Never confirm membership to an unauthenticated caller.
- Throttle: 3 OTP requests per phone per 15 min, 10 per IP per hour, 5 verify attempts per challenge. Then a 30-minute lock.
- Both identities resolve to one `users` row. If an invite carries an email and the user signs in by phone, they are the same person — match on the invite, not on the identity type.
- `POST /auth/password/forgot` currently has no client screen; the "Forgot password?" button in [login.tsx](app/(auth)/login.tsx#L89) is inert. Ship the endpoint with Phase 1 and the screen alongside it.

### 5.2 Session and identity

| Method | Path | Notes |
|---|---|---|
| `GET` | `/me` | **The boot call.** One request, everything the shell needs. |
| `PATCH` | `/me` | `{ full_name?, timezone?, avatar_url? }` |
| `PUT` | `/me/program` | `{ program_id }` — sets `active_program_id`, seeds schedule if first time |
| `POST` | `/me/push-tokens` | `{ expo_token, platform }` |
| `DELETE` | `/me/push-tokens/:token` | |
| `DELETE` | `/me` | Account deletion request — see §7.7 |

`GET /me` response — this replaces every `mock.user` reference in [index.tsx](app/(tabs)/index.tsx#L20), [settings.tsx](app/(tabs)/settings.tsx#L49) and [account.tsx](app/account.tsx#L14):

```jsonc
{
  "user": {
    "id": "…", "full_name": "…", "email": "…", "phone": "…",
    "avatar_url": null, "timezone": "Asia/Kolkata",
    "active_program_id": "…", "member_since": "2026-08-14",
    "created_at": "2026-08-14T09:00:00Z"
  },
  "subscription": {
    "plan_id": "…", "status": "active",
    "current_period_start": "2026-08-14", "current_period_end": "2027-08-14",
    "cancel_at_period_end": false
  },
  "entitlement": { "can_train": true, "can_view_learn": true, "reason": null },
  "flags": { "learn_tab_enabled": false }
}
```

`entitlement` is the only thing the client may branch on for access. It is computed, not stored.

### 5.3 Content

| Method | Path | Notes |
|---|---|---|
| `GET` | `/programs` | `Program[]` + `learn_topics`. Public (pre-selection screen). |
| `GET` | `/programs/:id/content` | The `ProgramData` bundle. `ETag`, `Cache-Control: private, max-age=300`. |

The content response is `ProgramData` from [programData.ts](src/program/programData.ts#L16) verbatim, plus a version:

```jsonc
{
  "version": 7,
  "program": { … },
  "session_types": [ … ],
  "exercises": [ … ],
  "session_exercises": [ … ],
  "default_schedule": { "monday": "st_flow", "…": null },
  "signature_exercise": { … },
  "progression_levels": [ … ],
  "learn_content": [ … ]
}
```

One bundle, not eight endpoints — the client renders a program as a unit and this is the shape it already consumes. Serve it behind an ETag keyed on `programs.content_version`; the client sends `If-None-Match` and takes a `304` most of the time. Cache the serialized bundle in Redis or in-process, invalidated on content write.

**`exercises[].video_url` and `thumbnail_url` are the only fields that change shape:** the bundle returns `video_asset_id` instead, and playback URLs come from §5.8. Signed URLs must not be baked into a cacheable bundle.

### 5.4 Schedule

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/programs/:id/schedule` | | Current version |
| `PUT` | `/programs/:id/schedule` | `{ schedule: ScheduleMap, effective_from? }` | Creates a new version (§2.2) |
| `DELETE` | `/programs/:id/schedule` | | Reset to program default |
| `GET` | `/programs/:id/schedule/history?from=&to=` | | Versions covering a date range |

`GET` response:

```jsonc
{
  "schedule": { "monday": "st_flow", "tuesday": "st_mobility", "…": null },
  "version": 3,
  "effective_from": "2026-08-17",
  "is_default": false
}
```

`ScheduleMap` goes over the wire exactly as the client holds it. `swapDays` and `assignSession` in [ScheduleProvider](src/schedule/ScheduleProvider.tsx#L126-L143) both produce a full map, so a single `PUT` covers both — no per-day PATCH, no ordering hazard between two in-flight edits. Validate: exactly 7 keys, values are `null` or a `session_type_id` belonging to this program.

### 5.5 Session logs

| Method | Path | Body | Notes |
|---|---|---|---|
| `POST` | `/programs/:id/sessions` | see below | Idempotent on `(user, program, local_date)` |
| `DELETE` | `/programs/:id/sessions/:local_date` | | Backs `clearSession` |
| `GET` | `/programs/:id/sessions?from=&to=` | | Backs `completedDates` |

```jsonc
// POST body — replaces completeSession()
{
  "id": "01927e…",                    // client UUIDv7, the idempotency key
  "local_date": "2026-08-19",
  "session_type_id": "st_flow",       // §2.3: snapshot, not inferred later
  "source": "guided",                 // 'guided' | 'logged' — session.tsx has both modes
  "duration_sec": 3120,
  "exercises": [                      // from doneIds, currently discarded
    { "exercise_id": "ex_back_extension", "sort_order": 1, "completed": true },
    { "exercise_id": "ex_hip_hinge",      "sort_order": 2, "completed": false }
  ]
}
```

Re-posting the same `id` returns `200` with the stored row, not a duplicate or an error. Re-posting a *different* `id` for a date that already has a log returns `409` with the existing log — the client keeps the server's copy.

`GET` returns the full log rows, not bare dates. The client maps to `completedDates` for `buildWeek` and gets history for free.

### 5.6 Check-ins

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/check-ins?from=&to=&limit=` | | Oldest first, matching provider order |
| `PUT` | `/check-ins/:local_date` | `{ id, pain_score, pain_location }` | Upsert |
| `DELETE` | `/check-ins/:local_date` | | |
| `GET` | `/check-ins/summary?window=7` | | Server-computed stats |

`PUT` on a date is the natural verb: [`saveCheckIn`](src/checkin/CheckInProvider.tsx#L53) is already an upsert keyed by date, and the unique index enforces it. Reject `deposits_made` / `workouts_completed` in the body (§2.4).

`summary` moves the arithmetic in [progress.tsx](app/(tabs)/progress.tsx#L27-L40) — the 7-day average, the previous-window comparison, the delta — server-side, so the number is the same one the coach dashboard shows:

```jsonc
{
  "latest": { "local_date": "2026-08-19", "pain_score": 3 },
  "window_avg": 4.1, "previous_avg": 5.4, "delta": -1.3,
  "total_check_ins": 41, "current_streak": 6, "longest_streak": 12
}
```

Streaks require `users.timezone` (§2.5) — a streak is broken by a missed *local* day.

### 5.7 Progression

`getCurrentProgression()` in [selectors.ts](src/data/selectors.ts#L85) reads mock directly and **nothing in the app advances it**. The data model is done; the feature is not.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/programs/:id/progression` | Current level + next level + criteria |
| `POST` | `/programs/:id/progression/advance` | `{ signature_exercise_id, to_level_id, reason }` |

Gate advancement server-side — a suggested rule: `>= 6` logged sessions at the current level **and** a 7-day pain average not worse than the previous window. Write a `progression_events` row for every change. A coach can override with `reason: 'coach_set'`.

### 5.8 Media

| Method | Path | Notes |
|---|---|---|
| `GET` | `/media/:asset_id/playback` | Entitlement-checked, short-TTL signed playback |

```jsonc
{ "hls_url": "https://stream…/x.m3u8?token=…", "poster_url": "https://…/poster.jpg",
  "duration_sec": 94, "expires_at": "2026-08-19T12:15:00Z" }
```

TTL 15 minutes, checked against `entitlement.can_train` on every call. [VideoPoster](src/components/session/VideoPoster.tsx) already renders a disabled state when `video_url` is null, so the client degrades correctly while the library is being filmed — ship the endpoint before the footage exists.

### 5.9 Billing

| Method | Path | Notes |
|---|---|---|
| `GET` | `/plans` | Backs `MembershipProvider.plans` |
| `GET` | `/subscription` | Current state |
| `POST` | `/subscription/checkout` | `{ plan_id }` → Razorpay subscription + order for the SDK |
| `POST` | `/subscription/cancel` | Sets `cancel_at_period_end = true` |
| `POST` | `/subscription/resume` | Clears it, if still inside the period |
| `POST` | `/webhooks/razorpay` | **Unauthenticated. Signature-verified.** |

The UI in [membership.tsx](app/membership.tsx) already says *"You keep full access until {date}"* on cancel — that is `cancel_at_period_end` semantics, so the screen needs no redesign. `changePlan` becomes a checkout flow, not an instant local switch; the "Switch to Quarterly" button opens Razorpay and the plan changes when the webhook lands.

**Webhook handling is the whole feature.** Everything else is UI.
1. Verify `X-Razorpay-Signature` against the endpoint secret. Reject otherwise. Never trust the body first.
2. `insert into webhook_events` — a unique violation on `(provider, provider_event_id)` means already processed: return `200` and stop.
3. Apply the state transition in a transaction, stamp `processed_at`.
4. Return `200` fast; do slow work (email, push) in a job. Razorpay retries on non-2xx, and a slow handler becomes a duplicate storm.

Events to handle: `subscription.activated`, `.charged`, `.pending`, `.halted`, `.cancelled`, `.completed`, `payment.failed`.

State machine — nothing else may write `subscriptions.status`:

```
pending ──activated──► active ──charged──► active
                         │                    │
                    cancel_at_period_end  payment.failed
                         │                    ▼
                         │                past_due ──halted──► cancelled
                         ▼                    │
                     cancelled ◄──────────────┘
                         │
                    period_end reached (job)
                         ▼
                      expired
```

### 5.10 Coach / admin

The product is coach-provisioned, so the coach console is not optional — it is how members get in.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/admin/invites` | Provision a member; sends the SMS/email |
| `GET` | `/admin/members?q=&status=&adherence=` | Roster with adherence and latest pain |
| `GET` | `/admin/members/:id` | Full picture: schedule, logs, pain trend, progression |
| `PATCH` | `/admin/members/:id` | Program, plan, notes |
| `POST` | `/admin/members/:id/progression` | Coach override |
| `*` | `/admin/content/*` | CRUD for exercises, session types, learn content, media |

Role-gated on `users.role in ('coach','admin')`, every write audited (§4.6). Build it as a separate web app against the same API.

---

## 6. End-to-end flows

### 6.1 First launch → training

```
App boot
  └─ no tokens → (auth)/login
       ├─ Phone → POST /auth/otp/request → (auth)/verify
       │            └─ POST /auth/otp/verify → tokens + user
       └─ Email → POST /auth/password → tokens + user
  └─ GET /me
       ├─ active_program_id == null → /programs
       │     ├─ GET /programs
       │     └─ tap → PUT /me/program { program_id }
       │            └─ server seeds user_schedules v1 from program_default_schedule
       └─ active_program_id set → (tabs)
  └─ GET /programs/:id/content     (ETag; 304 on relaunch)
     GET /programs/:id/schedule
     GET /programs/:id/sessions?from=<monday>&to=<sunday>
     GET /check-ins?from=<today-13>&to=<today>
  └─ buildWeek(schedule, session_types, completed_dates)   ← unchanged client code
```

Four parallel requests after `/me`. The client renders from cache immediately and reconciles when they land — see §7.3.

`PUT /me/program` seeding the schedule is important: the alternative, letting the client `PUT` the default it read from the bundle, means a user with a dead network lands in the app with no plan. Seed server-side, atomically, in the same transaction that sets `active_program_id`.

### 6.2 A training day

```
Home (tabs)/index
  └─ today.session_type from the derived week
  └─ "Start Workout" → /session
       ├─ Guided: tick exercises  → doneIds
       └─ Log only: one tap
  └─ Finish → POST /programs/:id/sessions { id, local_date, session_type_id, source, exercises }
       ├─ optimistic: completeSession() locally, week flips to 'completed'
       ├─ 200/201  → reconcile ids, done
       ├─ 409      → adopt the server's log (already completed on another device)
       └─ offline  → queue; the local state already shows complete
  └─ Server side, in one transaction:
       ├─ insert session_logs + session_log_exercises
       ├─ recompute progress counters (§2.4)
       └─ enqueue: progression check, coach digest, streak rollup
```

### 6.3 Daily check-in

```
/check-in  (pre-filled from todayCheckIn if it exists)
  └─ PainScale 0–10 + location
  └─ Save → PUT /check-ins/2026-08-19 { id, pain_score, pain_location }
       ├─ upsert on (user_id, local_date)
       └─ offline → queue; last write wins per date (§7.3)
  └─ Progress tab reads GET /check-ins + GET /check-ins/summary
```

### 6.4 Editing the schedule

```
/edit-schedule → drag chips → ScheduleMap mutates locally (instant)
  └─ debounce 800ms → PUT /programs/:id/schedule { schedule, effective_from: <this Monday> }
       └─ server closes v(n), inserts v(n+1) + 7 day rows
  └─ Past days keep resolving against the version live on that date (§2.2)
```

Debounce rather than firing per swap — the editor produces a `PUT` per drag otherwise, and out-of-order responses would fight. Send the last state; the API is a full replace so a late response is harmless as long as you ignore stale ones.

### 6.5 Membership change

```
/membership → select plan → "Switch to Quarterly"
  └─ POST /subscription/checkout { plan_id } → { razorpay_subscription_id, key_id }
  └─ Razorpay SDK sheet (requires a dev build — not Expo Go)
  └─ Client returns to a "Confirming…" state. It does NOT mark the plan changed.
  └─ Webhook subscription.activated → subscriptions row updated
  └─ Client polls GET /subscription (or takes a push) → UI updates
```

The client never writes membership state. This is the single largest behavioural change from `MembershipProvider` and the one most likely to be got wrong — an optimistic local switch here means a user who abandons payment sees a plan they are not paying for.

### 6.6 Cancel

```
Cancel → POST /subscription/cancel → cancel_at_period_end = true, status stays 'active'
  └─ UI: "Access ends on {current_period_end}"        ← already what the screen says
  └─ Resume before period end → POST /subscription/resume
  └─ Nightly job at period end → status = 'expired', entitlement.can_train = false
  └─ Schedule, logs and check-ins are retained (the copy promises this)
```

---

## 7. Cross-cutting concerns

### 7.1 Errors

One envelope, always:

```jsonc
{ "error": { "code": "schedule_invalid_day",
             "message": "session_type_id st_x does not belong to program prog_knee",
             "details": { "day": "tuesday" } } }
```

`code` is a stable machine string. `message` is for logs, not for users — the client maps codes to copy. `400` validation, `401` expired/absent token, `403` entitlement, `404`, `409` conflict, `422` semantic, `429` with `Retry-After`, `5xx` with a `request_id` echoed in every response header.

### 7.2 Idempotency

The app is offline-capable and phones drop connections mid-request. Every mutating endpoint must be safe to retry:

- **Client-generated UUIDv7** for `session_logs` and `check_ins`, generated at the moment of the user's tap. Retries carry the same id.
- Natural unique keys do the enforcement: `(user, program, local_date)` and `(user, local_date)`.
- `PUT` for check-ins and schedules — idempotent by verb.
- `POST /subscription/checkout` takes an `Idempotency-Key` header; never create two Razorpay subscriptions for one tap.
- Webhooks dedupe on `webhook_events` (§5.9).

### 7.3 Offline and conflict resolution

The providers are already offline-first. Preserve that.

- **Reads:** cache each response in AsyncStorage under the existing keys. Render from cache instantly, revalidate in the background, reconcile. Never block the UI on the network — the current `if (!hydrated) return null` pattern must not become `if (!fetched) return null`.
- **Writes:** append to a durable queue (`app.queue.v1`), apply optimistically, flush on reconnect with exponential backoff.
- **Conflicts:**

| Entity | Rule | Rationale |
|---|---|---|
| Check-in | Last write wins per `local_date`, by `updated_at` | One person, one day, one score |
| Session log | First write wins; later ones `409` and adopt the server row | You cannot do the same day twice |
| Schedule | Last write wins, whole-map replace | A partial merge produces a plan nobody chose |
| Membership | Server always wins | Client is never authoritative |

### 7.4 Caching

| Resource | Policy |
|---|---|
| `/programs`, `/programs/:id/content` | ETag + `private, max-age=300`. `304` is the common path. |
| `/me` | `no-store`; refetch on foreground and after any billing action |
| `/check-ins`, `/sessions` | ETag on the range; client keeps a local copy regardless |
| Media playback | `no-store` — signed and short-lived |

`content_version` on `programs` is the ETag source. Bump it in the same transaction as any content write and every device picks up new exercises on next foreground.

### 7.5 Security

- TLS only, HSTS, certificate pinning on the client for release builds.
- Access tokens 15 min, refresh 30 days with **rotation and reuse detection** — a replayed refresh token revokes the whole family.
- Tokens in `expo-secure-store`, not `AsyncStorage`. The current `app.auth.phone` key is fine for a mock; a real refresh token in AsyncStorage is not.
- RLS on every user-scoped table (`user_id = current_setting('app.user_id')::uuid`) even though the API is the access path. Defense in depth catches the query written at 2am.
- Rate limits: OTP as in §5.1; 100 req/min per user elsewhere; webhook endpoint unlimited but signature-gated.
- No PII in logs. `pain_location` is free text a user may type anything into — it is health data. Redact it from traces and error reports.
- Sentry `beforeSend` scrubs `pain_score`, `pain_location`, `phone`, `email`.

### 7.6 Health data and Indian law

Pain scores and body-part notes are health data under the **DPDP Act, 2023**.

- Explicit consent at sign-up, with a stored record of what was consented to and when.
- Data retention policy, published, and enforced by a job.
- A working export path (`GET /me/export` → JSON) and a working deletion path (`DELETE /me`, 30-day grace, then hard delete or irreversible anonymisation — keep only aggregate rows with no user linkage).
- Store data in an Indian region (`ap-south-1` / Mumbai) — lower latency and one fewer question at diligence.
- The app is not a medical device and must not present itself as one. No diagnosis, no treatment claims. Keep the coach in the loop for anything clinical.

### 7.7 Observability

- `request_id` on every response; propagate to the client and into Sentry.
- Structured JSON logs with `user_id`, `route`, `status`, `duration_ms`.
- Business metrics from day one: DAU, check-in rate, session completion rate, 7/30-day retention, subscription conversion, involuntary churn. **Adherence is the product's actual health metric** — instrument it before you need it.
- Alerts: webhook processing lag, `5xx` rate, OTP delivery failure rate, payment failure rate.

### 7.8 API versioning

`/v1` in the path. Never break a shipped client — old app binaries live on phones for months. Additive changes only within a version; a breaking change is `/v2` running alongside. Publish the request/response types as a package generated from the same source as [src/data/types.ts](src/data/types.ts) so the two sides cannot drift.

---

## 8. Client changes required before wiring

These are **prerequisites**, not follow-ups. Wiring the API without them produces corrupt data on day one.

### 8.1 Remove the mock seeds — the data-corruption trap

Two providers seed themselves with fabricated data:

- [CheckInProvider.tsx:34](src/checkin/CheckInProvider.tsx#L34) — `useState(() => [...mock.progress])`, seven fake check-ins attributed to `user_1`.
- [ScheduleProvider.tsx:58](src/schedule/ScheduleProvider.tsx#L58) — `useState(mock.completedDates)`, two fake completions.

If the first sync uploads local state, **every new user's account is born with a week of invented pain scores and two workouts they never did.** The pain trend, the adherence metric and the coach's view are all wrong, and it is nearly impossible to detect later because the data looks plausible.

Fix before the first API call: put both seeds behind `process.env.EXPO_PUBLIC_USE_MOCKS === 'true'`, default off, and have the sync layer upload only records created after the user authenticated.

### 8.2 Other required changes

| # | Change | Files |
|---|---|---|
| 1 | Replace `mock.user` with `useSession().user` from `GET /me` | [index.tsx:20](app/(tabs)/index.tsx#L20), [settings.tsx:49](app/(tabs)/settings.tsx#L49), [account.tsx:14](app/account.tsx#L14) |
| 2 | `getProgramData` becomes async/cached; `useProgramData` gains loading + error states | [programData.ts](src/program/programData.ts) |
| 3 | `getCurrentProgression` stops importing mock; take data from the bundle | [selectors.ts:11](src/data/selectors.ts#L11) |
| 4 | Persist `doneIds` — currently discarded on finish | [session.tsx:35](app/session.tsx#L30) |
| 5 | `completeSession` carries `session_type_id` and `source` | [ScheduleProvider.tsx:139](src/schedule/ScheduleProvider.tsx#L145) |
| 6 | Tokens move to `expo-secure-store` | [AuthProvider.tsx](src/auth/AuthProvider.tsx) |
| 7 | `+91` becomes a country picker, or an explicit single-market decision | [login.tsx:38](app/(auth)/login.tsx#L34) |
| 8 | Send `timezone` on every login | [AuthProvider.tsx](src/auth/AuthProvider.tsx) |
| 9 | Real social URLs and support address | [brand.ts](src/config/brand.ts) — has a `TODO` |
| 10 | Build the Learn tab — `learn_content` exists, the tab is `ComingSoon` | [learn.tsx](app/(tabs)/learn.tsx) |
| 11 | Add a forgot-password screen behind the inert button | [login.tsx:88](app/(auth)/login.tsx#L89) |
| 12 | Razorpay needs a dev build; Expo Go will not do | `app.json`, EAS |

---

## 9. Build order

Each phase is shippable and has an acceptance test. Do not start a phase before its predecessor passes.

### Phase 0 — Foundation (week 1)
Repo, CI, migrations (`drizzle-kit` or `sqlc`), Postgres, health check, error envelope, request ids, structured logs, staging deploy.
**Done when:** `GET /v1/health` returns from staging and migrations run clean from empty.

### Phase 1 — Auth and identity (weeks 2–3)
`users`, `invites`, `otp_challenges`, `refresh_tokens`. OTP via MSG91. JWT issuance with rotation. `GET /me`, `PATCH /me`. Admin invite creation. Client: `AuthProvider` swapped, secure-store, timezone.
**Done when:** a coach creates an invite, a real phone receives a real code, and the app reaches the program screen with a real session that survives a cold start.

### Phase 2 — Content (week 4)
Content tables, seed from `mock.ts`, `GET /programs`, `GET /programs/:id/content` with ETag. Admin content CRUD.
**Done when:** editing an exercise in the console changes it in the app on next foreground, and a relaunch serves `304`.

### Phase 3 — Schedule and sessions (weeks 5–6)
Versioned schedules, session logs, the offline write queue, conflict rules. **§8.1 must be done here.**
**Done when:** two devices on one account converge; a session logged in airplane mode syncs on reconnect; editing the schedule does not change last week.

### Phase 4 — Check-ins and progress (week 7)
`check_ins`, `PUT /check-ins/:date`, `GET /check-ins/summary`, streaks. Client arithmetic moves server-side.
**Done when:** the Progress tab renders entirely from the API and the summary matches a hand calculation.

### Phase 5 — Billing (weeks 8–9)
`plans`, `subscriptions`, `payments`, `webhook_events`. Razorpay checkout, webhooks, entitlement gating, the nightly expiry job. Dev build with the Razorpay SDK.
**Done when:** a live ₹1 test subscription activates via webhook, cancel sets `cancel_at_period_end`, and an expired member is blocked from `/media/*` with `403`.

### Phase 6 — Media and Learn (weeks 10–11)
Mux integration, upload pipeline, signed playback, the Learn tab.
**Done when:** an exercise video plays for an active member and returns `403` for an expired one.

### Phase 7 — Coach console (weeks 12–13)
Roster, adherence, member detail, progression overrides, audit log.
**Done when:** a coach can see who has not trained in five days and act on it.

### Phase 8 — The parts that make it cool
Everything above makes it *work*. This is what makes people stay:

- **Timezone-aware push.** Check-in nudge at 8pm local, session reminder on scheduled mornings, silence on rest days. Never a 3am notification — this is where `users.timezone` earns its place.
- **Streaks and milestones.** "12 sessions. Your pain is down 3.2 points since you started." The `progress` data already tells this story; nobody has written the sentence.
- **Progression.** The tables exist, the levels are written, nothing advances. Levelling up from Iso Holds to Weighted Reps is the single most motivating event the program has.
- **Weekly digest.** One notification: sessions done, pain trend, next week's plan.
- **Coach messaging.** In-app thread per member. The product is coach-provisioned; the coach should be reachable inside it.
- **Insight surfacing.** "Your pain averages 1.8 lower in weeks you complete all three Flow sessions." Correlate `session_logs` against `check_ins` — you will have the data by Phase 4.
- **Adherence-triggered outreach.** Three missed sessions flags the coach automatically.

---

## 10. Environment

```bash
DATABASE_URL=postgres://…                 # ap-south-1
REDIS_URL=redis://…                       # cache + rate limits

JWT_SECRET=…                              # rotate quarterly
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

MSG91_AUTH_KEY=…
MSG91_TEMPLATE_ID=…                       # DLT-registered
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

RAZORPAY_KEY_ID=…
RAZORPAY_KEY_SECRET=…
RAZORPAY_WEBHOOK_SECRET=…

MUX_TOKEN_ID=…
MUX_TOKEN_SECRET=…
MUX_SIGNING_KEY_ID=…
MUX_SIGNING_PRIVATE_KEY=…

EXPO_ACCESS_TOKEN=…                       # push
SENTRY_DSN=…
API_BASE_URL=https://api.100mph.in
```

Client (`EXPO_PUBLIC_*` only — these ship inside the bundle and are readable by anyone):

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.100mph.in/v1
EXPO_PUBLIC_RAZORPAY_KEY_ID=…             # publishable key only
EXPO_PUBLIC_SENTRY_DSN=…
EXPO_PUBLIC_USE_MOCKS=false               # §8.1 — must default false
```

Never put a secret behind `EXPO_PUBLIC_`.

---

## 11. Open product questions

These block schema decisions. Get answers before Phase 3.

1. **Do the four programs get distinct content, or share one library?** `getProgramData` returns identical content for all four today. Distinct content is the assumption baked into `program_id` on every content table — confirm it, because "shared exercises tagged per program" is a different schema.
2. **Can a member run two programs at once?** `user_programs` supports it; `users.active_program_id` and the whole UI assume one. Currently: one active, state retained per program on switch.
3. **Does a coach author a member's schedule, or only the member?** The UI is member-driven. If coaches prescribe, `user_schedules` needs an `authored_by` and a member-override policy.
4. **What happens to an expired member's data?** Assumed: retained, read-only, restored on resume — the cancel copy promises this. Confirm against the retention policy.
5. **Trials?** No trial exists in `plans` or the UI. `trialing` is in the enum; nothing produces it.
6. **Refunds and proration on mid-term plan changes?** Razorpay can do either. The current UI says "Switching starts a fresh term from today", which is the no-proration reading.
7. **India-only at launch?** `+91` is hardcoded and prices are ₹. If yes, say so and delete the ambiguity. If no, Phase 1 needs a country picker and `plans` needs multi-currency.

---

## 12. Running the client today

```bash
npm install
npm start          # then i / a / w
npm run typecheck
```

`@/*` maps to `src/*`. All data is local; nothing leaves the device.

---

## License

See [LICENSE](LICENSE).
