import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

/** Sends a password reset email. Superuser or ADMIN only. */
export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower !== "superuser" && roleLower !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    let email: string | null = body.email?.trim() || null;
    const userId = body.userId?.trim();

    if (!email && userId) {
      const { data: user } = await supabaseAdmin.from("users").select("email").eq("id", userId).maybeSingle();
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = user.email?.trim() || null;
    }

    if (!email) return NextResponse.json({ error: "Email or userId required" }, { status: 400 });

    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const redirectUrl = `${baseUrl.replace(/\/$/, "")}/reset-password`;

    let link: string;
    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      link = (data as { properties?: { action_link?: string } }).properties?.action_link ?? "";
      if (!link) throw new Error("No recovery link generated");
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e?.message?.includes("User not found") || e?.message?.includes("user-not-found")) {
        return NextResponse.json({ error: "No user with this email" }, { status: 404 });
      }
      console.error("generateLink failed", err);
      return NextResponse.json({ error: "Failed to generate reset link" }, { status: 500 });
    }

    const subject = "Reset your SiteHub password";
    const text = `You requested a password reset for your SiteHub account.\n\nClick the link below to set a new password (this link expires in 1 hour):\n\n${link}\n\nIf you didn't request this, you can ignore this email.`;
    const fromEmail = process.env.EMAIL_FROM || process.env.SENDGRID_FROM || process.env.SMTP_USER || "noreply@sitehub.com";

    if (process.env.SENDGRID_API_KEY) {
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }], subject }],
            from: { email: fromEmail, name: "SiteHub" },
            content: [{ type: "text/plain", value: text }],
          }),
        });
        if (res.ok) return NextResponse.json({ ok: true, message: "Password reset email sent." });
      } catch (sgErr) {
        console.warn("SendGrid send failed", sgErr);
      }
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: fromEmail, to: email, subject, text });
    return NextResponse.json({ ok: true, message: "Password reset email sent." });
  } catch (err) {
    console.error("send-password-reset failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
