/**
 * Web performance tests – TTI < 1.5s for dashboard pages.
 * Run: npx playwright test tests/performance/web.performance.spec.ts
 * Requires: Next.js dev server (npm run dev) or production build (npm run build && npm run start)
 *
 * Uses Performance API to measure domContentLoadedEventEnd and loadEventEnd.
 * TTI proxy: time until page is interactive (domContentLoaded).
 */
import { test, expect } from "@playwright/test";

const TTI_THRESHOLD_MS = 1500;

async function getPageLoadMetrics(page: { evaluate: (fn: () => unknown) => Promise<unknown> }) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return null;
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
      domInteractive: nav.domInteractive - nav.startTime,
    };
  });
}

test.describe("Web Performance", () => {
  test("Messaging page TTI < 1.5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/dashboard/messaging", { waitUntil: "domcontentloaded" });
    const metrics = await getPageLoadMetrics(page);
    const elapsed = Date.now() - start;
    expect(metrics).toBeTruthy();
    const tti = (metrics as { domContentLoaded: number }).domContentLoaded ?? elapsed;
    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
  });

  test("Asset table page TTI < 1.5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/dashboard/assets", { waitUntil: "domcontentloaded" });
    const metrics = await getPageLoadMetrics(page);
    const elapsed = Date.now() - start;
    expect(metrics).toBeTruthy();
    const tti = (metrics as { domContentLoaded: number }).domContentLoaded ?? elapsed;
    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
  });

  test("Delivery table page TTI < 1.5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/dashboard/deliveries", { waitUntil: "domcontentloaded" });
    const metrics = await getPageLoadMetrics(page);
    const elapsed = Date.now() - start;
    expect(metrics).toBeTruthy();
    const tti = (metrics as { domContentLoaded: number }).domContentLoaded ?? elapsed;
    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
  });

  test("Task table page TTI < 1.5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/dashboard/tasks", { waitUntil: "domcontentloaded" });
    const metrics = await getPageLoadMetrics(page);
    const elapsed = Date.now() - start;
    expect(metrics).toBeTruthy();
    const tti = (metrics as { domContentLoaded: number }).domContentLoaded ?? elapsed;
    expect(tti).toBeLessThan(TTI_THRESHOLD_MS);
  });
});
