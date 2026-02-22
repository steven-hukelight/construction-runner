/**
 * Smoke test to verify Jest setup: fetch polyfill, env vars, and test runner.
 */
describe("Jest setup", () => {
  it("has fetch available", () => {
    expect(typeof globalThis.fetch).toBe("function");
  });

  it("has Supabase env fallbacks for tests", () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
  });

  it("runs basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
