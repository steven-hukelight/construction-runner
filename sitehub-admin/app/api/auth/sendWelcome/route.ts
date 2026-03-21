import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { userId, tempPassword } = await req.json();
    if (!userId || !tempPassword) return NextResponse.json({ error: "missing" }, { status: 400 });

    const { data: user } = await supabaseAdmin.from("users").select("email, display_name").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
    const email = user.email;
    if (!email) return NextResponse.json({ error: "no email" }, { status: 400 });

    const subject = "Welcome to Construction Runner";
    const text = `Hello ${user.display_name || ""},\n\nYour account has been approved. You can sign in with: \n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nPlease change your password after first login.`;

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
        if (res.ok) return NextResponse.json({ ok: true });
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
        if (sendgridRes.ok) return NextResponse.json({ ok: true });
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
    return NextResponse.json({ ok: true, info });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
