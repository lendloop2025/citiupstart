# 121.ai developer guide

Documentation for running, connecting, and understanding the **production Next.js app** in this repo (not the legacy Flask prototype under `citiupstart/`).

| Doc | What it covers |
| --- | --- |
| [01-run-locally.md](./01-run-locally.md) | Prerequisites, install, env, DB migrations, dev server, Stripe webhooks |
| [02-integrations-and-secrets.md](./02-integrations-and-secrets.md) | Every external service, env var, and where it is configured (Vercel, Supabase, Stripe, etc.) |
| [03-project-overview.md](./03-project-overview.md) | Architecture, routes, auth/OTP flow, deployed demo, repo layout, subtle gotchas |

**Live app (team Vercel deploy):** [https://121ai-v8kw-lendloop2025s-projects.vercel.app/](https://121ai-v8kw-lendloop2025s-projects.vercel.app/)

**Demo NCI account (seeded in DB):** `x24197432@student.ncirl.ie` — see [03-project-overview.md](./03-project-overview.md#demo-account-on-vercel).

Copy env template from repo root: [`.env.example`](../../.env.example) → `.env.local`.
