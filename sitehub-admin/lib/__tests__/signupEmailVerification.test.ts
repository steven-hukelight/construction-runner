import {
  generateSignupLinkToken,
  hashSignupLinkToken,
  hashSignupOtp,
  signupOtpExpiresAt,
  verifySignupLinkTokenHash,
  verifySignupOtpHash,
} from "../signupEmailVerification";

describe("verifySignupOtpHash", () => {
  const code = "123456";
  const hash = hashSignupOtp(code);

  it("accepts a matching unexpired code", () => {
    expect(
      verifySignupOtpHash({
        code,
        hash,
        expiresAt: signupOtpExpiresAt(),
        attempts: 0,
      })
    ).toEqual({ ok: true });
  });

  it("rejects the wrong code", () => {
    const result = verifySignupOtpHash({
      code: "000000",
      hash,
      expiresAt: signupOtpExpiresAt(),
      attempts: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an expired code", () => {
    const result = verifySignupOtpHash({
      code,
      hash,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      attempts: 0,
    });
    expect(result.ok).toBe(false);
  });
});

describe("verifySignupLinkTokenHash", () => {
  const token = generateSignupLinkToken();
  const hash = hashSignupLinkToken(token);

  it("accepts a matching unexpired link token", () => {
    expect(
      verifySignupLinkTokenHash({
        token,
        hash,
        expiresAt: signupOtpExpiresAt(),
      })
    ).toEqual({ ok: true });
  });

  it("rejects a different token", () => {
    const result = verifySignupLinkTokenHash({
      token: generateSignupLinkToken(),
      hash,
      expiresAt: signupOtpExpiresAt(),
    });
    expect(result.ok).toBe(false);
  });
});
