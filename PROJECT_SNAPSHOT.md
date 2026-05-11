# Google Connect — Project Snapshot
**Generated:** 2026-05-09  
**Session context:** Full build history captured. No git history exists — all changes tracked here.

---

## 1. Project Overview

**Google Connect** is a SaaS web app that lets users transfer data between Google accounts and external cloud storage providers. It is a migration tool sold as a one-time payment (no subscription).

### What it does
- Transfer Gmail (emails, labels, attachments) between two Google accounts
- Transfer Google Drive files/folders between two Google accounts
- Transfer Drive files to external storage: **Mega.nz** (20 GB free) and **Drime** (20 GB free, EU)
- Show storage usage and upsell users to free up Google storage space
- Accept payments via Stripe (international) and UPI (India only, IP-detected)
- Admin panel for live pricing edits and promo banners — no code changes required

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | Tailwind CSS v4, Radix UI, Lucide icons |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe Checkout (GBP) + UPI QR code (INR, India only) |
| Email | Resend (purchase confirmations + admin notifications) |
| Google APIs | googleapis v171 (Drive v3, Gmail v1, OAuth2) |
| External storage | megajs (Mega.nz), Drime REST API (Cloudflare R2 backend) |
| Token security | AES-256 encryption for stored OAuth tokens |
| Dev tooling | Stripe CLI (webhook forwarding), Start-Dev.bat one-click launcher |

---

## 2. Current Status

### Working Features

| Feature | Notes |
|---|---|
| Google OAuth login | Sign in / sign up via Google, Supabase session management |
| Connect multiple Google accounts | Primary + secondary, stored in connected_accounts table |
| Gmail transfer | Copies emails between Google accounts; free plan capped at 10 GB |
| Drive transfer (account to account) | File + folder recursion, token refresh fixed, progress tracking |
| Drive to Mega.nz transfer | Pro plan; Mega session via bookmarklet, upload via megajs |
| Drive to Drime transfer | Pro plan; multipart R2 upload fixed (no Content-Type on parts) |
| Transfer progress UI | Real-time polling, Transfer More / Try Again button, file selection resets |
| Plan gating | Free / Essential / Pro enforced server-side on all transfer routes |
| Stripe payment | Checkout session → server-side verification → plan activated before redirect |
| UPI payment (India only) | IP-detected via /api/geo; shows QR + UPI ID; manual confirmation flow |
| Plan activation | /api/payments/stripe/success: verifies with Stripe API, writes plan to DB, sends emails |
| Purchase emails | Customer confirmation + admin notification via Resend |
| Purchase recording | Every successful payment inserts into purchases table |
| Admin pricing panel | /dashboard/admin — edit GBP/INR prices and promo banner live |
| Live pricing | Checkout and pricing page fetch from DB (60 s cache), fall back to pricing.ts |
| Promo banner | Admin-controlled; shown on landing page and /dashboard/premium; dismissible |
| Storage upsell | Dashboard shows Google Drive + Gmail usage; "free up X GB" Pro CTA |
| History page | Lists all past transfer jobs |
| Admin nav link | Only visible when signed in as ADMIN_EMAIL |

### Incomplete / Caveats

| Item | Status |
|---|---|
| Photos transfer | Route exists but hidden from UI — not yet enabled |
| Resend admin email in test mode | Test keys only deliver to your Resend account email |
| UPI payment | Manual process — no automated plan confirmation |
| Stripe webhook | Present as backup only — primary path is the success route |
| Home page pricing | Static £19/£39 — does not pull from live app_settings |
| NEXT_PUBLIC_UPI_ID | Still set to placeholder yourname@upi in .env.local |

### Known Issues / Warnings

- npm audit reports some dependency vulnerabilities (non-critical for dev)
- No git history initialised — project has never been committed
- Resend admin notification may not arrive if ADMIN_NOTIFICATION_EMAIL does not match Resend signup email

---

## 3. File Transfer Architecture

### How transfers work

1. **Job creation** — POST to /api/transfer/drive (or /gmail, /external) creates a row in transfer_jobs with status: pending
2. **Background processing** — Files are processed sequentially in the same serverless function call (no queues)
3. **Progress polling** — Client polls /api/transfer/status/[jobId] every 1.5 s via a while loop in TransferProgress.tsx
4. **Completion** — Job status becomes completed or failed; UI shows result with button

### Key transfer fixes applied this session

- **Token refresh**: getFreshToken() forces expiry_date: 1 so getAccessToken() always performs a network refresh
- **Folder recursion total_files**: state.totalFiles = state.totalFiles - 1 + children.length
- **Drime multipart upload**: Removed Content-Type header from R2 part PUT requests (R2 presigned part URLs are not signed with it)
- **Drive binary download**: Uses native fetch() instead of gaxios (gaxios v7 returns a ReadableStream incompatible with Node.js Buffer operations)

---

## 4. Project Structure

```
C:\Projects\Google Connect\
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Public landing page (server, fetches live promo)
│   │   ├── login/page.tsx                    # Google OAuth sign-in page
│   │   ├── auth/callback/route.ts            # Supabase OAuth callback handler
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                    # Auth guard, nav, isAdmin check
│   │   │   ├── page.tsx                      # Overview: accounts, recent jobs, storage upsell
│   │   │   ├── gmail/page.tsx                # Gmail transfer UI
│   │   │   ├── drive/page.tsx                # Drive-to-Drive transfer UI
│   │   │   ├── premium/page.tsx              # Pro transfers + pricing + payment
│   │   │   ├── admin/page.tsx                # Admin pricing & promo editor
│   │   │   ├── accounts/page.tsx             # Manage connected Google accounts
│   │   │   └── history/page.tsx              # Transfer job history
│   │   └── api/
│   │       ├── accounts/route.ts             # List connected Google accounts
│   │       ├── profile/route.ts              # Get current user profile
│   │       ├── geo/route.ts                  # IP geolocation — detects India for UPI
│   │       ├── prices/route.ts               # Public: live GBP/INR display prices from DB
│   │       ├── promo/route.ts                # Public: live promo banner settings from DB
│   │       ├── admin/pricing/route.ts        # Admin GET/PATCH for app_settings
│   │       ├── drive/files/route.ts          # List Drive files for an account
│   │       ├── drive/quota/route.ts          # Get Drive storage quota
│   │       ├── gmail/messages/route.ts       # List Gmail messages
│   │       ├── external-accounts/route.ts    # CRUD for Mega/Drime connections
│   │       ├── storage/stats/route.ts        # Aggregate storage stats
│   │       ├── transfer/drive/route.ts       # Drive-to-Drive transfer job
│   │       ├── transfer/gmail/route.ts       # Gmail transfer job
│   │       ├── transfer/external/route.ts    # Drive-to-Mega/Drime transfer job
│   │       ├── transfer/status/[jobId]/      # Poll job status
│   │       └── payments/stripe/
│   │           ├── checkout/route.ts         # Create Stripe checkout session
│   │           ├── success/route.ts          # PRIMARY plan activation (server-side)
│   │           ├── verify/route.ts           # Client-side verify fallback (legacy)
│   │           └── webhook/route.ts          # Stripe webhook backup
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DashboardNav.tsx              # Top nav with Admin link
│   │   │   ├── TransferProgress.tsx          # Real-time transfer progress poller
│   │   │   ├── StorageOverview.tsx           # Storage bars showing transferred bytes
│   │   │   └── StorageUpsell.tsx             # Drive+Gmail usage + upgrade CTA
│   │   └── ui/                               # Badge, Button, Card, Progress
│   └── lib/
│       ├── pricing.ts                        # Hardcoded price defaults (fallback)
│       ├── settings.ts                       # getLivePrices() with 60 s cache
│       ├── plan.ts                           # Plan gating: planAllows(), PLAN_META
│       ├── stripe.ts                         # Stripe client
│       ├── email.ts                          # Resend email helpers
│       ├── crypto.ts                         # AES-256 token encryption
│       ├── utils.ts                          # formatBytes, formatDate, cn()
│       ├── google/drive.ts                   # Drive API helpers
│       ├── google/gmail.ts                   # Gmail API helpers
│       ├── google/oauth.ts                   # OAuth2 client
│       ├── drime/client.ts                   # Drime REST API + multipart upload
│       ├── mega/client.ts                    # Mega.nz session client
│       └── supabase/admin.ts                 # Service-role client (bypasses RLS)
├── supabase/
│   ├── schema.sql                            # Full DB schema
│   ├── migrations/002_add_plans.sql          # plan column + purchases table
│   └── migrations/003_app_settings.sql       # app_settings table + seed data
├── .env.local                                # All secrets
├── Start-Dev.bat                             # One-click launcher
└── PROJECT_SNAPSHOT.md                       # This file
```

---

## 5. Database Tables

| Table | Key Columns |
|---|---|
| profiles | id, email, full_name, plan (free/essential/pro), email_transfer_bytes |
| purchases | user_id, plan, price_cents, currency, payment_provider, payment_id, customer_email, activated_at |
| connected_accounts | user_id, google_email, role (primary/secondary), access_token (encrypted), refresh_token (encrypted) |
| external_accounts | user_id, provider (mega/drime), email, encrypted_credentials |
| transfer_jobs | user_id, type, status, total_files, transferred_files, failed_files, transferred_bytes, error_log |
| app_settings | key (PK), value (jsonb), updated_at |

### Migrations to run (in order, in Supabase SQL Editor)
1. supabase/schema.sql
2. supabase/migrations/002_add_plans.sql
3. supabase/migrations/003_app_settings.sql

---

## 6. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://vliadcqmximsavktnoys.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# App URL (change to production URL when deploying)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe — TEST keys (swap for sk_live_ / pk_live_ in production)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev   # use verified domain in production

# Admin
ADMIN_EMAIL=baponchoudhury@gmail.com
ADMIN_NOTIFICATION_EMAIL=baponchoudhury@gmail.com

# UPI (India) — NEEDS REAL UPI ID
NEXT_PUBLIC_UPI_ID=yourname@upi
NEXT_PUBLIC_UPI_NAME=Google Connect

# Token encryption (32 chars)
TOKEN_ENCRYPTION_KEY=gc-s3cur3-t0k3n-key-32chars-here!
```

---

## 7. Key Dependencies

```json
{
  "next": "16.2.4",
  "react": "19.2.4",
  "@supabase/ssr": "^0.10.2",
  "@supabase/supabase-js": "^2.105.1",
  "googleapis": "^171.4.0",
  "stripe": "^22.1.0",
  "resend": "^6.12.3",
  "megajs": "^1.3.10",
  "lucide-react": "^1.14.0",
  "tailwindcss": "^4",
  "zustand": "^5.0.12"
}
```

---

## 8. Recent Changes (This Session)

### 1. Drive token refresh fix
`src/lib/google/drive.ts` — getFreshToken() now sets expiry_date: 1 forcing getAccessToken() to always make a refresh network call. Previously it returned stale tokens silently causing 401s on all Drive operations.

### 2. Stripe payment plan activation (server-side, no webhook needed)
`src/app/api/payments/stripe/success/route.ts` — New route. Stripe success URL points here with session_id={CHECKOUT_SESSION_ID}. The route retrieves the session from Stripe API, verifies payment_status === paid, updates profiles.plan via admin client (bypasses RLS), records the purchase, sends emails, then redirects. No webhook or Stripe CLI listener required.

### 3. Live pricing admin panel
- supabase/migrations/003_app_settings.sql — app_settings table
- src/lib/settings.ts — getLivePrices() with 60 s cache
- src/app/api/admin/pricing/route.ts — GET/PATCH admin API (ADMIN_EMAIL gated, calls invalidatePriceCache on save)
- src/app/dashboard/admin/page.tsx — Full pricing and promo editor UI
- src/app/api/prices/route.ts — Public live prices endpoint for premium page
- src/app/api/promo/route.ts — Public live promo settings endpoint

### 4. Promo banner (admin-controlled)
Landing page (src/app/page.tsx) fetches promo server-side and only renders the banner when promo.enabled is true. Premium page fetches from /api/promo client-side, also conditional on enabled. Colour-themed, dismissible, shows code with copy button.

### 5. Email notifications via Resend
src/lib/email.ts — sendPurchaseConfirmation() sends HTML email to customer. sendAdminPurchaseNotification() sends notification to ADMIN_NOTIFICATION_EMAIL. Both use lazy env var reads. Both log errors explicitly. Gracefully skipped if RESEND_API_KEY not set.

### 6. Storage upsell on dashboard
src/components/dashboard/StorageUpsell.tsx — For free/Essential users: fetches Drive quota, shows Drive + Gmail usage bars, displays "free up X GB by upgrading to Pro" CTA.

### 7. Drime multipart upload fix
src/lib/drime/client.ts — Removed Content-Type header from R2 part PUT requests. R2 presigned part URLs are not signed with Content-Type; including it caused 403 errors on all Drime video uploads.

---

## 9. Next Steps

### High priority
| Item | Action |
|---|---|
| Set real UPI ID | Update NEXT_PUBLIC_UPI_ID in .env.local |
| UPI plan upgrade flow | Build admin mechanism to manually activate plan for UPI payers |
| Resend domain verification | Verify domain in Resend before going live |
| Fix home page prices | Landing page PLANS array is hardcoded — should fetch from /api/prices |

### Medium priority
| Item | Action |
|---|---|
| Photos transfer | Enable UI for existing /api/transfer/photos route |
| Git initialisation | git init and first commit |
| Production deployment | Change APP_URL, swap Stripe keys, verify Resend domain |
| TOKEN_ENCRYPTION_KEY | Replace placeholder with a real 32-char random string before production |

### Low priority
| Item | Action |
|---|---|
| Rate limiting | No rate limiting on transfer routes — add for production |
| Stripe webhook hardening | Add idempotency key on purchases upsert |
| Mega.nz flow simplification | Bookmarklet flow is complex — evaluate alternative |

---

## 10. How to Run

```bash
# Start dev server (double-click Desktop shortcut "Google Connect Dev")
# OR manually:
cd "C:\Projects\Google Connect"
npm run dev

# Stripe CLI listener (only needed for webhook testing)
"C:\Users\User\Downloads\stripe_1.40.9_windows_x86_64\stripe.exe" listen --forward-to http://localhost:3000/api/payments/stripe/webhook

# Test Stripe payment
# Card: 4242 4242 4242 4242  |  Exp: any future  |  CVC: any  |  ZIP: any

# Admin panel
# Sign in as baponchoudhury@gmail.com
# "Admin" link appears in the top nav
# URL: http://localhost:3000/dashboard/admin
```

---

*Generated from a full Claude Code session covering the complete build and debugging history of the project.*
