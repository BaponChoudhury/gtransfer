import { NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY ?? ""); }
function getFrom()   { return process.env.RESEND_FROM_EMAIL ?? "noreply@gtransfer.app"; }
function getSupport(){ return process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.ADMIN_EMAIL ?? "support@gtransfer.app"; }

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { name, email, subject, message } = body as Record<string, string>;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (message.trim().length < 10) {
    return NextResponse.json({ error: "Message is too short." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("Contact form: RESEND_API_KEY not set — email not sent");
    return NextResponse.json({ ok: true });
  }

  const supportEmail = getSupport();
  const resend = getResend();

  // Notify support team
  const { error: supportErr } = await resend.emails.send({
    from: `GTransfer Contact <${getFrom()}>`,
    to: supportEmail,
    replyTo: email,
    subject: `[Contact] ${subject.trim()}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#111827">
        <div style="background:#f8fafc;padding:16px 28px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px">
          <img src="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/logo.png" alt="GTransfer" style="width:32px;height:32px;object-fit:contain" />
          <span style="font-size:16px;font-weight:700;color:#111827">GTransfer — New Contact Message</span>
        </div>
        <div style="background:#f9fafb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
            <tr><td style="padding:6px 0;color:#6b7280;width:80px">Name</td><td style="padding:6px 0"><strong>${name.trim()}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0"><a href="mailto:${email.trim()}" style="color:#2563eb">${email.trim()}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Subject</td><td style="padding:6px 0"><strong>${subject.trim()}</strong></td></tr>
          </table>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;line-height:1.6;white-space:pre-wrap">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <p style="font-size:12px;color:#9ca3af;margin-top:20px">
            Reply directly to this email to respond to ${name.trim()}.
          </p>
        </div>
      </div>
    `,
  });

  if (supportErr) {
    console.error("Contact form support email error:", supportErr);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }

  // Send confirmation to the user
  await resend.emails.send({
    from: `GTransfer Support <${getFrom()}>`,
    to: email.trim(),
    subject: "We received your message — GTransfer",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <div style="background:#f8fafc;padding:16px 28px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px">
          <img src="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/logo.png" alt="GTransfer" style="width:32px;height:32px;object-fit:contain" />
          <span style="font-size:16px;font-weight:700;color:#111827">GTransfer</span>
        </div>
        <div style="background:#f9fafb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
          <p style="font-size:16px;margin-top:0">Hi ${name.trim().split(" ")[0]},</p>
          <p style="font-size:14px;color:#374151">Thanks for reaching out! We&apos;ve received your message and will get back to you within <strong>24–48 hours</strong>.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:20px 0;font-size:14px;color:#1e40af">
            <strong>Your subject:</strong> ${subject.trim()}
          </div>
          <p style="font-size:14px;color:#374151">In the meantime, you can:</p>
          <ul style="font-size:14px;color:#374151;padding-left:20px;line-height:1.8">
            <li>Check our <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/terms" style="color:#2563eb">Terms of Service</a> or <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/privacy" style="color:#2563eb">Privacy Policy</a></li>
            <li>Return to <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gtransfer.app"}/dashboard" style="color:#2563eb">your dashboard</a></li>
          </ul>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">
            If you didn&apos;t submit this form, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
