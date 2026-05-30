# 121.ai by LendLoop — UI Specification

**Visual reference:** Trading 212 (`trading212.com/invest`) — clean fintech aesthetic, navy/charcoal hero with white space, sharp typography, prominent CTAs, trust signals woven throughout.

**Goals:**
1. Build a **public landing page at `/`** for visitors who aren't logged in. Bold hero, value props, social proof, CTAs leading to **Login** and **Register**.
2. After login, replace the **"Auto-Invest"** dashboard CTA with **"Lend Money"**. The two primary actions are **Request a Loan** and **Lend Money**.
3. Drop the green/black aesthetic. Use a **navy + warm blue + soft cream** palette that feels modern, professional, and trustworthy — not gamified or crypto-coded.

---

## 1. Design System

### 1.1 Colour Palette

| Token              | Hex        | Role                                                   |
|--------------------|-----------|--------------------------------------------------------|
| `--bg`             | `#FBFAF7`  | Page background — soft warm cream, not pure white      |
| `--bg-alt`         | `#F1EFEA`  | Alt section background, subtle stripe                  |
| `--surface`        | `#FFFFFF`  | Cards, modals                                          |
| `--surface-elev`   | `#FFFFFF`  | Elevated surface (with shadow)                         |
| `--ink`            | `#0E1B2C`  | Primary text — deep navy, never pure black             |
| `--ink-muted`      | `#4A5568`  | Secondary text                                         |
| `--ink-subtle`     | `#8A94A6`  | Captions, placeholders                                 |
| `--border`         | `#E4E1DA`  | Hairline borders                                       |
| `--border-strong`  | `#C9C5BC`  | Form inputs, dividers needing presence                 |
| `--brand`          | `#1E40FF`  | Primary action — confident electric blue               |
| `--brand-hover`    | `#1735D9`  | Hover                                                  |
| `--brand-soft`     | `#E8ECFF`  | Brand-tinted backgrounds (badges, callouts)            |
| `--brand-fg`       | `#FFFFFF`  | Text on brand                                          |
| `--accent`         | `#FF6B4A`  | Coral accent — used sparingly for emphasis             |
| `--success`        | `#2D8F5C`  | Positive deltas, repaid loans                          |
| `--warning`        | `#D9A100`  | Late warnings                                          |
| `--danger`         | `#C8302A`  | Errors, defaults                                       |
| `--ink-dark-bg`    | `#0E1B2C`  | Inverted (dark) section background — hero, footer      |
| `--ink-dark-fg`    | `#FBFAF7`  | Text on dark sections                                  |

**No green-on-black.** Brand colour is electric blue `#1E40FF`. Coral `#FF6B4A` is the secondary accent, used for highlights, never as a primary CTA. Success states still use a measured green but only on small data elements (deltas, badges), never as a brand colour.

### 1.2 Typography

- **Display + UI:** `Inter` (variable). Falls back to `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **Numerals only:** `Geist Mono` for currency/scores so digits align cleanly.
- **Headline accent (optional, landing page only):** `Fraunces` (serif) for the hero headline to stand out from the body. Skip if cost-sensitive.

| Token                | Size / Line height | Weight | Use                                |
|----------------------|--------------------|--------|------------------------------------|
| `--text-display-xl`  | 72 / 80            | 700    | Landing hero headline (desktop)    |
| `--text-display`     | 56 / 64            | 700    | Section headlines                  |
| `--text-h1`          | 40 / 48            | 700    | Page titles                        |
| `--text-h2`          | 28 / 36            | 600    | Card section heads                 |
| `--text-h3`          | 20 / 28            | 600    | Card titles, subheads              |
| `--text-body`        | 16 / 24            | 400    | Body                               |
| `--text-sm`          | 14 / 20            | 400    | Helper text                        |
| `--text-xs`          | 12 / 16            | 500    | Labels, eyebrow text               |

All numbers use `font-variant-numeric: tabular-nums` so €1,234.56 lines up across rows.

### 1.3 Spacing, Radii, Shadows

- 4px base unit. Multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Container max-width:** 1200px (app), 1280px (landing page sections).
- **Radii:** `--radius-sm` 8px, `--radius-md` 14px, `--radius-lg` 24px, `--radius-pill` 9999px.
- **Shadows:**
  - `--shadow-sm`: `0 1px 2px rgba(14,27,44,0.04)`
  - `--shadow-md`: `0 8px 24px rgba(14,27,44,0.06)`
  - `--shadow-lg`: `0 24px 64px rgba(14,27,44,0.10)`
  - `--shadow-glow`: `0 0 0 4px rgba(30,64,255,0.18)` — focus rings

### 1.4 Motion

- Default transition: `200ms cubic-bezier(0.4, 0, 0.2, 1)`.
- Hover: cards lift `translateY(-2px)`, shadows grow one tier.
- Page enter: 150ms fade + 4px slide-up via `framer-motion`.
- Number changes: rolling-digit animation on balance updates.

---

## 2. Public Landing Page (`/`)

This is what an unauthenticated visitor sees. **Header has Login + Register CTAs**. The page sells the platform: "Peer-to-peer lending for the NCI community."

### 2.1 Page Outline

1. **Sticky header** (transparent over hero, white-with-border on scroll)
2. **Hero** (large, dark-navy background, headline + subheadline + dual CTA + product visual)
3. **Trust strip** (logos / numbers — "127 students lending. €48,200 funded. 0 defaults.")
4. **How it works** (3-step explainer with icons/illustrations)
5. **For borrowers** (split section, screenshot + bullets)
6. **For lenders** (split section, screenshot + bullets — alternates to right)
7. **Score-based limits explainer** (score gauge graphic + table)
8. **Security & compliance** (icon row: Stripe, GDPR, NCI-only, audit-logged)
9. **FAQ accordion** (8–10 common questions)
10. **Final CTA banner** (deep navy, large headline + Register button)
11. **Footer** (legal, links, risk warning)

### 2.2 Header

- Sticky, full-width, 72px tall.
- Transparent on hero, switches to white with `--shadow-sm` and 1px `--border` after 80px scroll.
- Left: **121.ai** wordmark in `--ink`, "by LendLoop" in `--ink-subtle` `--text-xs` underneath.
- Centre: nav links — *How it works*, *For borrowers*, *For lenders*, *Security*, *FAQ*. `--text-sm` weight 500. Hidden on mobile (hamburger).
- Right: **Sign in** (ghost button, `--ink` text) + **Get started** (primary brand button, 40px tall, `--radius-pill`).

### 2.3 Hero Section

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [eyebrow] FOR THE NCI COMMUNITY                                 │
│                                                                  │
│  Lend to your peers.                                             │
│  Borrow from your community.                                     │
│                                                                  │
│  Earn up to 12% APR by funding loans for verified NCI students,  │
│  or get fairer rates than the bank from people who know you.     │
│                                                                  │
│  [ Get started →  ]   [ Sign in ]                                │
│                                                                  │
│  ✓ Free to join   ✓ NCI students & staff only   ✓ Capital at risk│
│                                                                  │
│           ┌───────────────────────────────────┐                  │
│           │  [Product mockup of dashboard]    │                  │
│           └───────────────────────────────────┘                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Specs:**
- Background: `--ink-dark-bg` (deep navy `#0E1B2C`) with a subtle radial-gradient highlight in top-right corner using `--brand` at 8% opacity.
- Add a **subtle SVG grid pattern** overlay (1px lines, `rgba(255,255,255,0.04)`, 32px grid) to add texture without distraction.
- Eyebrow text: `--text-xs`, uppercase, letter-spaced 0.12em, `--brand-soft` colour against the dark.
- Headline: `--text-display-xl` on desktop / `--text-display` on mobile. Two-line treatment — first line in `--ink-dark-fg` (cream), second line in `--brand-soft` (soft brand tint) for emphasis. Optionally use `Fraunces` serif for the headline to stand out.
- Subheadline: `--text-body` (18px on desktop), `--ink-subtle` lightened — `rgba(251,250,247,0.7)`.
- Primary CTA: solid `--brand` blue, white text, 56px tall, `--radius-pill`, 32px horizontal padding. Right-arrow icon.
- Secondary CTA: ghost (transparent bg, white text, white 1.5px border), same height.
- Trust line: 3 inline check items, 14px, `rgba(251,250,247,0.6)`.
- Product mockup: a clean screenshot of the post-login dashboard (wallet card + the two big action cards), in a tilted browser-frame mockup. Slight `translateY` and shadow. Mobile: smaller, below CTAs. Desktop: right-aligned beside text in a 2-column grid.

### 2.4 Trust Strip

- Below hero, full-width, on `--bg-alt` background.
- Single row of 3–4 stats:
  ```
  127               €48,200            0                100%
  members          funded to date     defaults          NCI verified
  ```
- Each stat: number `--text-h1` `--ink`, label `--text-sm` `--ink-muted`. Tabular numerals. Centred.
- Subtle vertical hairline dividers between stats.

### 2.5 How It Works (3 steps)

- Section title: "How 121.ai works" (`--text-display`, centred, `--ink`).
- 3 cards in a row (desktop) / stacked (mobile):
  ```
  ┌────────────┐  ┌────────────┐  ┌────────────┐
  │ 01         │  │ 02         │  │ 03         │
  │ [icon]     │  │ [icon]     │  │ [icon]     │
  │ Verify     │  │ Match      │  │ Repay      │
  │ ────────── │  │ ────────── │  │ ────────── │
  │ Sign up    │  │ Borrowers  │  │ Loans are  │
  │ with NCI   │  │ post needs,│  │ disbursed  │
  │ email,     │  │ lenders    │  │ instantly. │
  │ verify ID, │  │ make offers│  │ Repayments │
  │ get scored │  │ at fair    │  │ are auto-  │
  │ in minutes │  │ APR.       │  │ scheduled. │
  └────────────┘  └────────────┘  └────────────┘
  ```
- Step number `--text-xs` `--accent` (coral) — coral used here as a quiet accent, not a primary action.
- Icon: 48px outline-style icons (Lucide React: `ShieldCheck`, `Handshake`, `RotateCw`).
- Title: `--text-h3`.
- Body: `--text-body`, `--ink-muted`.
- Card: white surface, `--shadow-md`, `--radius-lg`, 32px padding, no border.

### 2.6 For Borrowers / For Lenders Sections

Two alternating split sections. Each is a 2-column grid: text on one side, screenshot on the other.

**For borrowers (text-left, screenshot-right):**
- Eyebrow: "FOR BORROWERS"
- H2: "Get a loan from people who get you."
- Body: 2 sentences explaining peer lending vs. banks.
- Bullet list with check icons:
  - Borrow €100–€2,000 over 1–12 months
  - Fixed APR you choose your ceiling on
  - No hidden fees, no late-payment shame games
  - Up to 2 active loans depending on your score
- Secondary CTA: "Learn more →" (text link with arrow)

**For lenders (text-right, screenshot-left):**
- Eyebrow: "FOR LENDERS"
- H2: "Earn returns that beat your savings account."
- Bullets:
  - Up to 12% APR per loan
  - Diversify across multiple loans
  - Auto-Invest available for hands-off lending
  - Every loan is digitally signed and audit-trailed

Screenshots are real product UI in a tilted browser frame, drop-shadow, 8° rotation.

### 2.7 Score-Based Loan Limits Explainer

- Centred section, light `--bg-alt` background.
- H2: "Your community score unlocks bigger loans."
- Below, a horizontal **score gauge graphic** (semicircle gauge from 0 to 100, with tier markers).
- Below the gauge, a **clean table**:

  | Score | Max loan | Tier |
  |-------|----------|------|
  | 0–29  | Not eligible | High risk |
  | 30–49 | €200 | Elevated |
  | 50–64 | €500 | Moderate |
  | 65–79 | €1,000 | Standard |
  | 80–89 | €1,500 | Low |
  | 90–100| €2,000 | Excellent |

- Caption below: "Score is recomputed after every repayment. Successful loans push your limit up."

### 2.8 Security & Compliance Strip

- Single row of 4 columns, on `--bg` background, hairline border above and below.
- Each: small icon (Lucide `Lock`, `Shield`, `FileCheck`, `BadgeCheck`) + 2-line copy.
  - **Stripe-powered** — all funds movement via licensed PSP
  - **GDPR compliant** — data export and erasure on request
  - **NCI-only** — closed community, real identities verified
  - **Fully audit-logged** — every action recorded for transparency

### 2.9 FAQ

- Accordion, single column, max-width 720px, centred.
- 8–10 questions: "Who can join?", "How is the score calculated?", "What if a borrower defaults?", "Is my money protected?", "Can I withdraw at any time?", "What fees does 121.ai charge?", "Is this regulated?", etc.
- Closed state: question + chevron, hairline border between items.
- Open state: smooth height animation, body in `--ink-muted`.

### 2.10 Final CTA Banner

- Full-width, `--ink-dark-bg` background, 96px vertical padding.
- Centred:
  - Headline `--text-display`, `--ink-dark-fg`: "Ready to lend or borrow?"
  - Subhead `--text-body`, `rgba(251,250,247,0.7)`: "Join 127 NCI students using 121.ai today."
  - Primary brand button "Get started" + ghost button "Sign in".

### 2.11 Footer

- 3-column grid (desktop) / stacked (mobile).
  - Col 1: 121.ai wordmark + "by LendLoop" + 1-line tagline + small social icons.
  - Col 2: Product links (How it works, For borrowers, For lenders, FAQ, Help).
  - Col 3: Legal links (Terms, Privacy, Risk warning, Contact).
- Bottom row: copyright + the **risk warning** in `--ink-subtle`:
  - *"121.ai is a peer-to-peer lending platform for NCI students and staff. Capital is at risk. Loans are not protected by deposit insurance. Past performance does not guarantee future returns."*

---

## 3. Auth Pages

### 3.1 Login (`/login`)

- Two-column layout on desktop:
  - **Left (60%):** form panel on `--bg`. Centred vertically and horizontally, max-width 420px.
  - **Right (40%):** brand panel on `--ink-dark-bg`. Tagline + small product mockup or testimonial.
- Mobile: form only, brand panel hidden.

**Form panel:**
- 121.ai wordmark at top-left of viewport (linked back to `/`).
- H1 "Welcome back" + subtitle "Sign in to your 121.ai account."
- Email input, password input, "Forgot password?" link aligned right.
- Submit button: full-width, primary blue, 48px tall.
- Below: "New to 121.ai? **Create an account**" — link to `/register`.

### 3.2 Register (`/register`)

- Same two-column shell as login.
- H1 "Create your account" + subtitle "Open to current NCI students and staff only."
- Email (`@student.ncirl.ie` / `@ncirl.ie`), Password (min 10 chars).
- 3 stacked **consent checkboxes**, each with checkbox left + label flowing inline right (no narrow text column — fix the alignment bug).
- Submit button: full-width, primary blue, 48px tall.
- Below: "Already have an account? **Sign in**".

---

## 4. Post-Login Dashboard (`/dashboard`) — KEY CHANGE

### 4.1 Replace "Auto-Invest" CTA with "Lend Money"

- The two primary CTAs become **Request a Loan** and **Lend Money** (not Auto-Invest).
- Auto-Invest still exists as a feature but moves to a small text link **below** the two big cards: "Looking for hands-off lending? **Set up Auto-Invest →**"
- Rationale: Auto-Invest is an advanced feature; new users need to understand the basic lending flow first.

### 4.2 Layout

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER (white, sticky, hairline border)                      │
│ 121.ai  │  Dashboard  Lend  Borrow  Activity  │ 👤 Smruti ▾ │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ HERO GREETING                                                │
│ Good morning, Smruti                                         │
│ Your community lent €1,240 this week.                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ WALLET HERO CARD (full-width, dark navy bg, cream text)      │
│ Total balance       [Deposit] [Withdraw]                     │
│ €500.08             ↑ €0.08 (+0.02%) this month              │
│ ──────────────────────────────────────────────────────────   │
│ Available  Lent out  Borrowed  Earnings YTD                  │
│ €500.08    €0.00     €0.00     €0.00                         │
└──────────────────────────────────────────────────────────────┘

┌────────────────────────────┬─────────────────────────────────┐
│ 💸 REQUEST A LOAN          │ 📈 LEND MONEY                   │
│                            │                                 │
│ Borrow €100–€2,000 from    │ Earn up to 12% APR funding      │
│ verified NCI peers.        │ loans for NCI students.         │
│ Up to 12 months.           │ 2 open requests right now.      │
│                            │                                 │
│ [ Request a Loan → ]       │ [ Browse Requests → ]           │
└────────────────────────────┴─────────────────────────────────┘

  Looking for hands-off lending? Set up Auto-Invest →

┌──────────────────────────────┬───────────────────────────────┐
│ Recent activity              │ Your community                │
│ 28 Apr  Deposit  +€500.00    │ 2 open loan requests          │
│ 28 Apr  Bonus    +€0.08      │ 12 active loans               │
│ View all →                   │ €1,240 lent this week         │
└──────────────────────────────┴───────────────────────────────┘
```

### 4.3 Wallet Hero Card — Spec

- Full-width within container, `--ink-dark-bg` background, `--ink-dark-fg` text.
- Subtle SVG dot/grid pattern overlay (matching landing page hero) for texture.
- 32px padding, `--radius-lg`, `--shadow-lg`.
- Top row: "Total balance" label `--text-xs` uppercase letter-spaced, two ghost buttons aligned right (white border, transparent bg, white text).
- Big balance: `--text-display` (56px), `Geist Mono`, tabular-nums, animated rolling digits on update.
- Delta line: arrow + amount, coloured `--success` for positive / `--danger` for negative.
- Hairline divider in `rgba(255,255,255,0.12)`.
- 4-column metrics row: each label `--text-xs` `rgba(251,250,247,0.6)`, value `--text-h3` cream.

### 4.4 Action Cards (Request a Loan / Lend Money)

- Two cards side-by-side on desktop (24px gap), stacked mobile.
- Each: white `--surface`, `--shadow-md`, `--radius-lg`, 32px padding.
- 48px Lucide icon at top, in a 64px brand-soft circle (`--brand-soft` background, `--brand` foreground).
  - Borrow icon: `HandCoins`
  - Lend icon: `TrendingUp`
- Title: `--text-h2`, weight 700.
- Body: 2-line description, `--text-body`, `--ink-muted`.
- Live data line: small italic, `--ink-subtle`. (e.g., "2 open requests right now")
- Full-width primary brand button, 48px tall, `--radius-sm`, at bottom of card.
- Hover: card lifts 2px, shadow grows to `--shadow-lg`, icon circle subtly brightens.

### 4.5 Auto-Invest Demoted Link

- Just below the two action cards, centred text in `--ink-subtle`:
  *"Looking for hands-off lending? **Set up Auto-Invest →**"* (the bold portion is a `--brand` link).

### 4.6 Activity / Community Row

- 2-column grid below action cards, 24px gap.
- Each: white card, `--shadow-sm`, `--radius-md`, 24px padding.
- "Recent activity": list of last 3–5 ledger entries. Each row: icon (deposit / repayment / etc.), label, date, amount (right-aligned, tabular).
- "Your community": 3 stat lines + view-all link.

---

## 5. Lend Money Page (`/invest`, label = "Lend Money")

### 5.1 Page Frame

- Same header as dashboard.
- Page title: H1 "Lend Money", subtitle "Earn returns by funding loans for verified NCI peers."
- Stats strip: "Active loans: 0 · Total lent: €0 · Earnings: €0" — pill-shaped row, white card with `--shadow-sm`.

### 5.2 Filter Bar

- Sticky on scroll. White surface, full-width within container, hairline border bottom.
- 6 dropdown filters in a row + sort: **Amount**, **Term**, **APR**, **Score**, **Purpose**, **Sort**.
- Each dropdown: pill-shaped, `--radius-pill`, `--border` 1.5px, hover bg `--bg-alt`.

### 5.3 Loan Request Card (grid item)

- 3 columns desktop, 1 mobile. 24px gap.
- White surface, `--shadow-sm`, `--radius-lg`, 24px padding.
- **Top row:** amount in `--text-h2` `--ink` (Geist Mono) + score badge top-right.
- **Score badge:** pill, score number + small dot rating. Colour: green tier `--success`, amber `--warning`, red `--danger`.
- **Purpose label:** `--text-body`, weight 500.
- 4 mini-rows of label/value: Term, Max APR, Funded (with progress bar), Posted.
- Funding progress: 4px tall, `--bg-alt` track, `--brand` fill.
- Bottom: full-width primary brand button "Make an Offer →".
- Hover: lift 2px, shadow grows.

---

## 6. Borrow Page (`/borrow`)

### 6.1 Active Loans Status (Top of Page)

- Card showing **"You have 0 of 2 active loans"** with progress dots (●○ or ●●).
- If under 2: green-tinted card, large "Request a New Loan" button.
- If at 2: amber-tinted card, button disabled with tooltip ("Close an existing loan to request a new one").

### 6.2 Loan Request Form (Stepper)

- Multi-step form, 4 steps, with progress bar at top:
  ```
  Step 1 of 4: Amount & Purpose
  ●───○───○───○
  ```

**Step 1 — Amount & Purpose**
- Slider €100–€2,000 (default €500) with the number above the slider, large.
- Purpose chips (6 options): Tuition top-up, Laptop & equipment, Emergency, Living expenses, Travel home, Other.
- Description textarea (1–500 chars).

**Step 2 — Term & APR**
- Term slider (1–12 months).
- Max APR slider (0–12%).
- Live "estimated monthly payment" callout.

**Step 3 — Affordability**
- Donut chart: monthly payment as % of declared income.
  - <30% → `--success` ring
  - 30–50% → `--warning`
  - >50% → `--danger`
- Comparison sentence below the donut.

**Step 4 — Review & Commit**
- Summary card with all values.
- Commitment checkbox: "I commit to repaying this loan according to the agreed schedule."
- Primary "Submit Request" button.

---

## 7. Loan Detail / Offer Pages

### 7.1 Borrower's Loan Detail (`/borrow/[id]`)

- Top: loan request summary card (amount, term, max APR, posted-at, status).
- **Offers received (N)** — section header.
- List of offer cards, sorted by APR ascending.
- Each offer card:
  - Lender first name + initial avatar.
  - Amount + APR + term.
  - Optional message in `--ink-muted` italics.
  - **Two primary buttons side by side:** **Accept** and **Counter offer**.
  - **Counter offer** expands an inline form (amount, APR, term, optional message). Submitting the counter:
    - Marks the original lender offer as `rejected`.
    - Creates a new offer row with `proposed_by_borrower = true` and `counter_to_offer_id` pointing back at the original.
    - Notifies the lender to review and accept/decline the borrower's counter on `/invest` (lender dashboard).
  - If a counter has already been sent for this offer, show **"Counter sent — waiting on lender"** status pill instead of buttons.
- **Accept** opens a confirmation modal: shows total interest, total repayment, monthly payment, schedule preview, and "Confirm & sign agreement".
- After Accept, redirect to `/agreements/[id]/sign`.

### 7.2 Lender's Offer Page (`/invest/[id]`)

- 2-column desktop:
  - **Left:** borrower's full credit profile.
    - Score gauge (the one from landing page, smaller).
    - Score breakdown: 5 bars (identity, income, stability, financial, reputation) with values.
    - Loan purpose + description.
    - History sparkline of borrower's score over time.
  - **Right (sticky on scroll):** offer form.
    - Amount input (constrained by wallet balance + request amount).
    - APR input (constrained by request max APR).
    - Term (≤ requested term).
    - Live calculation: "You'll earn ~€X over Y months".
    - Optional message textarea.
    - Submit button.

---

## 8. Agreement Signing (`/agreements/[id]/sign`)

### 8.1 Layout

- Two columns desktop:
  - **Left (60%)**: scrollable agreement preview, PDF-styled (white surface, slight border, 64px padding, serif body if Fraunces is loaded). Inline `<iframe src="/api/agreements/{id}/pdf?preview=1">` of the live PDF.
  - **Right (40%, sticky)**: signature panel.

### 8.2 Signature Panel

- Header: "Loan agreement" + status pill (Pending borrower / Pending lender / Both signed / Active).
- Both parties listed with avatar + name + role (Borrower / Lender) + signed timestamp or "Awaiting".
- For unsigned current user: large primary "Sign Agreement" button.
- **Download PDF** button is always visible at the top-right (works pre-sign for review and post-sign for the signed copy). Hits `/api/agreements/{id}/pdf?download=1`.
- After both signed: success banner + the PDF link now serves the persisted signed copy from `agreements` storage bucket.

### 8.3 Agreement Drafting (Claude API)

- Agreement legal narrative is drafted on demand by **Claude Opus 4.7** via `lib/llm/agreement.ts` and rendered into the PDF in `lib/pdf/store.ts`.
- Sections drafted by Claude (4 fixed): Repayment Obligations, Default and Late Payment, Platform Role and Risk Disclosures, Governing Law and Electronic Signature.
- Static fallback narrative is used if `ANTHROPIC_API_KEY` is missing or the API errors — the PDF is always renderable.
- Result is cached per `loan_id` for the request lifetime.

### 8.4 Lender Dashboard — Pending Signatures Surface

- When a borrower accepts an offer, the lender already receives an in-app + email notification. Add a dashboard surface so the action is unmissable:
  - On `/dashboard`, show an **"Awaiting your signature"** card whenever the user has any loans where `lender_id = self`, `status = 'pending_signature'`, and `lender_signed_at IS NULL` (or where they're the borrower side and `borrower_signed_at IS NULL`).
  - Card uses `--brand-soft` background with `--brand` accent, lists each pending agreement with counterparty name, principal, term, APR, and a primary **"Review & sign →"** link to `/agreements/{loan_id}/sign`.
  - Sits **above** the wallet card so it's the first thing the user sees.
- Same surface mirrors **counter-offers awaiting lender response** (offers where `lender_id = self`, `status = 'pending'`, `proposed_by_borrower = true`) with a "Borrower countered your offer — review →" link to `/invest/{request_id}`.

---

### 8.5 Loan Detail — Early Payoff (`/loans/[id]`)

- For an active loan where the current user is the borrower, show an **"Pay off loan early"** card above the repayment schedule.
- Three stat cells: **Remaining principal**, **Interest still owed**, **Total payoff**.
- **Interest policy:** the **full original loan interest** is still owed even on early payoff — there is no rebate for closing early. Copy makes this explicit:
  > *"Closing early settles the full remaining principal plus the entire interest you originally agreed to pay. The loan is contracted as a fixed-return product to your lender — closing early shortens the term but does not reduce the interest."*
- Primary button: **"Pay off €X now"**, with a `window.confirm` showing the total. On confirm:
  - Debit the borrower's wallet for `remaining_principal + remaining_interest + remaining_platform_fees`.
  - Credit the lender's wallet for `remaining_principal + remaining_interest`.
  - Credit the platform treasury for `remaining_platform_fees`.
  - Mark all remaining `repayments` rows as `paid` and the loan as `paid_off`.
  - Notify both parties; recompute borrower credit score.

---

## 9. Activity / Transactions (`/activity`)

- Filter chips at top: All · Deposits · Loans · Repayments · Earnings · Fees.
- Date range picker right-aligned.
- Grouped list by month, with sticky month headers.
- Each row: icon + description + sub-label + date + amount (tabular, right-aligned, coloured by sign).
- Empty state: friendly inline SVG illustration + "No activity yet. Make your first deposit →".

---

## 10. Component Library Updates

### 10.1 Buttons

- **Primary** — solid `--brand` background, `--brand-fg` text, 48px tall (40px sm), 24px horizontal padding, `--radius-sm`. Hover: `--brand-hover`. Focus: `--shadow-glow` ring.
- **Ghost** — transparent, `--ink` text, hover bg `--bg-alt`.
- **Outline** — transparent, `--brand` text, 1.5px `--brand` border, hover bg `--brand-soft`.
- **Inverted (on dark bg)** — transparent, white text, white 1.5px border, hover bg `rgba(255,255,255,0.08)`.
- **Destructive** — `--danger` background variant.
- All buttons support `loading` (spinner) and `iconLeft` / `iconRight`.

### 10.2 Inputs

- Border 1.5px `--border-strong`, `--radius-sm`, 12px padding, 44px tall.
- Focus: border `--brand`, `--shadow-glow`.
- Error: border `--danger`, helper text below in `--danger`.
- Label always above (no floating labels), `--text-sm` weight 500.
- Helper/error `--text-xs` below.
- **Checkbox + Radio:** 18px, custom styled, `--brand` when checked. Label flows inline beside the box (fixes the alignment bug).

### 10.3 Score Badge

- Pill, 28px tall.
- Background: tier colour at 12% opacity (e.g., `rgba(45,143,92,0.12)` for green tier).
- Text: tier colour at full saturation, weight 600.
- Optional 5-dot rating right of the number.

### 10.4 Toast Notifications

- Top-right, slide-in 200ms, auto-dismiss 5s.
- Success / Error / Info variants with left-border colour cue.

### 10.5 Modal

- Backdrop: `rgba(14,27,44,0.5)` with 8px backdrop blur.
- Modal: white surface, `--shadow-lg`, `--radius-lg`, 32px padding, max-width 480px (default).
- Close button top-right, 32px hit area.

---

## 11. Implementation Order

1. **Tokens** — write all CSS variables in `app/globals.css`. This single change shifts everything off the green-on-black aesthetic.
2. **Public landing page (`/`)** — new Server Component page. Highest priority because it's the unauthenticated entry point and currently doesn't exist as a marketing page.
3. **Header redesign** — sticky, transparent-over-hero, dropdown menu for logged-in users.
4. **Auth pages (`/login`, `/register`)** — split layout with brand panel.
5. **Dashboard rewrite** — wallet hero + Request a Loan / Lend Money cards + Auto-Invest demoted link + activity row.
6. **Lend Money page** — filter bar + loan request grid using new card.
7. **Borrow page** — active-loan-limit card + 4-step stepper form.
8. **Offer detail pages** — split layout with sticky panel.
9. **Agreement signing** — PDF-style left + sticky signature panel right.
10. **Activity page** — grouped list.
11. **Empty states + skeletons** — every list view.
12. **Polish pass** — hover states, focus rings, motion, page transitions.

---

## 12. Quick-Win Diff for Current Codebase

In order of effort/impact ratio:

1. **Update tokens in `app/globals.css`** — single biggest visual change. ~10 minutes.
2. **Create `app/(marketing)/page.tsx`** as the new landing page replacing whatever currently sits at `/`. The existing redirect logic (proxy.ts) should let unauthenticated users see this page and route logged-in users to `/dashboard`.
3. **Patch `app/(app)/dashboard/page.tsx`** — swap the "Set up Auto-Invest" card for a "Lend Money" card pointing at `/invest`, and demote Auto-Invest to a small link below.
4. **Add `Inter` (and optionally `Fraunces`) via `next/font/google`** in `app/layout.tsx`.
5. **Build a `<WalletHeroCard>` component** and a `<ActionCard>` component to use on the dashboard.
6. **Public landing-page sections** can be added incrementally — start with hero + how-it-works + footer; the rest can follow.

---

## 13. References

- **Trading 212** — hero composition, dark navy backgrounds, generous whitespace, tabular numerals.
- **Wise** — clean form design, currency presentation, two-column auth pages.
- **Mercury** — dashboard density, sidebar navigation patterns (skip the sidebar for now; use top nav).
- **Linear** — typography hierarchy, animation timing, polish standards.

When in doubt: more whitespace, larger typography, fewer borders, subtle shadows, and brand blue used sparingly only on primary actions.