/** @jest-environment node */
import { readProxyIdentity, signProxyIdentity } from "../auth/proxyIdentity";
import type { VerifiedApiUser } from "../auth/apiAuth";

const user: VerifiedApiUser = {
  uid: "user-1",
  dbRole: "admin",
  dbCompanyId: "co-1",
  dbEmail: "a@example.com",
  authEmail: null,
  isSuperuser: false,
  source: "session",
};
const creds = { sessionId: "sess-1", cookieUid: "user-1", cookieRole: "admin", cookieCompanyId: "co-1" };

const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
});
afterAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

describe("proxy identity", () => {
  it("round-trips for the same credentials", () => {
    const token = signProxyIdentity(user, creds);
    expect(readProxyIdentity(token, { ...creds })).toEqual(user);
  });

  it("rejects a token presented with different credentials", () => {
    const token = signProxyIdentity(user, creds);
    expect(readProxyIdentity(token, { ...creds, sessionId: "sess-2" })).toBeNull();
    expect(readProxyIdentity(token, { ...creds, cookieRole: "superuser" })).toBeNull();
  });

  it("rejects a tampered payload or signature", () => {
    const token = signProxyIdentity(user, creds)!;
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), user: { ...user, isSuperuser: true } }),
    ).toString("base64url");
    expect(readProxyIdentity(`${forged}.${signature}`, creds)).toBeNull();
    expect(readProxyIdentity(`${payload}.${signature.slice(0, -2)}xx`, creds)).toBeNull();
    expect(readProxyIdentity("garbage", creds)).toBeNull();
  });

  it("rejects an expired token", () => {
    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now);
    const token = signProxyIdentity(user, creds);
    spy.mockReturnValue(now + 61_000);
    expect(readProxyIdentity(token, creds)).toBeNull();
    spy.mockRestore();
  });

  it("is disabled without a signing secret", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(signProxyIdentity(user, creds)).toBeNull();
  });
});
