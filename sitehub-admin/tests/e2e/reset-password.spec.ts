/**
 * E2E test for reset password flow.
 * Requires: sitehub-admin dev server running (npm run dev), TEST_EMAIL/TEST_PASSWORD in auth.users
 * Run: npx playwright test tests/e2e/reset-password.spec.ts --project=chromium
 */
import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Reset password flow", () => {
  test("forgot-password page loads and shows form", async ({ page }) => {
    await page.goto(`${baseURL}/forgot-password`);
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("reset-password page without hash shows invalid link message", async ({ page }) => {
    await page.goto(`${baseURL}/reset-password`);
    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
    await expect(page.getByText(/invalid or missing reset link/i)).toBeVisible({ timeout: 5000 });
  });

  test("forgot-password submits and shows feedback", async ({ page }) => {
    await page.goto(`${baseURL}/forgot-password`);
    await page.getByLabel(/email/i).fill(process.env.TEST_EMAIL || "test@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await page.waitForLoadState("networkidle");
    const successMsg = page.getByText(/check your email/i);
    const errorMsg = page.getByText(/user not found|invalid|error/i);
    await expect(successMsg.or(errorMsg)).toBeVisible({ timeout: 10000 });
  });

  test("login page has forgot password link", async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("forgot-password link navigates correctly", async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});
