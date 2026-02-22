import nodemailer from "nodemailer";

async function sendWelcomeEmail(email: string, name: string, companyName: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const setupLink = `${process.env.NEXT_PUBLIC_BASE_URL}/setup-password?email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Welcome to SiteHub - Set Your Password",
    html: `
      <h2>Welcome, ${name || "User"}!</h2>
      <p>Your account for <b>${companyName || "SiteHub"}</b> has been approved.</p>
      <p>Please <a href="${setupLink}">set your password</a> to activate your account.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export default sendWelcomeEmail;
