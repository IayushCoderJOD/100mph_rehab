# Google Play listing — 100mph : Go

Everything to paste into Play Console. Package: `in.hundredmph.app`.

## Store listing

- **App name:** 100mph : Go
- **Short description (80 max):** Your rehab plan from your 100mph physio: daily sessions, check-ins and progress.
- **Category:** Health & Fitness
- **Contact email:** supportcontact100mph@gmail.com
- **Privacy policy URL:** https://100mph-rehab.vercel.app/privacy
- **Graphics:** `icon-512.png`, `feature-graphic-1024x500.png`, `screenshots/` (1215×2160, 9:16)

**Full description:**

100mph : Go is the companion app for clients of 100mph, a physiotherapy and performance practice. Your physio writes your week; the app shows you what to do each day and lets them see how you are getting on.

• Your week, day by day — the exercises your physio prescribed, with sets and reps
• Guided sessions — work through the list and tick each exercise off
• Exercise guides — instructions and demonstration videos for each movement
• Daily check-in — log your pain score and where you felt it
• Progress — your pain trend, streak and how closely you are following the plan
• English and Hindi, light and dark themes

Accounts are opened by the practice. There is no public sign-up: you need login details from your 100mph physio to use the app.

100mph : Go is not a medical device and does not diagnose or treat any condition. It does not replace advice from a qualified professional. Stop and contact your physio or doctor if an exercise causes sharp or unusual pain.

## App content forms

| Form | Answer |
| --- | --- |
| Privacy policy | https://100mph-rehab.vercel.app/privacy |
| App access | "All or some functionality is restricted" → give the reviewer member login (create it in production first; keep it active with a plan) and note "Accounts are created by the practice; no sign-up". |
| Ads | No ads |
| Content rating | Category: Utility/Health. No violence, sexual content, gambling, user-to-user chat or location sharing. |
| Target audience | 13–15, 16–17, 18+. Not designed for children under 13. |
| Health apps | Health and fitness → "Physical therapy / rehabilitation" and "Fitness / exercise tracking". Not a regulated medical device. |
| Government / news / financial / COVID | No to all |
| Data deletion URL | https://100mph-rehab.vercel.app/account-deletion |

## Data safety

Collects data: **yes**. Encrypted in transit: **yes**. Users can request deletion: **yes**. Shared with third parties: **no**. All items below: collected, not shared, purpose **App functionality** (and **Account management** for the first three), required unless marked.

| Data type | Notes |
| --- | --- |
| Name | |
| Email address | |
| Phone number | |
| User IDs | account id |
| Other personal info | date of birth — optional |
| Health info | pain scores, pain location, notes; height and weight — optional |
| Fitness info | sessions and exercises completed |

Not collected: location, contacts, photos/videos, audio, files, messages, financial info, device IDs, app activity analytics, crash logs.

## Release steps

1. Create the Play developer account (US$25) and finish identity verification.
2. Create the app in Play Console, fill the forms above.
3. `eas build --platform android --profile production` → download the `.aab`.
4. Upload that first `.aab` by hand to **Internal testing** (Google requires the first upload to be manual).
5. A new personal account must run a **closed test with 12 testers for 14 days** before it can apply for production. An organisation account goes straight to production review.
6. Later releases: add a Google service account key and run `eas submit --platform android --profile production` (uploads to the internal track).
