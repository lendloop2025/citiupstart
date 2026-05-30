# Run 121.ai locally

## Prerequisites

| Tool | Version (tested) | Why |
| --- | --- | --- |
| **Node.js** | 20.x LTS | Next.js 16 app (`package.json`) |
| **npm** | 10+ | Installs dependencies |
| **Supabase project** | Cloud or CLI | Postgres + Auth + Storage (shared with Vercel deploy) |
| **Stripe account** | Test mode | Wallet deposits via Checkout |
| **Resend account** | Optional for email | Transactional mail; can skip for UI-only dev |
| **Stripe CLI** | Latest | Local webhook forwarding (`npm run stripe:listen`) |
| **Python 3.10+** | Optional | Only for `features/` ML training, not the web app |

## 1. Clone and install

```powershell
cd d:\NCI\Hackathons\CitiUpstart\Project_claude
npm install
```

The runnable app lives at the **repository root** (`app/`, `lib/`, `package.json`). Do not run `citiupstart/app/app.py` unless you intentionally want the older Flask prototype.

## 2. Environment file

```powershell
copy .env.example .env.local
```

Fill every value — see [02-integrations-and-secrets.md](./02-integrations-and-secrets.md). Minimum to boot the UI with login:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `SESSION_SECRET` (32+ random bytes; encrypts TOTP secrets)

For deposits and emails, also set Stripe and Resend keys.

**Pull from Vercel (if you have access):**

```powershell
npx vercel link
npx vercel env pull .env.local
```

Then set `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local work (Vercel production URL will break email redirect links if left unchanged).

## 3. Database migrations

SQL lives in `supabase/migrations/`. Apply in order on the **same** Supabase project the team uses for Vercel:

1. `001_init.sql` — schema, communities, wallets, loans
2. `002_rls.sql` — row-level security
3. `003_wallet_functions.sql` — atomic wallet credit/debit
4. `004_seed_demo.sql` — NCI community, demo users (including `x24197432@student.ncirl.ie`)
5. `005_flow_alignment.sql`, `006_counter_offers.sql` — flow tweaks

**How to apply:** Supabase Dashboard → SQL Editor → paste each file → Run.  
Or use [Supabase CLI](https://supabase.com/docs/guides/cli) linked to the project.

`004_seed_demo.sql` only inserts into `public.users` (and related tables). **Supabase Auth users must already exist** with matching UUIDs, or registration must be used to create them. Ask a teammate for auth passwords or reset via Supabase → Authentication → Users.

## 4. Start the dev server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next dev server (port 3000) |
| `npm run build` | Production build (same as Vercel) |
| `npm run start` | Serve production build |
| `npm run typecheck` | TypeScript without emit |
| `npm run stripe:listen` | Forward Stripe webhooks to `localhost:3000/api/webhooks/stripe` |

## 5. Stripe webhooks (deposits)

Deposits use Stripe Checkout. Balance updates when Stripe calls `/api/webhooks/stripe`.

**Terminal 1:** `npm run dev`  
**Terminal 2:** `npm run stripe:listen`  
Copy the `whsec_...` secret from the CLI into `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart dev.

On Vercel, the webhook URL is configured in the Stripe Dashboard pointing at production — not the CLI secret.

## 6. Scheduled jobs (optional locally)

| Route | Purpose | Auth |
| --- | --- | --- |
| `POST /api/cron/repayments` | Due repayments, late fees | `Authorization: Bearer <CRON_SECRET>` |
| `POST /api/cron/expire-requests` | Expire stale loan requests | Same |

In production these are usually triggered by Vercel Cron or an external scheduler. Set `CRON_SECRET` in env.

## 7. ML confidence model (optional)

Not required to run the website. To retrain:

```powershell
python -m features.train_model
```

See `features/README.md`. The Next.js app uses the in-app **rule-based** credit score (`lib/scoring/`); the Python model is a parallel/experimental signal for lenders.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Redirect loop to `/login` | Missing/invalid Supabase keys or no session cookie |
| "Registration limited to NCI" | Email domain not in `NCI_EMAIL_DOMAINS` |
| Deposit succeeds but balance unchanged | `STRIPE_WEBHOOK_SECRET` wrong or `stripe listen` not running |
| 2FA setup fails | `SESSION_SECRET` missing or too short for encryption |
| Profile missing after sign-up | `SUPABASE_SERVICE_ROLE_KEY` wrong; server cannot insert `public.users` |
| Build fails on PDF | `@react-pdf/renderer` is server-externalized in `next.config.ts` — use Node 20 |
