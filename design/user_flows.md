# 121.ai by LendLoop — User Flows
**Scope:** MLP (Most Lovable Product)
**Last Updated:** 2026-04-23

---

## Flow 1: New User Registration

```
Landing Page (/)
      │
      ├── "Get Started as Borrower" ──┐
      └── "Start Lending"  ───────────┤
                                      ▼
                              Signup Page (/auth/signup)
                              ┌─────────────────────┐
                              │ Full Name            │
                              │ Email                │
                              │ Password             │
                              │ Confirm Password     │
                              │ Role: [Lender/Borrower]
                              │ Community: [dropdown]│
                              └──────────┬──────────┘
                                         │ POST
                                         ▼
                              Validate → Hash Password
                              Create users record
                              Create user_profile record
                              Create lenders OR borrowers record
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                        Role = Lender        Role = Borrower
                              │                     │
                              ▼                     ▼
                      Lender Dashboard      Borrower Dashboard
```

---

## Flow 2: Borrower — Complete Assessment & Post Loan

```
Borrower Dashboard
      │
      └── "Start Assessment" button
                    │
                    ▼
         Assessment Form (/borrower/assessment)
         ┌──────────────────────────────────────┐
         │ Section 1: Personal Info             │
         │ Section 2: Government ID             │
         │ Section 3: Employment & Income       │
         │   (conditional fields by status)     │
         │ Section 4: Financial Info            │
         │ Section 5: Loan Intent               │
         │ Section 6: Reference                 │
         └──────────────┬───────────────────────┘
                        │ POST
                        ▼
              Run scoring algorithm
              Store assessment in DB
              Update borrowers table (scores)
                        │
                        ▼
         Assessment View (/borrower/assessment/view)
         ┌──────────────────────────────────────┐
         │  Score: 72 / 100  [Strong]           │
         │  ████████████░░░  Identity: 16/20    │
         │  ██████████████░  Financial: 22/30   │
         │  ████████░░░░░░░  Credit: 17/25      │
         │  ██████████░░░░░  Stability: 11/15   │
         │  ████████░░░░░░░  Reputation: 6/10   │
         │                                      │
         │  [Post a Loan Request] →             │
         └──────────────────────────────────────┘
                        │
                        ▼
         Loan Request Form (/borrower/request/new)
         ┌──────────────────────────────────────┐
         │ Amount: €[input]                     │
         │ Purpose: [dropdown]                  │
         │ Duration: [dropdown, months]         │
         │ Receive via: [dropdown]              │
         │ Notes: [textarea, optional]          │
         └──────────────┬───────────────────────┘
                        │ POST
                        ▼
              Write loan_request (status: active)
              Flash: "Your request is live!"
                        │
                        ▼
         Borrower Dashboard (loan request shown as active)
```

---

## Flow 3: Lender — Deposit & Browse Borrowers

```
Lender Dashboard
      │
      ├── "Deposit Funds" ──────────────────────────────┐
      │                                                  ▼
      │                                    Deposit Form (/lender/deposit)
      │                                    ┌────────────────────────┐
      │                                    │ Amount: €[input]       │
      │                                    │ Method: [dropdown]     │
      │                                    └──────────┬─────────────┘
      │                                               │ POST (simulated)
      │                                               ▼
      │                                    Update lender balance in DB
      │                                    Write transaction record
      │                                    Flash: "€X added to your account"
      │                                               │
      └──────────────────────────────────────────────┐│
                                                     ▼▼
                                    Lender Dashboard (balance updated)
                                            │
                                    "Browse Borrowers" button
                                            │
                                            ▼
                             Borrowers Listing (/lender/borrowers)
                             ┌──────────────────────────────────────┐
                             │ Community: 121.ai Demo               │
                             │ Filter: [Score] [Amount] [Purpose]  │
                             │                                      │
                             │ ┌────────────────────────────────┐  │
                             │ │ JD   John Doe    Score: 72     │  │
                             │ │      €2,000 • Education • 12mo │  │
                             │ │                  [View Profile] │  │
                             │ └────────────────────────────────┘  │
                             │                                      │
                             │ ┌────────────────────────────────┐  │
                             │ │ MS   Maria S.    Score: 58     │  │
                             │ │      €500 • Medical • 6mo      │  │
                             │ │                  [View Profile] │  │
                             │ └────────────────────────────────┘  │
                             └──────────────────────────────────────┘
```

---

## Flow 4: Lender → Make Offer

```
Borrower Profile (/lender/borrower/<id>)
      │
      │  Score breakdown, loan request details, repayment history
      │
      └── "Make an Offer" button
                    │
                    ▼
         Offer Form (/lender/offer/new/<request_id>)
         ┌──────────────────────────────────────┐
         │ Offered Amount: €[input]             │
         │ Interest Rate: [%]                   │
         │ Duration: [dropdown, months]         │
         │ Monthly payment: €X (calculated)    │
         │ Total repayable: €Y (calculated)    │
         │ Message to Borrower: [textarea]      │
         └──────────────┬───────────────────────┘
                        │ POST
                        ▼
              Validate lender has sufficient balance
              Write loan_offer (status: pending)
              Create notification for borrower
              Flash: "Offer sent!"
                        │
                        ▼
              Lender Dashboard
```

---

## Flow 5: Borrower — Review & Accept Offer

```
Borrower Dashboard
      │  (notification: "You have a new offer")
      │
      └── "View Offers" / notification bell
                    │
                    ▼
         Offers Page (/borrower/offers)
         ┌──────────────────────────────────────┐
         │ Offer from: William T.               │
         │ Amount: €2,000                       │
         │ Rate: 8% p.a.                        │
         │ Duration: 12 months                  │
         │ Monthly payment: €173.33             │
         │ Total repayable: €2,080              │
         │ Message: "Happy to help, good luck!" │
         │                                      │
         │  [Accept]          [Reject]          │
         └──────────────────────────────────────┘
                        │ Accept
                        ▼
              loan_offer → status: accepted
              Other offers → status: expired
              loan_request → status: accepted
              Create loan record
              Trigger disbursement (simulated)
              Generate repayment schedule
              Notify lender: "Offer accepted"
                        │
                        ▼
         Loan Agreement (/loan/<id>/agreement)
         ┌──────────────────────────────────────┐
         │ Borrower: John Doe                   │
         │ Lender: William Thompson             │
         │ Principal: €2,000                    │
         │ Rate: 8% p.a.  Duration: 12 months   │
         │ Monthly: €173.33                     │
         │ Total: €2,080                        │
         │ Start: May 15, 2026                  │
         │ End: May 15, 2027                    │
         │                                      │
         │ Repayment Schedule:                  │
         │ Month 1: Jun 15 — €173.33            │
         │ Month 2: Jul 15 — €173.33            │
         │ ...                                  │
         └──────────────────────────────────────┘
```

---

## Flow 6: Borrower — Make a Repayment

```
Borrower Dashboard
      │  Active loan card: "Next payment: €173.33 due Jun 15"
      │
      └── "Make Payment" button
                    │
                    ▼
         Repayment Page (/borrower/repayment/<loan_id>)
         ┌──────────────────────────────────────┐
         │ Next payment due: Jun 15, 2026       │
         │ Amount: €173.33                      │
         │   Principal: €160.00                 │
         │   Interest:  €13.33                  │
         │                                      │
         │ Pay via: [simulated for MLP]         │
         │                                      │
         │  [Confirm Payment]                   │
         └──────────────────────────────────────┘
                        │ POST
                        ▼
              Mark repayment completed
              Update loan.amount_paid, amount_remaining
              Credit lender balance + interest
              Record platform cut (15% of €13.33 = €2.00)
              Write transaction records (borrower + lender)
              Update borrower.on_time_payments
              Notify lender: "Repayment received: €173.33"
              Check if loan complete → update status
                        │
                        ▼
              Borrower Dashboard
              Flash: "Payment of €173.33 confirmed!"
```

---

## Flow 7: Credit History View (Borrower)

```
Borrower Dashboard → "My Credit History"
      │
      ▼
Credit History Page (/borrower/credit-history)
┌──────────────────────────────────────────────────────┐
│  Your Credit Journey                                 │
│  Score today: 72 / 100  [Strong]                     │
│                                                      │
│  Timeline:                                           │
│                                                      │
│  ● May 15, 2026 — Assessment completed    +10 pts   │
│  ● Jun 15, 2026 — Repayment on time       +2 pts   │
│  ● Jul 15, 2026 — Repayment on time       +2 pts   │
│                                                      │
│  Payment Record:                                     │
│  ████████████████░░░░  8/10 on time                  │
│                                                      │
│  What this means:                                    │
│  "Every on-time repayment builds your financial     │
│  identity — visible to future lenders and           │
│  eventually to banks and financial institutions."   │
└──────────────────────────────────────────────────────┘
```

---

## Error & Edge Case Flows

| Scenario | Handling |
|---|---|
| Lender tries to offer more than their balance | Form validation error: "Insufficient funds" |
| Borrower posts loan request without assessment | Route redirects to assessment form |
| Borrower tries to access another borrower's profile | 403 Forbidden |
| Loan repayment is made after due date | `is_late = TRUE`, `days_late` calculated, loan status updated to delinquent_X |
| All lenders reject offer / no offers received | Borrower sees empty state with CTA to re-post or message lenders |
| User tries to log in with wrong password | Generic error: "Invalid credentials" (no hint about which field) |
| Session expires mid-flow | Redirect to login with flash: "Your session expired. Please log in again." |
