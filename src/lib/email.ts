/**
 * Email helpers using Resend.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local.
 * Get a free API key at https://resend.com (3 000 emails/month free).
 */
import { Resend } from "resend";

// Read env vars lazily inside each function so they reflect the current process environment
function getResend()     { return new Resend(process.env.RESEND_API_KEY ?? ""); }
function getFrom()       { return process.env.RESEND_FROM_EMAIL ?? "noreply@gtransfer.app"; }
function getAdminEmail() { return process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.ADMIN_EMAIL ?? ""; }

// ─── Customer purchase confirmation ──────────────────────────────────────────

export async function sendPurchaseConfirmation({
  to,
  name,
  plan,
  amount,
  currency,
}: {
  to: string;
  name?: string | null;
  plan: "essential" | "pro";
  amount: number;
  currency: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const planLabel   = plan === "pro" ? "Pro" : "Essential";
  const amountLabel = currency.toUpperCase() === "GBP"
    ? `£${(amount / 100).toFixed(0)}`
    : `₹${amount.toLocaleString("en-IN")}`;
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";

  const { error } = await getResend().emails.send({
    from: `GTransfer <${getFrom()}>`,
    to,
    subject: `Your ${planLabel} Plan is now active 🎉`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <div style="background:#f8fafc;padding:20px 32px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px">
          <img src="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/logo.png" alt="GTransfer" style="width:36px;height:36px;object-fit:contain" />
          <span style="font-size:18px;font-weight:700;color:#111827">GTransfer</span>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
          <p style="font-size:16px;margin-top:0">${greeting}</p>
          <p>Your payment of <strong>${amountLabel}</strong> was successful. You now have full access to the <strong>${planLabel} Plan</strong>.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;font-size:14px;color:#1d4ed8">
              ✅ <strong>${planLabel} Plan</strong> — one-time payment, yours forever.
            </p>
          </div>
          ${plan === "essential" ? `
          <p style="font-size:14px;color:#374151">With your Essential Plan you can now:</p>
          <ul style="font-size:14px;color:#374151;padding-left:20px">
            <li>Transfer Gmail between Google accounts — unlimited</li>
            <li>Transfer Drive files between accounts</li>
            <li>Connect multiple Google accounts</li>
          </ul>
          ` : `
          <p style="font-size:14px;color:#374151">With your Pro Plan you can now:</p>
          <ul style="font-size:14px;color:#374151;padding-left:20px">
            <li>Transfer Gmail between Google accounts — unlimited</li>
            <li>Transfer Drive files between accounts</li>
            <li>Transfer to Mega.nz (20 GB free storage)</li>
            <li>Transfer to Drime (20 GB free, EU storage)</li>
            <li>Free up to 40 GB from your Google account</li>
          </ul>
          `}
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/dashboard"
             style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
            Go to dashboard →
          </a>
          <p style="font-size:12px;color:#9ca3af;margin-top:32px">
            Questions? Reply to this email — we're happy to help.
          </p>
        </div>
      </div>
    `,
  });

  if (error) console.error("sendPurchaseConfirmation error:", error);
}

// ─── Admin notification ───────────────────────────────────────────────────────

export async function sendAdminPurchaseNotification({
  customerEmail,
  customerName,
  plan,
  amount,
  currency,
}: {
  customerEmail: string;
  customerName?: string | null;
  plan: "essential" | "pro";
  amount: number;
  currency: string;
}) {
  const adminEmail = getAdminEmail();
  if (!process.env.RESEND_API_KEY || !adminEmail) {
    console.warn("sendAdminPurchaseNotification: skipped — RESEND_API_KEY or admin email not set");
    return;
  }

  const planLabel   = plan === "pro" ? "Pro" : "Essential";
  const amountLabel = currency.toUpperCase() === "GBP"
    ? `£${(amount / 100).toFixed(0)}`
    : `₹${amount.toLocaleString("en-IN")}`;

  console.log(`📧 Sending admin notification to: ${adminEmail}`);

  const { error } = await getResend().emails.send({
    from: `GTransfer <${getFrom()}>`,
    to: adminEmail,
    subject: `💰 New purchase — ${planLabel} (${amountLabel})`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111827">
        <h2 style="color:#111827">New purchase received</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Customer</td><td style="padding:6px 0"><strong>${customerEmail}</strong>${customerName ? ` (${customerName})` : ""}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Plan</td><td style="padding:6px 0"><strong>${planLabel}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Amount</td><td style="padding:6px 0"><strong>${amountLabel}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Currency</td><td style="padding:6px 0">${currency.toUpperCase()}</td></tr>
        </table>
      </div>
    `,
  });

  if (error) console.error("sendAdminPurchaseNotification error:", error);
  else console.log(`✅ Admin notification sent to ${adminEmail}`);
}
