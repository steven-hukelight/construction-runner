import { isMedicalInfoComplete } from "@/lib/myInfo";

describe("isMedicalInfoComplete", () => {
  it("is incomplete when there is no medical row", () => {
    expect(isMedicalInfoComplete(null)).toBe(false);
    expect(isMedicalInfoComplete(undefined)).toBe(false);
  });

  it("is complete when the worker has no medical issues", () => {
    expect(isMedicalInfoComplete({ hasMedicalIssues: false })).toBe(true);
    expect(isMedicalInfoComplete({ fitToWork: true })).toBe(true);
  });

  it("is complete with a certificate, declaration, or verified flag", () => {
    expect(isMedicalInfoComplete({ medicalCertificateUrl: "https://example.com/med.pdf" })).toBe(true);
    expect(isMedicalInfoComplete({ medicalDeclaration: "Fit for work" })).toBe(true);
    expect(isMedicalInfoComplete({ medicalVerified: true })).toBe(true);
  });

  it("stays incomplete when the form is unanswered", () => {
    expect(
      isMedicalInfoComplete({
        medicalDeclaration: "  ",
        fitToWork: null,
        hasMedicalIssues: null,
      }),
    ).toBe(false);
  });
});
