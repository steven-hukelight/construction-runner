import { COOKIE_MAX_AGE_MOBILE_APP, sessionLifetimeMs } from "../securityConfig";

describe("sessionLifetimeMs", () => {
  it("keeps the web dashboard on a short idle window", () => {
    expect(sessionLifetimeMs("web").idleMs).toBe(30 * 60 * 1000);
    expect(sessionLifetimeMs(null).absoluteMs).toBe(24 * 60 * 60 * 1000);
  });

  it("keeps mobile sessions alive for the same 90 days as the app cookie", () => {
    const mobile = sessionLifetimeMs("mobile");
    expect(mobile.idleMs).toBe(COOKIE_MAX_AGE_MOBILE_APP * 1000);
    expect(mobile.absoluteMs).toBe(COOKIE_MAX_AGE_MOBILE_APP * 1000);
  });
});
