/**
 * Best-effort transactional email (Resend → SendGrid → SMTP).
 * Returns whether send appeared to succeed.
 */
export function getFromEmail(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SENDGRID_FROM ||
    process.env.SMTP_USER ||
    "no-reply@construction-runner.com"
  );
}

export function hasEmailTransportConfigured(): boolean {
  return !!(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

export async function sendPlainEmail(
  to: string,
  subject: string,
  text: string,
): Promise<{ ok: boolean; error?: "not_configured" | "send_failed" }> {
  const fromEmail = getFromEmail();

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: fromEmail, to: [to], subject, text }),
      });
      return res.ok ? { ok: true } : { ok: false, error: "send_failed" };
    } catch {
      return { ok: false, error: "send_failed" };
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }], subject }],
          from: { email: fromEmail, name: "Construction Runner" },
          content: [{ type: "text/plain", value: text }],
        }),
      });
      return res.ok ? { ok: true } : { ok: false, error: "send_failed" };
    } catch {
      return { ok: false, error: "send_failed" };
    }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({ from: fromEmail, to, subject, text });
      return { ok: true };
    } catch {
      return { ok: false, error: "send_failed" };
    }
  }

  return { ok: false, error: "not_configured" };
}
