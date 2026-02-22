import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

function getFromEmail(): string {
  return process.env.EMAIL_FROM || process.env.SENDGRID_FROM || process.env.SMTP_USER || "noreply@sitehub.com";
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const fromEmail = getFromEmail();
  if (process.env.SENDGRID_API_KEY) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: fromEmail, name: "SiteHub" },
        content: [{ type: "text/plain", value: text }],
      }),
    });
    return res.ok;
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: fromEmail, to, subject, text });
  return true;
}

export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const companyId = body.companyId?.trim();
    const invites = body.invites;
    if (!companyId || !Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: "companyId and invites array required" }, { status: 400 });
    }

    const { data: company } = await supabaseAdmin.from("companies").select("invite_code, name").eq("id", companyId).maybeSingle();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    let inviteCode = company.invite_code?.trim();
    if (!inviteCode) {
      inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabaseAdmin.from("companies").update({ invite_code: inviteCode, updated_at: new Date().toISOString() }).eq("id", companyId);
    }

    const companyName = company.name ?? "Your company";
    const baseUrl = getBaseUrl();
    let sent = 0;
    const errors: string[] = [];

    for (const item of invites.slice(0, 50)) {
      const email = String(item?.email ?? "").trim().toLowerCase();
      const name = String(item?.name ?? "").trim() || email.split("@")[0];
      if (!email) continue;

      const inviteLink = `${baseUrl}/register?companyCode=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
      const subject = `You're invited to join ${companyName} on SiteHub`;
      const text = `Hi${name ? ` ${name}` : ""},\n\nYou've been invited to join ${companyName} on SiteHub.\n\nClick the link below to create your account:\n${inviteLink}\n\nIf you didn't expect this, you can ignore this email.`;

      try {
        const ok = await sendEmail(email, subject, text);
        if (ok) sent++;
        else errors.push(`${email}: send failed`);
      } catch (e) {
        errors.push(`${email}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} invite(s)${errors.length ? `. ${errors.length} failed.` : "."}`,
      sent,
      failed: errors.length,
      errors: errors.slice(0, 5),
    });
  } catch (e) {
    console.error("bulk-invite failed:", e);
    return NextResponse.json({ error: "Bulk invite failed" }, { status: 500 });
  }
}
