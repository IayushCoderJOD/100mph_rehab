# 100mph

A physiotherapy practice, as an app. A physio provisions clients, puts each on a
rehab program, and prescribes extra work on top of it. Each client gets a
training week, a session to do each day, a daily check-in for how the pain is
going, and a progression ladder to climb. The physio sees who is keeping up and
who has gone quiet.

There is no public sign-up. Access is provisioned by the practice, which is the
single fact that shapes most of the design below.

```
100mph/
├── 100mph_rehab/     Expo / React Native client (this directory)
└── backend/          Spring Boot + MongoDB API
```

---

## 1. Running it

**Backend** — needs Java 21 and MongoDB.

```bash
cd ../backend
systemctl start mongod                      # or: docker run -d -p 27017:27017 mongo:7
export JWT_SECRET="$(openssl rand -base64 48)"
./mvnw spring-boot:run
```

It comes up on `:8080`. Check it: `curl localhost:8080/v1/health`.

On an empty database it seeds the demo accounts:

| Email | Password | Role |
|---|---|---|
| `admin@100mph.in` | `admin@123` | admin |
| `memb1@100mph.in` | `memb@123` | member |

**Client**

```bash
npm install
npx expo start
```

The app finds the API on the machine Metro is served from, so a phone on the
same wifi works without configuration. Two knobs, both in `.env`:

```bash
EXPO_PUBLIC_API_PORT=8080                   # if you moved the API off 8080
# EXPO_PUBLIC_API_BASE_URL=https://api.100mph.in/v1   # pin it outright
```

Never put a secret behind `EXPO_PUBLIC_` — those ship inside the bundle.

---

## 2. The one architectural decision

**Authored content is static. Everything a person does is dynamic.**

Exercises, programs, session types, the running order of a session, the
progression ladders and the Learn lessons are written by the practice a few
times a year and read by everyone. They are identical for every member, nothing
at runtime changes them, and they are small. So they ship as a JSON file loaded
into memory at boot — `backend/src/main/resources/content/catalogue.json` —
and are served read-only.

That file is generated from this app's own `src/data/mock.ts`, so the catalogue
the API serves and the one the app was built against are the same content by
construction rather than by discipline.

Changing content is therefore a deploy, not a database write. That is the trade,
and it is the right one for a catalogue a physio edits occasionally. It would be
the wrong one for anything a user can change — so all of that is in MongoDB:

| Static (JSON, in memory) | Dynamic (MongoDB) |
|---|---|
| Programs | Users, credentials, sessions |
| Exercises + instructions | Weekly schedules |
| Session types + running order | Session logs |
| Signature exercises, progression ladders | Where each member is on a ladder |
| Learn content and topics | Daily check-ins and pain scores |
| Each program's default week | Coach prescriptions |

---

## 3. Rules the whole system follows

**A calendar day is not an instant.** `member_since`, a check-in date, a session
date — these are days in the member's own timezone, and they are stored as
`"2026-08-14"` strings, not as timestamps. Storing them as dates would write
midnight in the server's zone, and a server in UTC would then read back the
previous day for everyone in India. Timestamps (`created_at`, `completed_at`)
are instants and stored as such.

**The plan is a week; only what happened gets a row.** The weekly schedule is
one document per member: seven days, each holding a session type or null for
rest. Real dates are computed from it. A session that is scheduled but not yet
done is not a fact — writing rows for it would mean inventing a future and then
correcting it. Only completed sessions are stored.

**Anything a phone might send twice must be safe to send twice.** Session logs
carry a client-generated id, made at the moment of the tap, which becomes the
document id — a retry after a dropped connection writes the same row. Check-ins
and schedules use `PUT`, which is idempotent by verb. Unique indexes on
`(user, date)` are the backstop.

**Derived numbers are computed server-side.** Streaks, adherence, and whether a
client needs a call are defined once, on the server. Two clients doing the same
arithmetic will eventually disagree about who to phone.

**Entitlement is computed, never stored and never sent up.** `GET /me` returns
an `entitlement` object; the client branches on that and nothing else.

**The client never learns who has an account.** A wrong password and an unknown
email return the same error, in the same time. Forgot-password answers `202`
either way.

---

## 4. The API

Base `/v1`. JSON only. `Authorization: Bearer <access_token>` unless marked
public. Every path the client uses is declared in
[`src/api/endpoints.ts`](src/api/endpoints.ts) — no route string is written
anywhere else.

### 4.1 Auth — public

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/password` | `{ email, password, device_id?, timezone? }` | `200` token pair + user |
| `POST` | `/auth/refresh` | `{ refresh_token }` | `200` rotated pair + user |
| `POST` | `/auth/logout` | `{ refresh_token }` | `204` |
| `POST` | `/auth/password/forgot` | `{ email }` | `202` always |
| `POST` | `/auth/password/reset` | `{ token, password }` | `204` |

### 4.2 Identity

| Method | Path | Notes |
|---|---|---|
| `GET` | `/me` | The boot call — user, entitlement, flags |
| `PATCH` | `/me` | `{ full_name?, timezone?, avatar_url? }` |
| `PUT` | `/me/program` | `{ program_id }` — also seeds the default week |

### 4.3 Content — the static catalogue

| Method | Path | Notes |
|---|---|---|
| `GET` | `/programs` | **Public.** Backs the program picker |
| `GET` | `/programs/{id}/content` | Everything for one program, in one request |
| `GET` | `/exercises/{id}` | One exercise, for the guide screen |
| `GET` | `/learn/{id}` | One lesson |

`/programs/{id}/content` returns session types, exercises, the session running
order, signature exercises, progression levels, Learn content and topics, and
the program's default week — so entering a program is one round trip, not six.

### 4.4 Schedule

| Method | Path | Notes |
|---|---|---|
| `GET` | `/schedule` | The member's week; seeded from the program default on first read |
| `PUT` | `/schedule` | `{ days: { monday: "st_flow", … } }` — replaces the whole week |

The whole week is sent at once because a partial plan is ambiguous: a missing
day could mean rest or untouched. Sending all seven makes it neither.

### 4.5 Sessions

| Method | Path | Notes |
|---|---|---|
| `GET` | `/sessions/plan?date=` | What that day asks for. A rest day returns a null session type |
| `POST` | `/sessions` | Log a completed session. Safe to retry with the same id |
| `GET` | `/sessions?from=&to=` | History; both ends inclusive |
| `GET` | `/sessions/completed-dates` | Just the dates, for the week strip |
| `DELETE` | `/sessions/{id}` | Remove a logged session |

### 4.6 Check-ins

| Method | Path | Notes |
|---|---|---|
| `GET` | `/check-ins?from=&to=` | A window of days, both ends inclusive |
| `GET` | `/check-ins/summary` | Streaks, adherence, latest pain — all server-computed |
| `GET` | `/check-ins/{date}` | One day |
| `PUT` | `/check-ins/{date}` | `{ pain_score?, pain_location?, note? }` — writes or revises |

`pain_score` is 0–10. A future date is rejected.

### 4.7 Progression and prescriptions

| Method | Path | Notes |
|---|---|---|
| `GET` | `/progression` | Every ladder in the program, with the current rung |
| `PUT` | `/progression` | A member moving themselves |
| `GET` | `/assigned-exercises` | What the coach has prescribed to me |

A member who has never been moved sits on level 1 — the first rung is the
default, not an empty state.

### 4.8 Back office — admin role only

| Method | Path | Notes |
|---|---|---|
| `POST` | `/admin/users` | Provision an account. This is how members get in |
| `GET` | `/admin/users` | Raw user list |
| `PATCH` | `/admin/users/{id}/status` | `active` / `invited` / `suspended` |
| `GET` | `/admin/clients` | The roster, with adherence and attention flags |
| `GET` | `/admin/clients/{id}` | The whole picture of one client, in one call |
| `GET` | `/admin/clients/{id}/assigned-exercises` | Their prescriptions |
| `POST` | `/admin/clients/{id}/assigned-exercises` | Prescribe an exercise |
| `DELETE` | `/admin/clients/{id}/assigned-exercises/{aid}` | Withdraw one |
| `PUT` | `/admin/clients/{id}/progression` | Coach override of a ladder |

The whole `/admin` tree is gated on the path, so a handler added there cannot be
left unguarded by accident.

**"Needs attention"** is defined on the server, in one place: adherence under
60% over four weeks, or a pain score of 7+, or silence for seven days. Whether a
client is drifting is a clinical judgement the practice owns.

---

## 5. Auth in detail

**Access tokens are JWTs; refresh tokens deliberately are not.** An access token
is a signed 15-minute JWT carrying only the subject and role — anything else a
handler needs it loads fresh, so a stale claim can never stand in for the
current record. A refresh token has to be revocable, and a self-contained JWT is
not, so it is 256 bits of opaque randomness stored only as a SHA-256 digest.

**Refresh tokens rotate, with reuse detection.** Presenting one mints its
replacement and revokes it. Presenting an already-rotated token means two
parties hold it and there is no way to tell which one is calling — so the whole
family, traced by `family_id`, is revoked and both must sign in again. Each
login starts a new family, so a second phone is an independent session.

**Concurrent 401s share one refresh.** On a cold start several requests fire at
once; if the access token has expired they all 401 together. Each refreshing
alone would rotate the token N times, which reuse detection would correctly read
as theft and log the user out. So the first 401 starts a refresh and the rest
await the same promise — see `refreshOnce` in [`src/api/client.ts`](src/api/client.ts).

**Tokens live in the device keychain** (`expo-secure-store`), not AsyncStorage.

**Suspension bites immediately.** Suspending a member revokes every open refresh
token, and the refresh path re-reads status rather than trusting the token — so
access ends at the next refresh, not in thirty days.

**Throttle.** Ten failed sign-ins for one email inside fifteen minutes locks it
for thirty, with `Retry-After`. Counting is keyed on the email rather than the
account, because an address with no account must be throttled identically or the
difference becomes an enumeration oracle.

---

## 6. Errors

One envelope, always:

```jsonc
{ "error": { "code": "invalid_credentials",
             "message": "…",          // for logs, not for users
             "details": { },
             "request_id": "…" } }
```

`code` is the stable contract; the client maps codes to copy in
[`src/api/errors.ts`](src/api/errors.ts). Every response carries `X-Request-Id`,
echoing the caller's if supplied.

`400` validation · `401` absent or expired token · `403` role or entitlement ·
`404` · `409` conflict · `422` semantic · `429` with `Retry-After` · `5xx` with
a request id.

Codes: `invalid_credentials`, `account_suspended`, `token_missing`,
`token_invalid`, `token_expired`, `refresh_token_invalid`,
`refresh_token_reused`, `too_many_attempts`, `email_already_exists`,
`phone_already_exists`, `password_too_weak`, `reset_token_invalid`,
`program_not_found`, `schedule_invalid_day`, `no_active_program`,
`session_type_not_found`, `exercise_not_found`, `already_assigned`,
`validation_failed`, `forbidden`, `not_found`, `internal_error`.

---

## 7. The client

Expo Router, TypeScript, no state library — state lives in providers, each
owning one slice.

```
app/                     Routes (expo-router)
  (auth)/login           Sign-in. No sign-up path exists
  (tabs)/                index · plan · progress · learn · clients · settings
  admin/                 Roster, client detail, assign, create-user
  session, check-in, edit-schedule, exercise/[id], learn/[id]   (modals)

src/
  api/                   The API layer — see below
  auth/                  AuthProvider: session, entitlement, sign-in/out
  directory/             DirectoryProvider: the roster and provisioning
  program|schedule|checkin|membership/   Feature providers
  components/            UI, grouped by feature
  data/                  Types, calendar maths, selectors, mock seed
  theme/                 Tokens, light/dark
```

### The API layer

| File | Holds |
|---|---|
| `endpoints.ts` | **Every path.** No route string exists anywhere else |
| `config.ts` | Base URL; infers the dev host from Metro so a phone works |
| `client.ts` | fetch wrapper: error envelope, timeout, coalesced refresh |
| `tokens.ts` | Keychain storage |
| `auth.ts` | The typed call for each endpoint |
| `types.ts` | Request and response shapes |
| `errors.ts` | `ApiError` and code → copy |

Provider contracts did not change when the backend arrived — `useAuth()` and
`useDirectory()` expose what they always did, so the screens above them were
untouched. Only the internals swapped from mock to API.

### Wire format

The server speaks `snake_case` end to end, matching
[`src/data/types.ts`](src/data/types.ts) — configured once, on the server, so
neither side maps field names.

---

## 8. What is not built

**Membership and billing.** Deliberately out of scope for now. `GET /me` still
returns a `subscription` field and the entitlement hook is where the check
belongs, but nothing gates on payment: an active member trains.

**OTP sign-in.** The app has one email-and-password screen. The `phone` field
and its unique index exist for when a phone-first flow does.

**Sending email.** `/auth/password/forgot` mints and stores the reset token
correctly; delivery logs it instead of mailing it. Wire the mailer where
`AuthController` logs, and never put the token in the HTTP response.

**Media.** `video_url` and `thumbnail_url` are carried through the catalogue but
nothing is hosted yet. Do not roll your own HLS transcoding.

**Per-IP rate limiting.** Per-account throttling is in. Per-IP limits belong in
Redis or at the edge, not in the app's own datastore.

**Push notifications.** No `push_tokens` collection yet.

---

## 9. Health data

Pain scores and body-part notes are health data under India's DPDP Act, 2023.
`pain_location` is free text a member may type anything into.

- It must never reach a log line, a trace, or an error report. `CheckIn`
  overrides `toString()` so it cannot print itself into one.
- Store in an Indian region.
- Export and deletion paths are required and not yet built.
- The app is not a medical device and must not present itself as one. No
  diagnosis, no treatment claims.

---

## 10. Tests

```bash
cd ../backend && ./mvnw test      # 39 integration tests, real Mongo
npm run typecheck                 # client
```

The backend tests run through the real filter chain against a real MongoDB
(`hundredmph_test`), covering token rotation and reuse detection, enumeration
resistance, throttle lockout, role gating, the schedule and session and
check-in loops, streak and adherence maths, and the provision → sign-in →
suspend lifecycle.

One of them exists because of a bug worth knowing about: Spring Data MongoDB
translates the `Between` keyword to `$gt`/`$lt` — **exclusive**, unlike the JPA
keyword that reads identically. Every date range was silently dropping its first
and last day, today's included, which quietly zeroed adherence. Range queries
are now written out explicitly, and `rangeQueriesAreInclusive` keeps them that
way.
