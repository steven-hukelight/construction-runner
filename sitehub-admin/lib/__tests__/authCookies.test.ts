import { serializeAuthCookie, serializeAuthCookieClear } from "../authCookies";

describe("auth cookies", () => {
  it("marks privilege cookies HttpOnly", () => {
    const header = serializeAuthCookie("role", "admin", 3600);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("role=admin");
    expect(header).toContain("SameSite=Lax");
  });

  it("clears privilege cookies as HttpOnly so they actually overwrite", () => {
    const header = serializeAuthCookieClear("role");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Max-Age=0");
  });
});
