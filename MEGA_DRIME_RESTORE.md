# Mega.nz / Drime Feature — Restoration Guide

> Created: 2026-05-13  
> Purpose: Full instructions for reinstating Mega.nz and Drime transfer support after Google OAuth verification is complete.  
> All backend code (API routes, client libraries, DB schema) is **preserved untouched** — only UI/marketing copy was hidden.

---

## What was hidden (and where to put it back)

### 1. `src/app/login/page.tsx`

Restore this bullet inside the features array (around line 53):

```ts
{ icon: "☁️", text: "Free up 40 GB — move files to Mega.nz & Drime" },
```

---

### 2. `src/app/page.tsx`

**A. FEATURES array** — restore the third feature card (after the Drive Transfer entry):

```ts
{
  icon: ServerIcon,
  color: "text-amber-500",
  bg: "bg-amber-50",
  title: "Free Up Google Storage",
  description:
    "Move Drive files to Mega.nz or Drime and permanently free up space in your Google account — up to 40 GB extra storage.",
  badge: "Pro",
},
```

Also restore `ServerIcon` to the lucide-react imports at the top:
```ts
import { ..., ServerIcon } from "lucide-react";
```

**B. Hero visual (mock dashboard cards)** — restore the third card inside the `.map()` in the hero section:

```ts
{ icon: ServerIcon, color: "text-amber-500", bg: "bg-amber-50", label: "Free Up 40 GB", sub: "Mega.nz + Drime" },
```

**C. Hero subtitle** — restore the Mega/Drime mention in the `<p>` below the `<h1>`:

```
Transfer Gmail, Drive files, and free up storage space — between Google accounts
or to external cloud storage. One-time payment, no subscription.
```

**D. Hero badge** (small pill above the `<h1>`) — restore:

```tsx
<div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
  <StarIcon className="w-3.5 h-3.5" />
  Pro plan — 40 GB extra free storage included
</div>
```

**E. Features section — 40 GB highlight banner** — restore the entire amber banner after the feature cards grid:

```tsx
{/* 40 GB highlight banner */}
<div className="mt-12 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-7 flex flex-col sm:flex-row items-center gap-6">
  <div className="flex-1">
    <h3 className="text-xl font-extrabold text-gray-900 mb-1">
      Free up <span className="text-amber-600">40 GB</span> of Google storage with Pro
    </h3>
    <p className="text-gray-600 text-sm">
      Google gives everyone 15 GB free, and it fills up fast. With Pro, connect Mega.nz
      (<span className="font-semibold">20 GB free</span>) and Drime (<span className="font-semibold">20 GB free, EU-hosted</span>)
      — move your Drive files there and permanently reclaim that space in your Google account.
    </p>
  </div>
  <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
    <div className="text-center px-5 py-3 bg-white rounded-xl border border-amber-200 shadow-sm">
      <p className="text-2xl font-extrabold text-amber-600">20 GB</p>
      <p className="text-xs text-gray-500 font-medium">Mega.nz</p>
    </div>
    <span className="text-gray-400 font-bold text-lg">+</span>
    <div className="text-center px-5 py-3 bg-white rounded-xl border border-amber-200 shadow-sm">
      <p className="text-2xl font-extrabold text-amber-600">20 GB</p>
      <p className="text-xs text-gray-500 font-medium">Drime (EU)</p>
    </div>
    <span className="text-gray-400 font-bold text-lg">=</span>
    <div className="text-center px-5 py-3 bg-amber-500 rounded-xl shadow-sm">
      <p className="text-2xl font-extrabold text-white">40 GB</p>
      <p className="text-xs text-amber-100 font-medium">Free storage</p>
    </div>
  </div>
</div>
```

**F. Pricing — Essential plan `missing` array** — restore:

```ts
missing: [
  "Transfer to Mega.nz / Drime",
],
```

**G. Pricing — Pro plan `features` array** — restore these two lines:

```ts
"Transfer to Mega.nz (20 GB free)",
"Transfer to Drime (20 GB free, EU)",
"40 GB extra cloud storage total",
```

And update the Pro plan description:
```ts
description: "Everything + 40 GB of extra free storage",
```

---

### 3. `src/lib/pricing.ts`

Restore the Pro `stripeDesc`:

```ts
stripeDesc: "Everything in Essential + Mega.nz & Drime transfers (40 GB extra storage)",
```

---

### 4. `src/app/dashboard/page.tsx`

Restore the "Pro Transfers" feature card in the `features` array (after Drive Transfer):

```ts
{
  title: "Pro Transfers",
  description: "Transfer files to Mega.nz or Drime — up to 40 GB extra free storage",
  icon: StarIcon,
  href: "/dashboard/premium",
  color: "text-amber-600",
  bg: "bg-amber-50",
  available: planAllows(plan, "external"),
  planRequired: "Pro",
},
```

Also restore `StarIcon` to the lucide-react imports.

---

### 5. `src/app/dashboard/history/page.tsx`

Restore these two entries in the `TYPE_LABELS` object:

```ts
drive_to_mega: "Drive → Mega.nz",
drive_to_drime: "Drive → Drime",
```

---

### 6. `src/components/dashboard/StorageUpsell.tsx`

Restore the Mega/Drime upsell text inside the Pro CTA block (around line 110):

```tsx
<p className="text-xs text-gray-600 mt-0.5">
  Upgrade to <strong>Pro</strong> and move Drive files to Mega.nz or Drime — permanently reclaiming that space in your Google account.
</p>
```

Also restore the `PRO_EXTERNAL_GB` constant at the top of the component:
```ts
const PRO_EXTERNAL_GB = 40 * 1024 * 1024 * 1024;
```

And the `offloadable` upsell logic inside the `{plan !== "pro" ...}` block.

---

### 7. `src/app/privacy/page.tsx`

Two lines to restore:

```html
<!-- Around line 120 -->
<li>We do not transfer your Google data to third parties except as necessary to provide the Service (e.g. uploading to Mega.nz or Drime at your request)</li>

<!-- Around line 140 -->
<strong>Mega.nz / Drime</strong> — only when you explicitly request a transfer to these services.
```

---

### 8. `src/app/terms/page.tsx`

Two lines to restore:

```html
<!-- Around line 50 -->
such as Mega.nz and Drime. GTransfer is not affiliated with, sponsored by, or endorsed by Google LLC or

<!-- Around line 74 -->
Mega.nz, and Drime. Your use of those services is subject to their respective terms and privacy policies.
```

---

### 9. `src/lib/email.ts`

Restore this line in the Pro upgrade email template (around line 66):

```html
<li>Transfer to Mega.nz (20 GB free storage)</li>
```

---

## What was NOT touched (backend code — fully intact)

All of the following files were **not modified** and contain the full working implementation:

| File | Contents |
|------|----------|
| `src/lib/mega/client.ts` | Mega.nz SDK wrapper (`connectMega`, `uploadToMega`, `getMegaStorageInfo`) |
| `src/lib/external/mega.ts` | Legacy Mega helpers (`validateMegaCredentials`, `uploadToMega`) |
| `src/app/api/transfer/external/route.ts` | POST handler for Drive→Mega and Drive→Drime transfers |
| `src/app/api/external-accounts/route.ts` | POST handler to connect/validate Mega & Drime credentials |
| `src/app/dashboard/premium/page.tsx` | Full Pro dashboard page with bookmarklet flow & account management |
| `src/app/api/payments/stripe/checkout/route.ts` | Stripe checkout (already mentions Mega/Drime in Pro description) |
| `src/types/database.ts` | `TransferType` includes `"drive_to_mega" \| "drive_to_drime"`, `ExternalAccount` type |

---

## npm dependency

The `megajs` package is already installed. Do NOT remove it from `package.json`.

```json
"megajs": "^1.x"
```

---

## Database

No schema changes needed. The `external_accounts` table and `transfer_jobs` `type` column already support Mega/Drime. No migrations required.

---

## Re-enabling checklist

1. Restore all UI/copy changes listed above (sections 1–9)
2. Verify `src/app/dashboard/premium/page.tsx` still renders correctly (it was untouched)
3. Test bookmarklet flow on mega.nz
4. Test Drime email/password login
5. Run a Drive→Mega test transfer end-to-end
6. Update privacy policy date if needed
