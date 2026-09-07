import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerPublicOrigin } from "@/lib/url";
import { provisionLegacyUser } from "@/lib/provisionLegacyUser";
import nodemailer from "nodemailer";

/** Sends a password reset email. Superuser or ADMIN only. */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower !== "superuser" && roleLower !== "admin") {
      const userEmail = cookieStore.get("user_email")?.value?.trim();
      if (userEmail) {
        const { data: user } = await supabaseAdmin.from("users").select("role").eq("email", userEmail).maybeSingle();
        const dbRole = (user?.role ?? "").toLowerCase();
        if (dbRole === "superuser" || dbRole === "admin") role = dbRole;
      }
    }
    const effectiveRole = (role ?? "").toLowerCase();
    if (effectiveRole !== "superuser" && effectiveRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let email: string | null = body.email?.trim() || null;
    const userId = body.userId?.trim();

    if (!email && userId) {
      const { data: user } = await supabaseAdmin.from("users").select("email").eq("id", userId).maybeSingle();
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = user.email?.trim() || null;
    }

    if (!email) return NextResponse.json({ error: "Email or userId required" }, { status: 400 });

    if (userId) {
      const authUser = (await supabaseAdmin.auth.admin.getUserById(userId)).data?.user;
      if (!authUser) {
        // Legacy/migrated user: provision first, then continue with generateLink by email.
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("id, email, display_name, company_id, role, name, phone, superuser, approved")
          .eq("id", userId)
          .maybeSingle();
        if (dbUser?.email) {
          const result = await provisionLegacyUser(dbUser);
          if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
          // Provision succeeded; generateLink will use email (auth user now exists)
        } else {
          return NextResponse.json({
            error: "User not found in authentication. They may have been created before Supabase Auth was enabled.",
          }, { status: 404 });
        }
      } else if ((authUser.email ?? "").toLowerCase() !== email.toLowerCase()) {
        email = authUser.email ?? email;
      }
    }

    const baseUrl = getServerPublicOrigin();
    const redirectUrl = `${baseUrl.replace(/\/$/, "")}/reset-password`;

    if (!redirectUrl.startsWith("http")) {
      console.error("send-password-reset: Invalid base URL. Set NEXT_PUBLIC_BASE_URL or NEXTAUTH_URL.");
      return NextResponse.json(
        { error: "Server misconfiguration: base URL not set. Add NEXT_PUBLIC_BASE_URL to env." },
        { status: 500 }
      );
    }

    let link: string;
    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;

      const d = data as { properties?: { action_link?: string }; action_link?: string } | null;
      link = d?.properties?.action_link ?? d?.action_link ?? "";
      if (!link) {
        console.error("generateLink: No action_link in response", JSON.stringify(data));
        throw new Error("No recovery link in response");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = (e?.message ?? "").toLowerCase();
      if (msg.includes("user not found") || msg.includes("user-not-found")) {
        return NextResponse.json({ error: "No user with this email in the system." }, { status: 404 });
      }
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        return NextResponse.json({
          error: "User email is not confirmed. They may need to complete sign-up first.",
        }, { status: 400 });
      }
      console.error("generateLink failed", err);
      return NextResponse.json({
        error: "Failed to generate reset link. The user may not exist in authentication. Check server logs.",
      }, { status: 500 });
    }

    const subject = "Reset your Construction Runner password";
    const text = `You requested a password reset for your Construction Runner account.\n\nClick the link below to set a new password (this link expires in 1 hour):\n\n${link}\n\nIf you didn't request this, you can ignore this email.`;
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.SENDGRID_FROM || process.env.SMTP_USER || "no-reply@construction-runner.com";

    const hasResend = !!process.env.RESEND_API_KEY;
    const hasSendGrid = !!process.env.SENDGRID_API_KEY;
    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    // Fallback: if no external provider is configured, let Supabase send the reset email.
    // This preserves admin reset behavior in environments that only use Supabase Auth mailer.
    if (!hasResend && !hasSendGrid && !hasSmtp) {
      try {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
        return NextResponse.json({ ok: true, message: "Password reset email sent." });
      } catch (fallbackErr) {
        console.error("send-password-reset: Supabase fallback send failed", fallbackErr);
        return NextResponse.json(
          { error: "Failed to send password reset email. Configure SMTP provider or check Supabase Auth email settings." },
          { status: 500 }
        );
      }
    }

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
          }),
        });
        if (res.ok) return NextResponse.json({ ok: true, message: "Password reset email sent." });
        const errText = await res.text();
        console.warn("Resend send failed", res.status, errText);
      } catch (resendErr) {
        console.warn("Resend send failed", resendErr);
      }
    }

    if (hasSendGrid) {
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }], subject }],
            from: { email: fromEmail, name: "Construction Runner" },
            content: [{ type: "text/plain", value: text }],
          }),
        });
        if (res.ok) return NextResponse.json({ ok: true, message: "Password reset email sent." });
        const errText = await res.text();
        console.warn("SendGrid send failed", res.status, errText);
      } catch (sgErr) {
        console.warn("SendGrid send failed", sgErr);
      }
    }

    if (hasSmtp) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({ from: fromEmail, to: email, subject, text });
        return NextResponse.json({ ok: true, message: "Password reset email sent." });
      } catch (smtpErr) {
        console.error("SMTP send failed", smtpErr);
        return NextResponse.json({ error: "Failed to send email. Check SMTP configuration." }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Failed to send password reset email." }, { status: 500 });
  } catch (err) {
    console.error("send-password-reset failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
