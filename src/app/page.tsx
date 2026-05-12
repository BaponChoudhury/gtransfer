import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  HardDriveIcon,
  LockIcon,
  MailIcon,
  MoveRightIcon,
  ShieldCheckIcon,
  StarIcon,
  ZapIcon,
  ServerIcon,
} from "lucide-react";
import { getLivePrices } from "@/lib/settings";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: MailIcon,
    color: "text-red-500",
    bg: "bg-red-50",
    title: "Gmail Transfer",
    description:
      "Move or copy emails, attachments, and labels between any two Google accounts — keeping folder structure intact.",
  },
  {
    icon: HardDriveIcon,
    color: "text-blue-500",
    bg: "bg-blue-50",
    title: "Google Drive Transfer",
    description:
      "Transfer files, folders, and shared documents from one Drive to another. Supports all Google Workspace file types.",
    badge: "Essential",
  },
  {
    icon: ServerIcon,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Free Up Google Storage",
    description:
      "Move Drive files to Mega.nz or Drime and permanently free up space in your Google account — up to 40 GB extra storage.",
    badge: "Pro",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Connect your accounts",
    description: "Link your Google accounts with one click via secure OAuth. No passwords stored.",
  },
  {
    step: "2",
    title: "Choose what to transfer",
    description: "Pick Gmail, Drive, or external storage. Select individual files or entire folders.",
  },
  {
    step: "3",
    title: "Sit back & relax",
    description: "We handle the heavy lifting. Track progress in real time and get a full transfer log.",
  },
];


const TRUST = [
  {
    icon: LockIcon,
    title: "OAuth only",
    description: "We use Google's official OAuth — your password is never seen or stored.",
  },
  {
    icon: ShieldCheckIcon,
    title: "No data retained",
    description: "Files flow directly between accounts. We never store your emails or documents.",
  },
  {
    icon: ZapIcon,
    title: "One-time payment",
    description: "Pay once, own the features forever. No subscription, no renewal surprises.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const liveData = await getLivePrices().catch(() => null);
  const promo = liveData?.promo ?? { enabled: false, code: "", message: "", expiryLabel: "", color: "blue" as const };

  const PLANS = [
    {
      name: "Free",
      price: "£0",
      period: "forever",
      description: "Get started with email migration",
      highlight: false,
      features: [
        "Gmail transfer (10 GB limit)",
        "1 linked Google account",
      ],
      missing: [
        "Drive transfer",
        "External cloud storage",
      ],
      cta: "Get started free",
      href: "/login",
      variant: "outline" as const,
    },
    {
      name: "Essential",
      price: liveData?.essential.gbpDisplay ?? "£19",
      period: "one-time",
      description: "Unlimited transfers between Google accounts",
      highlight: false,
      features: [
        "Gmail transfer — unlimited",
        "Drive transfer between accounts",
        "Multiple linked Google accounts",
      ],
      missing: [
        "Transfer to Mega.nz / Drime",
      ],
      cta: "Get Essential",
      href: "/login",
      variant: "default" as const,
    },
    {
      name: "Pro",
      price: liveData?.pro.gbpDisplay ?? "£39",
      period: "one-time",
      description: "Everything + 40 GB of extra free storage",
      highlight: true,
      features: [
        "Gmail transfer — unlimited",
        "Drive transfer between accounts",
        "Multiple linked Google accounts",
        "Transfer to Mega.nz (20 GB free)",
        "Transfer to Drime (20 GB free, EU)",
        "40 GB extra cloud storage total",
      ],
      missing: [],
      cta: "Get Pro",
      href: "/login",
      variant: "premium" as const,
    },
  ];

  const promoPalette = {
    blue:  "bg-blue-600 text-white",
    green: "bg-green-600 text-white",
    amber: "bg-amber-400 text-amber-950",
    red:   "bg-red-600 text-white",
  }[promo.color] ?? "bg-blue-600 text-white";

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Promo banner — only when admin enables it ── */}
      {promo.enabled && (
        <div className={`${promoPalette} py-2.5 px-4 text-center text-sm font-medium flex items-center justify-center gap-3 flex-wrap`}>
          <ZapIcon className="w-4 h-4 shrink-0" />
          <span>{promo.message}</span>
          <span className="font-mono font-bold px-2 py-0.5 rounded bg-white/20 border border-white/30 tracking-wide">
            {promo.code}
          </span>
          {promo.expiryLabel && <span className="opacity-80 text-xs">{promo.expiryLabel}</span>}
          <Link href="/login" className="underline text-xs opacity-90 hover:opacity-100">Get the deal →</Link>
        </div>
      )}

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <img src="/logo.png" alt="GTransfer" className="w-12 h-12 object-contain" />
            <span>GTransfer</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden sm:inline-flex text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20 pb-28">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <StarIcon className="w-3.5 h-3.5" />
            Pro plan — 40 GB extra free storage included
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Move your Google data.
            <br />
            <span className="text-blue-600">Simply &amp; securely.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Transfer Gmail, Drive files, and free up storage space — between Google accounts
            or to external cloud storage. One-time payment, no subscription.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl text-base shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 hover:-translate-y-0.5"
            >
              Start for free <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-7 py-3.5 rounded-xl text-base shadow-sm transition-all hover:-translate-y-0.5"
            >
              View pricing
            </Link>
          </div>

          <p className="mt-5 text-xs text-gray-400">No credit card required · Free plan available</p>
        </div>

        {/* Hero visual */}
        <div className="relative max-w-3xl mx-auto mt-16 px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-gray-400 font-mono">gtransfer.app/dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: MailIcon,       color: "text-red-500",   bg: "bg-red-50",   label: "Gmail Transfer",         sub: "Emails &amp; attachments" },
                { icon: HardDriveIcon,  color: "text-blue-500",  bg: "bg-blue-50",  label: "Drive Transfer",         sub: "Files &amp; folders" },
                { icon: ServerIcon,     color: "text-amber-500", bg: "bg-amber-50", label: "Free Up 40 GB",          sub: "Mega.nz + Drime" },
              ].map(({ icon: Icon, color, bg, label, sub }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400" dangerouslySetInnerHTML={{ __html: sub }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">Drive transfer in progress…</span>
                    <span className="text-xs text-blue-600 font-semibold">68%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: "68%" }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">3.4 GB of 5.0 GB transferred · 247 files</p>
                </div>
                <div className="text-green-500 shrink-0">
                  <CheckIcon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Everything you need to migrate
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              Whether you&apos;re switching accounts, backing up, or reclaiming storage — we&apos;ve got you covered.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, color, bg, title, description, badge }) => (
              <div key={title} className="relative group rounded-2xl border border-gray-100 p-7 hover:border-blue-200 hover:shadow-lg transition-all">
                {badge && (
                  <span className={`absolute top-5 right-5 text-xs font-bold px-2.5 py-0.5 rounded-full ${badge === "Pro" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {badge}
                  </span>
                )}
                <div className={`inline-flex p-3 rounded-xl ${bg} mb-5`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

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
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-gray-50" id="how-it-works">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Up and running in minutes
            </h2>
            <p className="mt-3 text-gray-500 text-lg">Three steps and your data is on the move.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="relative flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                  {step}
                </div>
                {/* connector line (desktop) */}
                {step !== "3" && (
                  <MoveRightIcon className="hidden md:block absolute -right-5 top-8 w-8 h-8 text-blue-200 z-10" />
                )}
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 bg-white" id="pricing">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="mt-3 text-gray-500 text-lg">
              Pay once — no subscriptions, no renewals, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border-2 p-7 bg-white transition-shadow
                  ${plan.highlight ? "border-amber-400 shadow-xl shadow-amber-100" : "border-gray-200 hover:border-gray-300 hover:shadow-md"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-extrabold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-400 ml-2">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 text-gray-300 font-bold text-base leading-none">–</span>
                      <span className="text-sm text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`w-full text-center font-semibold py-3 rounded-xl text-sm transition-all
                    ${plan.highlight
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200"
                      : plan.variant === "default"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border border-gray-300 hover:border-gray-400 text-gray-700 bg-white hover:bg-gray-50"
                    }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center space-y-1">
            <p className="text-xs text-gray-400">
              🇬🇧 Card payments via Stripe &nbsp;·&nbsp; 🇮🇳 UPI accepted for Indian customers
            </p>
            <p className="text-xs text-gray-400">
              Questions? Email{" "}
              <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline">
                support@gtransfer.app
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Built with privacy in mind</h2>
            <p className="mt-2 text-gray-500">Your data, your accounts — we&apos;re just the pipe.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TRUST.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to move your data?
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            Start for free — no credit card needed. Upgrade when you need more.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-3.5 rounded-xl text-base shadow-lg transition-all hover:-translate-y-0.5"
            >
              Get started free <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3.5 rounded-xl text-base transition-all"
            >
              See plans
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-5">
          {/* Brand row */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-gray-700">
              <img src="/logo.png" alt="GTransfer" className="w-8 h-8 object-contain" />
              GTransfer
            </Link>
            <div className="flex flex-wrap justify-center sm:justify-end gap-x-5 gap-y-2 text-xs text-gray-400">
              <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
              <Link href="/contact" className="hover:text-gray-700 transition-colors">Support</Link>
              <Link href="/login" className="hover:text-gray-700 transition-colors">Sign in</Link>
            </div>
          </div>
          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center max-w-2xl leading-relaxed">
            GTransfer is an independent tool and is not affiliated with, sponsored by, or endorsed by Google LLC.
            Google, Gmail, Google Drive, and Google Photos are trademarks of Google LLC.
          </p>
        </div>
      </footer>

    </div>
  );
}
