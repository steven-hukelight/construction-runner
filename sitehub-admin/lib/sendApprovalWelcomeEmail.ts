import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type WelcomeRecipient = {
  email: string | null;
  display_name: string | null;
  company_id: string | null;
};

export async function loadWelcomeRecipient(userId: string): Promise<WelcomeRecipient | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("email, display_name, company_id")
    .eq("id", userId)
    .maybeSingle();
  return (data as WelcomeRecipient | null) ?? null;
}

/**
 * Sends the "account approved" email via Resend, then SendGrid, then SMTP.
 * Returns the SMTP `info` only when SMTP was used. Throws if SMTP fails.
 */
export async function sendApprovalWelcomeEmail(
  user: WelcomeRecipient & { email: string },
  tempPassword?: string
): Promise<{ info?: unknown }> {
  const email = user.email;
  const subject = "Welcome to Construction Runner";
  const text = tempPassword
    ? `Hello ${user.display_name || ""},\n\nYour account has been approved. You can sign in with:\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nPlease change your password after first login.`
    : `Hello ${user.display_name || ""},\n\nYour account has been approved. Sign in to the Construction Runner app with the email and password you chose when you registered.\n\nIf you have forgotten that password, use Forgot password on https://www.construction-runner.com/forgot-password`;

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.SMTP_USER || "no-reply@construction-runner.com",
          to: [email],
          subject,
          text,
        }),
      });
      if (res.ok) return {};
    } catch (e) {
      console.warn("Resend send failed", e);
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    try {
      const sendgridRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }], subject }],
          from: { email: process.env.EMAIL_FROM || process.env.SENDGRID_FROM || process.env.SMTP_USER },
          content: [{ type: "text/plain", value: text }],
        }),
      });
      if (sendgridRes.ok) return {};
    } catch (sgErr) {
      console.warn("sendgrid send failed", sgErr);
    }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text,
  });
  return { info };
}

/** Looks up the user and sends the approval email. Used by server routes after creating or approving an account. */
export async function sendApprovalWelcomeEmailToUser(userId: string, tempPassword?: string): Promise<void> {
  const user = await loadWelcomeRecipient(userId);
  if (!user?.email) return;
  await sendApprovalWelcomeEmail({ ...user, email: user.email }, tempPassword);
}
