import sendWelcomeEmail from "../lib/sendWelcomeEmail";

(async () => {
  try {
    await sendWelcomeEmail(
      process.env.SMTP_USER || "test@example.com",
      "Test User",
      "Test Company"
    );
    console.log("Test email sent successfully.");
  } catch (e) {
    console.error("Failed to send test email:", e);
    process.exit(1);
  }
})();
