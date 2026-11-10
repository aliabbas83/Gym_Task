# IronHouse Bodybuilding Gym

> **Moving or picking up this project?** Start with [projectDescription.md](projectDescription.md). It covers the full build, the database schema, the payment flow, the build history, and step-by-step instructions for moving to a new GitHub, Vercel, Supabase or Claude account. The database schema is in [supabase/migrations/](supabase/migrations), and every secret the functions need is listed in [supabase/functions/.env.example](supabase/functions/.env.example).

A static website for a bodybuilding gym:

- **Paid subscription (home page):** 1, 3, 6 and 12 month plans in KWD, paid online through MyFatoorah (KNET or card). The home page, plans and community gallery are public. The schedule, exercises by body part, exercise library, equipment and training guide are for subscribers and staff only; everyone else sees a locked panel with a link to the plans. See [Subscriptions (MyFatoorah)](#subscriptions-myfatoorah).

- **Weekly schedule:** a 5-day split. Each day targets one or two muscles: Chest · Back · Shoulders · Legs (quadriceps + hamstrings) · Arms (triceps + biceps/forearms), plus 2 rest days. The number of exercises per muscle depends on the level (Beginner 4/3, Intermediate 5/4, Advanced 6/5 for one-muscle/two-muscle days). Each exercise has its own sets and reps (`exercises.sets`, `reps_min`, `reps_max`). Reps are always between **10 and 14**, and the database rejects anything outside that range. Beginners do 3 sets and advanced members add 1. The goal sets the rest time.
- **Starting weights (kg):** every exercise has a weight for beginner, intermediate and advanced members (`weight_beginner_kg`, `weight_intermediate_kg`, `weight_advanced_kg`). `weight_basis` says what the number measures: total including the bar, per dumbbell, machine stack, plates loaded, or added to bodyweight. Member schedules show the weight for that member's level.
- **Exercises by body part:** every exercise name listed under its upper- or lower-body muscle. The same list is available as the Supabase view `exercises_by_body_part`.
- **Exercise library:** 38 exercises, each with its type (compound/isolation), form (free weight, machine, cable, bodyweight), steps, tips, common mistakes, an animated demo and an AI-video prompt.
- **Equipment:** 20 pieces of equipment, with the muscles each one trains and the exercises that use it.
- **Members:** staff register subscribed members (plan length, level, goal). Each member gets a personal printable schedule.
- **Accounts (home page):** **Log in**, **Sign up** and **Sign out** in the header and in a card on the first screen, using Supabase Auth. A new account doesn't get access to member records; it must also be added to the `staff` table (see below). In the Supabase dashboard under **Authentication → URL Configuration**, set **Site URL** to the site's address and add it to **Redirect URLs**, so confirmation emails link back to the site.
- **Community gallery (home page):** any visitor can upload a workout photo with an optional caption, name and muscle. Accepted formats are JPG, PNG and WebP up to 5 MB, resized to at most 1280 px in the browser, and the visitor must tick a consent box. New photos are saved as **pending** in the `workout_photos` table and the private `workout-photos` bucket. They appear publicly only after a signed-in staff member approves them in the "Waiting for approval" panel; rejected photos are deleted. At most 300 photos can wait for review at once.
- **Member photos:** staff can upload a photo in the member form, by clicking or dragging an image in, or later with **Add/Change photo** on a member card. Accepted formats are JPG, PNG and WebP up to 5 MB. Images are centre-cropped and resized to 600 × 600 in the browser before upload. They're stored in the **private** Supabase bucket `member-photos`, which only staff can read or write, and shown through links that expire after an hour.

## Run locally

It's plain HTML/CSS/JS with no build step. Serve the folder over HTTP:

```bash
npx http-server@14.1.1 -p 5173
```

Then open http://localhost:5173.

## Supabase

`js/config.js` holds the project URL and the **publishable** key. Both are safe to ship, because row level security controls access.

| Table | Who can read | Who can write |
|---|---|---|
| `muscles`, `plans` (active ones) | everyone | dashboard / SQL only |
| `equipment`, `exercises`, `exercise_equipment`, `schedule_days`, `schedule_day_muscles` (and the `exercises_by_body_part` view) | members with an active subscription, and staff | dashboard / SQL only |
| `subscriptions`, `payments` | the member (own rows), staff (all) | the payment edge functions only |
| `members` | staff only | staff only |
| `staff` | the staff user themself | dashboard / SQL only |
| `workout_photos` | everyone (approved), the owner (own), staff (all) | anyone can submit as pending; the owner can edit or delete their own; staff can review or delete any |

A signed-in member owns the gallery photos they upload (`workout_photos.user_id`, and `owner_id` on the stored file). They can edit the caption, name and muscle, which sends the photo back for staff approval, and they can delete the photo. Replacing the image file isn't allowed; delete it and upload a new one. Photos uploaded without logging in have no owner, so only staff can change them.

`js/data.js` holds only what the public home page needs: muscle names and colours, the headline numbers and the hero animation. The program itself is loaded from Supabase after a subscriber or staff member logs in. To change the program, edit the tables in the Supabase dashboard.

### Adding a staff account

1. In Supabase, go to **Authentication → Users → Add user** and create a user with an email and password.
2. In the SQL editor, run:

   ```sql
   insert into public.staff (user_id)
   select id from auth.users where email = 'coach@example.com';
   ```

3. Sign in on the website's **Members** section.

## Subscriptions (MyFatoorah)

How a payment works:

1. A logged-in member picks a plan in **Subscription plans**. Visitors are asked to sign up or log in first.
2. The edge function `create-payment` ([source](supabase/functions/create-payment/index.ts)) reads the price from the `plans` table, records a pending row in `payments`, and asks MyFatoorah (`SendPayment`) for an invoice. The member is sent to MyFatoorah's payment page.
3. MyFatoorah sends the member back to the site with `?payment=done&paymentId=…`. The site calls `verify-payment` ([source](supabase/functions/verify-payment/index.ts)), which asks MyFatoorah (`GetPaymentStatus`) whether the invoice is paid. Only then does the database function `activate_payment` extend the member's row in `subscriptions`. It checks that the invoice matches and the full price was paid, and does nothing if the same payment is confirmed twice.
4. Buying again while subscribed adds the new months on top of the current end date. There is no automatic renewal.

Plans and prices live in the `plans` table (`price_kwd`, `months`, `active`). Edit them in the Supabase dashboard; the site reads them on every visit.

### Setup

1. **Get a MyFatoorah API key.** For testing, register a demo account at registertest.myfatoorah.com, or use the public demo token from [MyFatoorah's API key page](https://docs.myfatoorah.com/docs/api-key#test-demo-token). For real payments, create a key in the MyFatoorah portal under **Integration Settings → API Key**.
2. **Host the site on a public https address.** MyFatoorah doesn't accept `localhost` as the return address, so a full payment can't be tested on `http://localhost:5173`.
3. In Supabase → **Edge Functions → Secrets**, add:

| Secret | Required | Value |
|---|---|---|
| `MYFATOORAH_API_KEY` | yes | your MyFatoorah API token (test token first) |
| `SITE_URL` | yes | the site's public address, e.g. `https://ironhouse.example.com/` |
| `MYFATOORAH_BASE_URL` | no | `https://apitest.myfatoorah.com` (default, test) or `https://api.myfatoorah.com` (live, Kuwait) |
| `ALLOWED_ORIGINS` | no | shared with Write with AI; your site address |

4. Test with MyFatoorah's [test cards](https://docs.myfatoorah.com/docs/test-cards), e.g. KNET `8888880000000001`, expiry 09/30.
5. Optional but recommended: in the MyFatoorah portal, set the webhook URL to `https://axolgiobcbepqnymasgz.supabase.co/functions/v1/verify-payment`. Then a payment still activates if the member closes the browser before returning to the site. The webhook body isn't trusted; the function always re-checks the payment with MyFatoorah.
6. To go live, change `MYFATOORAH_API_KEY` to the live token and `MYFATOORAH_BASE_URL` to `https://api.myfatoorah.com`.

To redeploy after editing a function:

```bash
npx supabase functions deploy create-payment --no-verify-jwt --project-ref axolgiobcbepqnymasgz
```

```bash
npx supabase functions deploy verify-payment --no-verify-jwt --project-ref axolgiobcbepqnymasgz
```

Staff accounts always have full access. To give someone access without paying (for example after a cash payment), insert or update their row in `subscriptions` in the SQL editor.

## Write with AI (OpenRouter)

The **✨ Write with AI** button next to the gallery caption writes a caption from the chosen muscle, or polishes what the visitor typed. It calls the Supabase Edge Function `write-with-ai` ([supabase/functions/write-with-ai/index.ts](supabase/functions/write-with-ai/index.ts)), and that function calls OpenRouter. The OpenRouter key is stored only as a Supabase secret and never reaches the browser.

Setup: Supabase dashboard → **Edge Functions → Secrets**:

| Secret | Required | Value |
|---|---|---|
| `OPENROUTER_API_KEY` | yes | your key from openrouter.ai/keys |
| `OPENROUTER_MODEL` | no | an OpenRouter model id, by default `anthropic/claude-haiku-5.5` |
| `ALLOWED_ORIGINS` | no, but recommended once hosted | your site address, e.g. `https://ironhouse.vercel.app` (comma-separate several) |

The function is public, because visitors use it without signing in. It limits each visitor to 8 requests per minute, caps input at 300 characters and output at 120 tokens, and only does the `caption` task. Also set a credit limit on the OpenRouter key, so cost can't run away.

To redeploy after editing the function:

```bash
npx supabase functions deploy write-with-ai --no-verify-jwt --project-ref axolgiobcbepqnymasgz
```

## AI exercise videos (anime style)

Each exercise has an anime-style animated demo built in. Each exercise's anime AI-video prompt is stored in `exercises.ai_video_prompt`, at the length set in `video_length_seconds` (15 s by default). The site shows that stored prompt, and builds a new one when 8 s or 30 s is chosen. To replace a demo with an AI-generated video:

1. Open the exercise and click **Copy prompt**, or use **Download all anime video prompts**.
2. Generate the clip in an AI video tool.
3. Save the clip as `videos/<exercise-id>.mp4` (for example `videos/bench-press.mp4`), **or** upload it to Supabase Storage and put its URL in `exercises.video_url`.

The video plays automatically in place of the animation.
