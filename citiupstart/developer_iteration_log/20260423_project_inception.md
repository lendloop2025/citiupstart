# Developer Iteration Log — Project Inception
**Date:** 2026-04-23
**Session Type:** Planning & Structuring
**Lead:** Claude (AI) + Umer Salim Khan

---

## What Happened This Session

### 1. Full Repository Scan
Complete scan of all files in `D:/NCI/Hackathons/CitiUpstart/`:
- Read all `.py`, `.md`, `.sql`, `.html`, `.css`, `.txt` files
- Viewed all `.png`/`.jpeg` images (diagrams, schema screenshots, sprint boards)
- Reviewed sprint plan from 121.ai Scrum board (Sprints 1–6, tickets LENDLOOP-6 through LENDLOOP-29)

### 2. Key Context Established
- Product: 121.ai — closed-environment P2P lending (by LendLoop)
- Tech: Flask + MySQL + Jinja2
- Team updated (see project_context)
- MLP target: last week of May 2026
- Starting from scratch — 4 development weeks

### 3. Critical Corrections Made (User-Confirmed)
| Wrong Assumption | Correct |
|---|---|
| 2.5% platform fee | Not decided — removed |
| €25 late payment fine | Not decided — removed |
| Public P2P marketplace | Closed-environment (enterprise/community deployed) |
| Single verification provider | Multi-provider approach |
| Revenue: fee-based | Revenue: 15% of borrower interest (can drop to 10%) |
| Charge enterprise | Enterprise not charged in early stage |

### 4. Workspace Structured
Created in `Project_claude/`:
- `README.md` — project overview
- `project_context/lendloop_project_context.md` — full shareable context file
- `developer_iteration_log/20260423_project_inception.md` — this file

---

## Decisions Made

| Decision | Rationale |
|---|---|
| 12 tables for MLP (not 25) | Scope-appropriate; full 25-table schema exists as reference |
| 4 weeks, starting April 23 | Hard MLP deadline end of May |
| Simulate payments (no real gateway) | Stripe/PayPal integration is weeks of work; not needed for demo |
| Flask blueprints for modular structure | Avoid spaghetti in app.py as features grow |
| Salary bands not raw numbers | Mentor directive from March 3, 2026 session |
| Community-scoped matching | Core product differentiator — only match within same org |

---

## Next Steps (Sprint 1 Work)

Sprint 1 begins now (Apr 23–29). Detailed tasks in `sprints/sprint_1.md` (to be created next).

High priority to tackle:
1. Flask project restructure (blueprints: auth, lender, borrower, admin)
2. MySQL schema for 12 MLP tables
3. User auth: signup, login, logout, sessions, bcrypt
4. Base HTML template with fintech-grade UI
5. Role-based dashboard skeletons (lender, borrower)

---

## Files Created This Session
- `Project_claude/README.md`
- `Project_claude/project_context/lendloop_project_context.md`
- `Project_claude/developer_iteration_log/20260423_project_inception.md`

---

## Open Questions (To Resolve)
- [ ] What does the enterprise admin panel look like? (Admin manages the community)
- [ ] Can a user be both lender AND borrower simultaneously?
- [ ] Is community membership managed by admin, or self-registration within a community?
- [ ] What is the exact interest rate model — fixed, negotiated, or range-based?
- [ ] Repayment schedule — monthly instalments only, or flexible?
