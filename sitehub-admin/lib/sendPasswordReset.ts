import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CANONICAL_SITE_URL } from "@/lib/url";

function canonicalOrigin(origin: string): string {
  let base = origin.replace(/\/$/, "");
  try {
    const host = new URL(base).hostname;
    if (host === "construction-runner.com" || host === "www.construction-runner.com") {
      base = CANONICAL_SITE_URL;
    }
  } catch {
    /* keep origin */
  }
  return base;
}

export function recoveryPageUrl(origin: string): string {
  return `${canonicalOrigin(origin)}/reset-password`;
}

export function setupPasswordPageUrl(origin: string): string {
  return `${canonicalOrigin(origin)}/setup-password`;
}

/** Prefer token_hash so the web reset page can verifyOtp without a PKCE verifier. */
export function recoveryLinkFromGenerateLinkData(
  data: unknown,
  redirectUrl: string
): string {
  const d = data as {
    properties?: { hashed_token?: string; action_link?: string };
    action_link?: string;
  } | null;
  const hashed = d?.properties?.hashed_token?.trim();
  if (hashed) {
    const u = new URL(redirectUrl);
    u.searchParams.set("token_hash", hashed);
    u.searchParams.set("type", "recovery");
    return u.toString();
  }
  // Do not fall back to action_link: GoTrue verify URLs are consumed on GET
  // (mail scanners / in-app browsers) and then the reset page looks expired.
  return "";
}

export async function generateRecoveryLink(
  email: string,
  redirectUrl: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: redirectUrl },
  });
  if (error) throw error;
  const link = recoveryLinkFromGenerateLinkData(data, redirectUrl);
  if (!link) throw new Error("No recovery link in response");
  return link;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function deliverPasswordResetEmail(
  email: string,
  link: string,
  kind: "reset" | "setup" = "reset"
): Promise<boolean> {
  const subject =
    kind === "setup"
      ? "Set your Construction Runner password"
      : "Reset your Construction Runner password";
  const intro =
    kind === "setup"
      ? "Your Construction Runner account is ready. Set a password to sign in."
      : "You requested a password reset for your Construction Runner account.";
  const text = `${intro}

Set a password (this link expires in 1 hour):
${link}

If you didn't expect this, you can ignore this email.`;
  const html = `<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set a password</a></p>
<p style="word-break:break-all;font-size:12px;color:#64748b">${escapeHtml(link)}</p>
<p>This link expires in 1 hour. If you didn't expect this, you can ignore this email.</p>`;
  const fromEmail =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SENDGRID_FROM ||
    process.env.SMTP_USER ||
    "no-reply@construction-runner.com";

  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (hasResend) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject,
          text,
          html,
        }),
      });
      if (res.ok) return true;
      console.warn("Resend send failed", res.status, await res.text());
    } catch (resendErr) {
      console.warn("Resend send failed", resendErr);
    }
  }

  if (hasSendGrid) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }], subject }],
          from: { email: fromEmail, name: "Construction Runner" },
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
        }),
      });
      if (res.ok) return true;
      console.warn("SendGrid send failed", res.status, await res.text());
    } catch (sgErr) {
      console.warn("SendGrid send failed", sgErr);
    }
  }

  if (hasSmtp) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: fromEmail, to: email, subject, text, html });
    return true;
  }

  return false;
}

/**
 * Send a reset email that the web `/reset-password` page can verify.
 * Always uses hashed_token when a mailer is configured. Do not also call
 * resetPasswordForEmail after generateLink — that invalidates the emailed token.
 */
export async function sendRecoveryEmail(
  email: string,
  redirectUrl: string
): Promise<void> {
  const hasExternalMailer = !!(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );

  if (hasExternalMailer) {
    const link = await generateRecoveryLink(email, redirectUrl);
    const sent = await deliverPasswordResetEmail(email, link);
    if (!sent) throw new Error("Failed to send recovery email");
    return;
  }

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) throw error;
}
