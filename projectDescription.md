# IronHouse Bodybuilding Gym: project description and hand-over

This file describes the whole project: what it does, how it's built, the database, the edge functions, the payment flow, what was decided while building it, its current state, and step-by-step instructions for moving it to a new GitHub, Vercel, Supabase or Claude account.

If you're a new Claude session picking this up: read this file first, then [README.md](README.md). Together they're the full context. The code is the source of truth wherever they disagree.

---

## 1. What the project is

A website for a bodybuilding gym in Kuwait called **IronHouse**. Visitors see a public home page and subscription plans. Members pay online in KWD through **MyFatoorah** (KNET or card). Paying unlocks the training program: the weekly schedule, the exercise library with animated demos, the equipment guide and the training guide. Staff log in to manage members and moderate a community photo gallery.

**Live today (old accounts):**

| Thing | Where |
|---|---|
| Website (Vercel) | https://gym-y16a.vercel.app |
| GitHub repo | `t072405-crypto/gym`, branch `main` (Vercel deploys from it) |
| Supabase project | ref `axolgiobcbepqnymasgz`, URL `https://axolgiobcbepqnymasgz.supabase.co` |
| Edge functions | `create-payment`, `verify-payment`, `write-with-ai` (all deployed with JWT verification **off**; each function checks the caller itself) |

---

## 2. Tech stack

- **Frontend:** plain HTML + CSS + vanilla JavaScript. **No build step, no framework, no npm dependencies.** Fonts are Oswald and Inter. The design is a dark theme with an orange accent `#ff5a1f`.
- **Supabase JS client:** `@supabase/supabase-js@2.45.4`, loaded from jsDelivr in `index.html`.
- **Backend:** Supabase (Postgres with row level security, Auth with email and password, Storage, Edge Functions on Deno).
- **Payments:** MyFatoorah API v2 (`SendPayment`, `GetPaymentStatus`). The test server is `https://apitest.myfatoorah.com`; the live Kuwait server is `https://api.myfatoorah.com`.
- **AI captions:** OpenRouter (default model `anthropic/claude-haiku-5.5`), called only from an edge function.
- **Hosting:** Vercel, Application Preset **Other**, root `./`, no build command, no Vercel environment variables.
- **Local dev server:** `npx http-server@14.1.1 -p 5173` (also saved in `.claude/launch.json` as `site`).

---

## 3. File map

```
index.html                  Single page: header, hero + login card, sections (see below), footer, modal
css/style.css               All styles (CSS variables at the top: --bg, --accent, etc.)
js/config.js                Supabase URL + publishable key (safe in the browser; RLS protects data)
js/data.js                  PUBLIC data only: muscle names/colours, headline numbers, hero animation
js/db.js                    All data access (Supabase client, edge-function calls, localStorage fallback)
js/poses.js                 Body proportions + start/end pose for every movement pattern
js/animator.js              Draws the anime-style animated exercise demos on <canvas>
js/app.js                   All UI logic: rendering, auth, paywall, checkout, gallery, members, modal
supabase/functions/
  create-payment/index.ts   Makes a MyFatoorah invoice, returns the payment link
  verify-payment/index.ts   Confirms payment with MyFatoorah, activates the subscription (also webhook)
  write-with-ai/index.ts    "Write with AI" gallery captions through OpenRouter
  .env.example              Template of every secret the functions need (committed)
  .env                      Your real secrets (git-ignored, never committed)
supabase/migrations/*.sql   The exact database schema, in order (exported from the live project)
videos/                     Put AI-generated exercise clips here as <exercise-id>.mp4
.claude/launch.json         Dev-server config for Claude Code's preview
README.md                   Feature and setup documentation
projectDescription.md       This file
```

### Page sections (`index.html`)

| id | Who sees it | Content |
|---|---|---|
| header + hero | everyone | Logo, **Log in / Sign up / Sign out**, hero animation, login card (`#authCard`), headline numbers |
| `#pricing` | everyone | Subscription plans from the `plans` table, the member's subscription status, and the payment-return banner (`#payBanner`) |
| `#gallery` | everyone | Community workout photos (approved only) + upload form + ✨ Write with AI |
| `#schedule` | subscribers/staff (`gated`) | 5-day split by level and goal |
| `#bodyparts` | subscribers/staff | Exercises grouped by upper/lower body |
| `#exercises` | subscribers/staff | 38-exercise library, filters, modal with steps, tips, mistakes, demo and AI-video prompt |
| `#equipment` | subscribers/staff | 20 pieces of equipment |
| `#guide` | subscribers/staff | Training guide |
| `#members` | staff | Register and manage members, printable personal schedules, photo moderation |

A `gated` section shows a 🔒 "For subscribers" panel (with a "See plans" link) until the member has access. The body gets the class `locked`.

### `js/app.js` structure

Each area is a block that starts with a `// ---------- name ----------` comment: program logic (`scheme`, `kgText`, `planDay`), hero, schedule, exercise library, body parts, equipment, training guide, modal (with `aiPrompt` and `downloadPrompts`), members, photo upload (resize/crop in the browser), community gallery, auth (`authMessage` turns Supabase errors into plain language), subscription (`setAccess`, `renderSubStatus`, `loadPlans`, `checkout`, `handlePaymentReturn`, `refreshAccess`), and events (`bind`). On startup it runs `renderHero(); renderCatalog(); bind(); refreshAccess(); reloadGallery(); loadPlans(); handlePaymentReturn();`.

### `js/db.js` API (`window.DB`)

`loadCatalog`, `session`, `onAuth`, `signIn`, `signUp`, `signOut`, `isStaff`, `listMembers`, `addMember`, `updateMember`, `removeMember`, `setPhoto`, `removePhoto`, `updateMemberPhoto`, `writeWithAI`, `listPlans`, `mySubscription`, `startCheckout`, `verifyPayment`, `submitWorkoutPhoto`, `listGallery`, `listPendingPhotos`, `reviewPhoto`, `listMyPhotos`, `updateMyPhoto`, `deleteMyPhoto`, `photoUrls`.

`invoke(name, body)` calls an edge function. If the function replies with an error, its JSON `{ error }` text becomes the message shown to the user. If `js/config.js` has an empty URL or key, the site runs offline from `data.js`, with members kept in `localStorage`.

---

## 4. Features and their rules

- **Training program:** a 5-day split (Chest · Back · Shoulders · Legs · Arms) plus 2 rest days.
  - Exercises per muscle depend on the level: Beginner 4/3, Intermediate 5/4, Advanced 6/5 (for one-muscle/two-muscle days).
  - **Reps are always 10–14.** The database rejects anything else.
  - Beginners do 3 sets and advanced members add 1. The goal (hypertrophy, strength or endurance) sets the rest time.
- **Starting weights:** each exercise has a kg weight per level, plus `weight_basis` (total incl. bar, per dumbbell, machine stack, plates loaded, added to bodyweight). Beginner ≤ intermediate ≤ advanced is enforced.
- **Exercise demos:** an anime-style animated character on canvas, with a real tempo: 450 ms hold, 1 s lift, 450 ms squeeze, 2 s lower, 4 reps.
  - Each exercise stores an AI-video prompt (`ai_video_prompt`, 15 s by default; 8 s and 30 s prompts are generated).
  - A real clip at `videos/<id>.mp4` or in `exercises.video_url` replaces the animation.
- **Accounts:** Supabase email and password. Friendly error messages; the wrong-login message never says which part was wrong. A new account is **not** staff: it must be added to the `staff` table.
- **Members (staff only):** name, phone, plan length (1/3/6/12), start date, level and goal, with a printable personal schedule. Photos are cropped to 600×600 in the browser and stored in the private `member-photos` bucket, shown through links that expire after 1 hour.
- **Community gallery:** anyone can upload JPG, PNG or WebP up to 5 MB.
  - Photos are resized to 1280 px max and the uploader must tick a consent box.
  - New photos are saved as **pending**; staff approve them, and rejected photos are deleted. At most 300 can wait for review at once.
  - A logged-in uploader owns their photo and can edit its caption, name and muscle (which sends it back for review) or delete it.
- **Write with AI:** writes or polishes a gallery caption.
  - Public, with a limit of 8 requests per minute per IP.
  - Input is capped at 300 characters, output at 120 tokens and 140 characters; the only task is `caption`.
- **Paid subscriptions:** 1 month 15.000 KWD, 3 months 40.000, 6 months 75.000, 12 months 140.000.
  - Paying once gives that many months, with no automatic renewal. Buying again adds the time on top of the current end date.
  - Staff always have full access. To give access without payment (for example cash), edit `subscriptions` in SQL.

---

## 5. Database (Supabase)

The full schema is in [`supabase/migrations/`](supabase/migrations), exported from the live project and applied in this order:

1. `20261101172102_gym_schema`: catalog tables, staff, members, RLS
2. `20261101172250_move_is_staff_to_private`: `private` schema with `private.is_staff()`
3. `20261102124725_anime_videos_and_body_parts`: video columns + `exercises_by_body_part` view
4. `20261102125109_exercise_sets_and_reps`: sets/reps (10–14 rule)
5. `20261102131712_exercise_weights_per_level`: kg per level
6. `20261103150757_member_photos`: `member-photos` bucket + policies
7. `20261103151655_workout_photo_gallery`: `workout_photos`, the `workout-photos` bucket, the 300-pending cap
8. `20261105163420_members_manage_own_workout_photos`: photo ownership + edit guard trigger
9. `20261108152802_subscriptions_and_paywall`: `plans`, `subscriptions`, `payments`, `private.has_access()`, `activate_payment()`

> **The catalog content isn't in the migrations.** That's 7 muscles, 38 exercises (steps, tips, mistakes, AI prompts), 20 equipment items, 52 exercise↔equipment links and the 7-day schedule. Those rows were inserted separately. Export them before switching projects (section 9, step 3). The 4 plans *are* in migration 9.

### Tables and who can access them (RLS)

| Table | Read | Write |
|---|---|---|
| `muscles` | everyone | SQL/dashboard only |
| `plans` | everyone (active only) | SQL/dashboard only |
| `equipment`, `exercises`, `exercise_equipment`, `schedule_days`, `schedule_day_muscles`, view `exercises_by_body_part` (security_invoker) | `private.has_access()`, meaning staff or an active subscriber | SQL/dashboard only |
| `subscriptions` | own row, or staff | only `activate_payment()` (service role) |
| `payments` | own rows, or staff | only the edge functions (service role) |
| `members` | staff | staff |
| `staff` | own row | SQL only |
| `workout_photos` | approved: everyone · own: owner · all: staff | insert as pending (anyone; `user_id` must be you or null) · owner edits/deletes own · staff review/delete |

### Database functions

- `private.is_staff()`: true if `auth.uid()` is in `staff`.
- `private.has_access()`: staff, or a `subscriptions.ends_at` later than `now()`.
- `public.activate_payment(p_payment uuid, p_invoice text, p_payment_id text, p_paid numeric)`: callable only by the service role.
  - Locks the payment row and checks the invoice matches and the full price was paid.
  - Extends `ends_at` with `greatest(ends_at, now()) + months` and marks the payment paid.
  - Calling it twice is safe.
- `private.limit_pending_photos()` (trigger): caps pending gallery photos at 300.
- `private.guard_member_photo_edit()` (trigger): members can change only the caption, name and muscle, and an edit resets the photo to pending.
- `public.rls_auto_enable()`: Supabase's event trigger that turns on RLS for new tables.

### Storage buckets (all private)

- `member-photos`: 5 MB, jpeg/png/webp. Staff only.
- `workout-photos`: 5 MB, jpeg/png/webp. Path must be `pending/<uuid>.(webp|jpg|png)`. Anyone can upload; reading is limited to approved photos, the owner and staff.
- `workouts pictures`: **unused**, created by hand at some point. Safe to skip on a new project.

### Auth settings

In the dashboard, under **Authentication → URL Configuration**, set **Site URL** to the site's address and add it to **Redirect URLs**, so confirmation emails link back to the site.

---

## 6. Edge functions

All three are deployed with `--no-verify-jwt`. Each one checks the caller itself, has CORS with an optional `ALLOWED_ORIGINS` list and a per-instance rate limit, and stops waiting for outside services after 20 seconds.

### `create-payment` (POST `{ plan: "monthly" }`, with the member's session token)

1. Requires a logged-in user; otherwise it returns 401 "Please log in first…". Limit: 5 requests per minute per user.
2. Reads the plan from `plans`. **The price never comes from the browser.**
3. Inserts a `payments` row (pending) with the plan's months and price.
4. Calls MyFatoorah `POST /v2/SendPayment` with:
   - `InvoiceValue`, `DisplayCurrencyIso: KWD`, `NotificationOption: LNK`
   - `CallBackUrl = SITE_URL?payment=done`, `ErrorUrl = SITE_URL?payment=failed`
   - `CustomerReference` = the payment row id, `UserDefinedField` = the user id
5. Saves `invoice_id` and returns `{ url: InvoiceURL }`. The browser goes to `location.href = url`.

Error replies: 503 when the key or `SITE_URL` is missing, 401 when the key is rejected, 502 on a timeout. Friendly messages throughout.

### `verify-payment` (POST `{ paymentId }` from the site, or MyFatoorah's webhook body)

1. Trusts nothing in the request: it asks MyFatoorah `POST /v2/GetPaymentStatus` (by PaymentId, or by InvoiceId for the webhook).
2. `CustomerReference` must be one of our payment UUIDs.
3. If `InvoiceStatus` is Paid, it calls `activate_payment` and returns `{ status: "paid", ends_at }`.
4. Canceled or all failed: marks the payment failed and returns `{ status: "failed" }`. Anything else returns `{ status: "pending" }`.
5. Rate limit: 20 requests per minute per IP.

### `write-with-ai` (POST `{ task: "caption", muscle?, draft? }`)

Calls OpenRouter chat completions with a fixed system prompt (upbeat, at most 120 characters, at most one emoji, no hashtags) and returns `{ text }`.

### Secrets (Supabase → Edge Functions → Secrets)

See [`supabase/functions/.env.example`](supabase/functions/.env.example).

| Secret | Used by | Value |
|---|---|---|
| `MYFATOORAH_API_KEY` | payments | MyFatoorah token (test first) |
| `MYFATOORAH_BASE_URL` | payments | `https://apitest.myfatoorah.com` (default) or `https://api.myfatoorah.com` |
| `SITE_URL` | create-payment | public site address, e.g. `https://gym-y16a.vercel.app/` (MyFatoorah rejects `localhost`) |
| `OPENROUTER_API_KEY` | write-with-ai | from openrouter.ai/keys (set a credit limit) |
| `OPENROUTER_MODEL` | write-with-ai | optional |
| `ALLOWED_ORIGINS` | all | optional, comma-separated site origins |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | payments | **provided automatically**, don't set |

Upload them all at once: `npx supabase secrets set --env-file supabase/functions/.env --project-ref <ref>`.

---

## 7. Payment flow, end to end

```
Member clicks Subscribe (must be logged in; otherwise the login card opens in Sign up mode)
  → DB.startCheckout(plan) → edge function create-payment
      → payments row (pending) → MyFatoorah SendPayment → { url }
  → browser goes to MyFatoorah's payment page (KNET / card)
  → MyFatoorah redirects to SITE_URL?payment=done&paymentId=…   (or ?payment=failed)
  → handlePaymentReturn() → DB.verifyPayment(paymentId) → edge function verify-payment
      → MyFatoorah GetPaymentStatus → activate_payment() → subscriptions.ends_at extended
  → banner "Payment received… active until <date>", program unlocks
Optional: MyFatoorah webhook → verify-payment (activates even if the member closes the tab)
```

Test card: KNET `8888880000000001`, expiry 09/30 ([MyFatoorah test cards](https://docs.myfatoorah.com/docs/test-cards)).

---

## 8. Build history (what was done and decided)

| Date | Commit | What |
|---|---|---|
| 2026-11-02 | `8b90a74` | IronHouse site with Supabase backend: catalog, schedule, members, staff RLS |
| 2026-11-02 | `61613ab` | Better exercise demos; per-level kg weights; reps locked to 10–14 |
| 2026-11-03 | `5c7ab18` | Member photo upload (private bucket, 600×600) |
| 2026-11-03 | `a562ce2` | Community workout photo gallery with staff approval |
| 2026-11-03 | `908e22f` | Write with AI captions (edge function + OpenRouter) |
| 2026-11-05 | `0bc0c91` | Log in / Sign up / Sign out on the first page |
| 2026-11-05 | `2eea17f` | Friendly login/sign-up error messages |
| 2026-11-08 | `29d9c07` | Members can edit and delete their own gallery photos |
| 2026-11-08 | `9860378` | Paid subscriptions with MyFatoorah checkout; program locked to subscribers |
| 2026-11-10 | (this commit) | Exported DB migrations, `.env.example`, this hand-over file |

Decisions made along the way:

- **Price on the server only.** `create-payment` reads `plans.price_kwd`; the browser sends only the plan id.
- **The redirect URL is never trusted.** `verify-payment` always re-asks MyFatoorah, and `activate_payment` checks the invoice id and the amount, so it's safe to call twice.
- **The paywall is enforced by the database (RLS), not by hiding HTML.** `js/data.js` was reduced from the full catalog to public data only, and the program loads from Supabase only for users with access.
- **One payment = fixed months, no auto-renew.** Extra purchases stack.
- **Secrets live only in Supabase.** The browser holds just the publishable key. `.env` is git-ignored and `.env.example` is committed.
- **Vercel settings:** preset Other, root `./`, no build, no environment variables.
- **MyFatoorah can't return to `localhost`,** so a full payment test needs the deployed https site.

Verified so far (2026-11-08 to 11-10):

- The plans show on the live site.
- `create-payment` picks up its secrets: logged out it replies "Please log in first".
- A logged-in click created MyFatoorah invoice **7355776** (15 KWD) and opened the payment page.
- **Not yet verified:** completing a payment and returning to the site. Invoice 7355776 was never paid and is still `pending` (harmless; it can be ignored or deleted).

---

## 9. Moving to new accounts

### Step 1: GitHub

1. Create the new repo (empty: no README, no .gitignore).
2. In this folder, point git at the new repo and push:
   ```bash
   git remote set-url origin git@github.com:<new-user>/<new-repo>.git
   ```
   ```bash
   git push -u origin main
   ```
   The new account needs an SSH key or HTTPS token set up first. Alternatively, use GitHub's **Import repository** with the old repo's URL.

### Step 2: Vercel

1. New Project → import the new GitHub repo.
2. Application Preset **Other**, Root Directory `./`, leave Build and Output Settings empty, **no environment variables**. Deploy.
3. Note the new address, for example `https://<name>.vercel.app`.

### Step 3: Supabase (only if you're also moving the database)

You can keep the existing Supabase project and skip this step. If you move it:

1. **Export the data from the old project first** (you need the database password from Project Settings → Database):
   ```bash
   npx supabase db dump --db-url "postgresql://postgres:<PASSWORD>@db.axolgiobcbepqnymasgz.supabase.co:5432/postgres" --data-only --schema public -f supabase/seed.sql
   ```
   Open `seed.sql` before using it. Remove the rows for `members`, `payments`, `subscriptions` and `staff` if you don't want to copy people's data (they point at user ids that won't exist in the new project). Leave out the `plans` rows too, because migration 9 already inserts the 4 plans.
2. Create the new project, then run the migrations in order. Either paste each file from `supabase/migrations/` into the SQL editor, or:
   ```bash
   npx supabase link --project-ref <new-ref>
   ```
   ```bash
   npx supabase db push
   ```
3. Load the catalog: run `supabase/seed.sql` in the SQL editor.
4. Deploy the functions:
   ```bash
   npx supabase functions deploy create-payment --no-verify-jwt --project-ref <new-ref>
   ```
   ```bash
   npx supabase functions deploy verify-payment --no-verify-jwt --project-ref <new-ref>
   ```
   ```bash
   npx supabase functions deploy write-with-ai --no-verify-jwt --project-ref <new-ref>
   ```
5. In `js/config.js`, set the new `url` and **publishable** key (Project Settings → API). Commit and push.
6. Auth → URL Configuration: set Site URL and Redirect URLs to the new Vercel address.
7. Create the staff account(s): add a user, then `insert into public.staff (user_id) select id from auth.users where email = '…';`.
8. Gallery and member photos live in Storage. Copy them separately if you need them (both buckets were empty or nearly empty at hand-over).

### Step 4: Secrets (always, after any move)

1. Fill in `supabase/functions/.env` (copy it from `.env.example`). Set `SITE_URL` and `ALLOWED_ORIGINS` to the **new** Vercel address.
2. Upload: `npx supabase secrets set --env-file supabase/functions/.env --project-ref <ref>`.
3. In the MyFatoorah portal (optional): set the webhook URL to `https://<ref>.supabase.co/functions/v1/verify-payment`.
4. Test: log in → Subscribe → pay with the KNET test card → check for the "Payment received" banner.
5. To go live: switch to the live MyFatoorah token and set `MYFATOORAH_BASE_URL=https://api.myfatoorah.com`.

### Step 5: Claude (new account)

- Open this folder in Claude Code and tell it to read `projectDescription.md` and `README.md` first.
- Reconnect the **Supabase** and **Vercel** connectors on the new account if you want Claude to deploy and inspect them.
- Claude Code memory from the old account doesn't carry over; this file replaces it.

---

## 10. Known issues and to-dos

- **The repo is inside OneDrive.** OneDrive syncing `.git` caused stuck git processes and an `index.lock` that blocked commits. Clone the repo somewhere outside OneDrive, for example `C:\Users\<you>\code\gym`, and work there.
- **Full payment not tested yet** (see section 8). Do the KNET test payment on the deployed site.
- **MyFatoorah webhook** isn't configured yet (optional).
- **Unused bucket** `workouts pictures` on the old project.
- **No automated tests.** Check changes in the browser with `npx http-server@14.1.1 -p 5173`. Payments can only be tested on the deployed https site.
- **Line endings:** git warns "LF will be replaced by CRLF" on Windows. That's harmless.

---

## 11. Conventions for future work

- Keep it **no-build vanilla JS**. Add libraries only from a CDN with an exact version.
- All data access goes through `js/db.js`; UI goes in `js/app.js`.
- Anything secret or price-related belongs in an edge function or the database, never in the browser.
- New tables: enable RLS and write explicit policies. Use `private.is_staff()` and `private.has_access()`.
- Schema changes: add a new file in `supabase/migrations/` (`YYYYMMDDHHMMSS_name.sql`) and update section 5 here and the table in README.
- User-facing messages are plain, friendly English with no technical jargon.
