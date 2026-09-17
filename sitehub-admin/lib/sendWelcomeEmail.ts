import nodemailer from "nodemailer";
import { getServerPublicOrigin } from "@/lib/url";
import { generateRecoveryLink, setupPasswordPageUrl } from "@/lib/sendPasswordReset";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendWelcomeEmail(email: string, name: string, companyName: string) {
  const setupLink = await generateRecoveryLink(email, setupPasswordPageUrl(getServerPublicOrigin()));

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const safeName = escapeHtml(name || "User");
  const safeCompany = escapeHtml(companyName || "Construction Runner");
  const safeLink = escapeHtml(setupLink);

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Welcome to Construction Runner - Set Your Password",
    html: `
      <h2>Welcome, ${safeName}!</h2>
      <p>Your account for <b>${safeCompany}</b> has been approved.</p>
      <p>Please <a href="${safeLink}">set your password</a> to activate your account.</p>
      <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export default sendWelcomeEmail;
