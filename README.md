# ChamaVault 🏦

**Digital Chama & Investment Group Management Platform for Kenya**

ChamaVault replaces the WhatsApp threads, paper ledgers, and Excel spreadsheets that Kenya's 300,000+ chamas run on today. It brings contributions, loans, governance, and meetings into one secure digital platform — with M-Pesa payments baked in.

---

## ✨ Features

### Member Portal
- 📱 **M-Pesa STK Push** — Pay contributions directly from your phone with one click
- 💰 **Contribution tracking** — Full history, M-Pesa receipt references, status tracking
- 🏦 **Loan management** — Apply, track repayments, view outstanding balance
- 📊 **Financial standing** — Total contributed, shares held, arrears at a glance
- 👤 **Profile & notifications** — SMS and email notification preferences

### Treasurer / Admin Portal
- 👥 **Member management** — Roles (Chairperson, Treasurer, Secretary), status, suspension
- 📋 **Bulk contribution generation** — Create bills for all active members in one click
- ✅ **Payment recording** — Manual M-Pesa ref recording for in-person payments
- 🏦 **Loan approvals** — Review applications, approve/reject, disburse via M-Pesa B2C
- 📈 **Loan repayment tracking** — Record instalments, auto-splits principal/interest
- 📅 **Meeting management** — Schedule, track attendance, record minutes
- 🗳️ **Digital voting** — Create resolutions, open voting, tally with quorum rules

### Treasury Dashboard
- Real-time treasury, welfare fund, and loan book balances
- Monthly collection trend chart (collected vs. expected — 12 months)
- Collection rate, overdue alerts, pending loan notifications
- Recent activity audit feed

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (JWT, credentials) |
| Payments | M-Pesa Daraja API (STK Push + B2C) |
| Storage | AWS S3 (af-south-1) |
| UI | Tailwind CSS + Recharts |
| Validation | Zod |

---

## 📊 Database Models

| Model | Purpose |
|---|---|
| **Chama** | Group settings, KES financials, M-Pesa paybill, loan rules |
| **Member** | Multi-role (Chairperson/Treasurer/Secretary/Member), M-Pesa phone |
| **Contribution** | 6 types, M-Pesa tracking, partial payment support |
| **Loan** | Full lifecycle — application → approval → disbursement → repayment |
| **LoanRepayment** | Per-instalment tracking with principal/interest split |
| **Meeting** | Scheduling, agenda, attendance, minutes |
| **Resolution** | Democratic voting with quorum rules and pass thresholds |
| **ResolutionVote** | One vote per member, FOR/AGAINST/ABSTAIN |
| **MpesaTransaction** | STK Push lifecycle tracking, callback reconciliation |
| **Document** | S3-backed file storage for bylaws, financials, minutes |
| **AuditLog** | Full immutable audit trail of all actions |

---

## 🔌 API Routes (30+)

```
POST  /api/chama                        — Create new chama + admin
GET   /api/chama/settings               — Get chama details
PATCH /api/chama/settings               — Update settings (officers only)

GET   /api/members                      — List all members
GET   /api/members/[id]                 — Member profile + loans + contributions
PATCH /api/members/[id]                 — Update role/status

GET   /api/contributions                — List (filtered by member, status, period)
POST  /api/contributions                — Create single or bulk generate
POST  /api/contributions/[id]/record    — Record manual payment (treasurer)

GET   /api/loans                        — List loans
POST  /api/loans                        — Apply for loan
POST  /api/loans/[id]/approve           — Approve (treasurer)
POST  /api/loans/[id]/reject            — Reject with reason
POST  /api/loans/[id]/disburse          — M-Pesa B2C disbursement
POST  /api/loans/[id]/repay             — Record repayment instalment

GET   /api/meetings                     — List meetings
POST  /api/meetings                     — Schedule meeting
PATCH /api/meetings/[id]               — Update status / add minutes

GET   /api/resolutions                  — List all resolutions
POST  /api/resolutions                  — Create resolution
POST  /api/resolutions/[id]/open        — Open for voting
POST  /api/resolutions/[id]/vote        — Cast vote (FOR/AGAINST/ABSTAIN)
POST  /api/resolutions/[id]/close       — Close and tally result

POST  /api/mpesa/stk-push               — Initiate STK Push
GET   /api/mpesa/status                 — Poll transaction status
POST  /api/mpesa/callback               — Daraja callback (webhook)
POST  /api/mpesa/b2c-callback           — B2C result callback

GET   /api/analytics/dashboard          — Full dashboard stats + trend chart
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your database URL, M-Pesa credentials, etc.

# 3. Set up database
npx prisma migrate dev --name init
npx prisma generate

# 4. Start development server
npm run dev

# Visit http://localhost:3000
# → Click "Register your chama" to create a new group
# → Share your Chama ID with members so they can join
```

---

## 💰 M-Pesa Integration

ChamaVault uses **Safaricom Daraja API**:

- **C2B STK Push** — Members pay contributions directly from their phones
- **B2C Business Payment** — Treasurer disburses approved loans to members' phones
- **Callback reconciliation** — Payments auto-confirmed when Safaricom calls your endpoint

For local development, use the [Daraja sandbox](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate).

For production, expose your callback URL via [ngrok](https://ngrok.com) or deploy to a public server.

---

## 🏆 Monetization

- **KES 1,500/group/month** — SaaS subscription per chama
- **1% on loans processed** — Transaction fee on loan disbursements
- **Premium tier** — Unlimited members, custom branding, API access

---

## 📁 Project Structure

```
chamavault/
├── app/
│   ├── (auth)/          # Login, Register, Onboard (create chama)
│   ├── (dashboard)/     # Protected app
│   │   ├── dashboard/   # Treasury overview + charts
│   │   ├── contributions/ # Member contribution history + M-Pesa pay
│   │   ├── loans/       # Loan application and tracking
│   │   ├── profile/     # Member profile + settings
│   │   └── admin/       # Officer-only pages
│   │       ├── contributions/ # Bulk generate + record payments
│   │       ├── loans/    # Approve, disburse, record repayments
│   │       ├── members/  # Role & status management
│   │       ├── meetings/ # Schedule + minutes editor
│   │       └── resolutions/ # Create + vote + tally
│   └── api/             # All API routes
├── components/          # Sidebar, StatCard, StatusBadge, MpesaPayButton
├── lib/                 # db, auth, mpesa, utils, types
└── prisma/
    └── schema.prisma    # Full database schema
```

---

*Built for Kenya's chama ecosystem — where community savings meet modern software.* 🇰🇪
# chamavault
