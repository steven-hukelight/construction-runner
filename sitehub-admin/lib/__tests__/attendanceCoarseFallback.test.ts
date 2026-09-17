import {
  MAX_FALLBACK_ACCURACY_M,
  shouldSkipCoarseFallbackOutsideEval,
} from "@/lib/attendanceCoarseFallback";

describe("shouldSkipCoarseFallbackOutsideEval", () => {
  it("skips coarse fused pings so they cannot mark someone outside", () => {
    expect(
      shouldSkipCoarseFallbackOutsideEval({
        fallbackPing: true,
        accuracyM: 200,
        clientAgeOk: true,
      }),
    ).toBe(true);
  });

  it("does not skip an accurate in-shift ping", () => {
    expect(
      shouldSkipCoarseFallbackOutsideEval({
        fallbackPing: true,
        accuracyM: MAX_FALLBACK_ACCURACY_M,
        clientAgeOk: true,
      }),
    ).toBe(false);
  });

  it("does not skip non-fallback pings", () => {
    expect(
      shouldSkipCoarseFallbackOutsideEval({
        fallbackPing: false,
        accuracyM: 500,
        clientAgeOk: true,
      }),
    ).toBe(false);
  });
});
