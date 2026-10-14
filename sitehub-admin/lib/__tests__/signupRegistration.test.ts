import {
  classifySignupStatus,
  canApproveRegistrations,
  isApprovalQueueStatus,
  isPendingApprovalStatus,
  signupOtpSentRecently,
} from "../signupRegistration";

describe("classifySignupStatus", () => {
  it("treats email verification as unverified, not pending", () => {
    expect(classifySignupStatus("EMAIL_UNVERIFIED")).toBe("unverified");
    expect(isPendingApprovalStatus("EMAIL_UNVERIFIED")).toBe(false);
  });

  it("treats pending and company-admin pending as the approval queue", () => {
    expect(classifySignupStatus("PENDING")).toBe("pending");
    expect(classifySignupStatus("COMPANY_ADMIN_PENDING")).toBe("pending");
    expect(isPendingApprovalStatus("PENDING")).toBe(true);
    expect(isPendingApprovalStatus("COMPANY_ADMIN_PENDING")).toBe(true);
    expect(isApprovalQueueStatus("PENDING")).toBe(true);
    expect(isApprovalQueueStatus("EMAIL_UNVERIFIED")).toBe(true);
    expect(isApprovalQueueStatus("APPROVED")).toBe(false);
  });

  it("classifies approved and rejected", () => {
    expect(classifySignupStatus("APPROVED")).toBe("approved");
    expect(classifySignupStatus("ADMIN_SETUP_PENDING")).toBe("approved");
    expect(classifySignupStatus("REJECTED")).toBe("rejected");
  });
});

describe("canApproveRegistrations", () => {
  it("allows company staff and superuser", () => {
    expect(canApproveRegistrations("admin")).toBe(true);
    expect(canApproveRegistrations("SUPERVISOR")).toBe(true);
    expect(canApproveRegistrations("sub_admin")).toBe(true);
    expect(canApproveRegistrations("superuser")).toBe(true);
    expect(canApproveRegistrations("operative")).toBe(false);
  });
});

describe("signupOtpSentRecently", () => {
  it("is true only inside the window", () => {
    expect(signupOtpSentRecently(new Date().toISOString(), 60_000)).toBe(true);
    expect(signupOtpSentRecently(new Date(Date.now() - 120_000).toISOString(), 60_000)).toBe(false);
    expect(signupOtpSentRecently(null)).toBe(false);
  });
});
