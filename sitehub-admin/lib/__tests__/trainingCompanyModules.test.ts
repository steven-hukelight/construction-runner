import { companyModuleDetails, parseCompanyQuestions } from "@/lib/training/companyModules";
import { checkOfflineAttemptTimes, trainingRequiredMessage } from "@/lib/training/rules";

const question = (n: number) => ({
  stem: `Question ${n}?`,
  options: [`Right ${n}`, `Wrong ${n}`, `Also wrong ${n}`],
  correctIndex: 0,
});
const five = () => [1, 2, 3, 4, 5].map(question);

describe("parseCompanyQuestions", () => {
  it("accepts five questions with three answers each", () => {
    const parsed = parseCompanyQuestions(five());
    expect(Array.isArray(parsed) && parsed.length).toBe(5);
  });

  it("needs exactly five", () => {
    expect(parseCompanyQuestions(five().slice(0, 4))).toEqual({ error: "Write exactly 5 questions" });
    expect(parseCompanyQuestions(null)).toEqual({ error: "Write exactly 5 questions" });
  });

  it("names the question that is wrong", () => {
    const blankAnswer = five();
    blankAnswer[2] = { ...blankAnswer[2], options: ["A", " ", "C"] };
    expect(parseCompanyQuestions(blankAnswer)).toEqual({ error: "Question 3 has an empty answer" });

    const repeated = five();
    repeated[0] = { ...repeated[0], options: ["Yes", "yes", "No"] };
    expect(parseCompanyQuestions(repeated)).toEqual({ error: "Question 1 has the same answer twice" });

    const unmarked = five();
    unmarked[4] = { ...unmarked[4], correctIndex: 3 };
    expect(parseCompanyQuestions(unmarked)).toEqual({ error: "Mark the right answer for question 5" });
  });

  it("trims the wording", () => {
    const padded = five();
    padded[0] = { stem: "  Where is the muster point?  ", options: [" Gate 1 ", "Canteen", "Car park"], correctIndex: 0 };
    const parsed = parseCompanyQuestions(padded);
    expect(Array.isArray(parsed) && parsed[0]).toEqual({
      stem: "Where is the muster point?",
      options: ["Gate 1", "Canteen", "Car park"],
      correctIndex: 0,
    });
  });
});

describe("companyModuleDetails", () => {
  it("needs a title and keeps minutes optional", () => {
    expect(companyModuleDetails({ title: " ", summary: "", minutes: null })).toEqual({ error: "Give the module a title" });
    expect(companyModuleDetails({ title: "Site rules", summary: " Our rules ", minutes: "" })).toEqual({
      title: "Site rules",
      summary: "Our rules",
      minutes: null,
    });
  });

  it("checks minutes are 1 to 60", () => {
    expect(companyModuleDetails({ title: "Site rules", summary: "", minutes: 90 })).toEqual({ error: "Minutes must be 1 to 60" });
    expect(companyModuleDetails({ title: "Site rules", summary: "", minutes: "10" })).toEqual({
      title: "Site rules",
      summary: "",
      minutes: 10,
    });
  });
});

describe("trainingRequiredMessage", () => {
  it("lists the modules blocking sign-in", () => {
    expect(trainingRequiredMessage(["Manual handling"])).toBe("Pass Manual handling in Training before signing in.");
    expect(trainingRequiredMessage(["Manual handling", "Dust awareness", "Site rules"])).toBe(
      "Pass Manual handling, Dust awareness and Site rules in Training before signing in.",
    );
  });
});

describe("checkOfflineAttemptTimes", () => {
  const now = new Date("2026-11-07T12:00:00.000Z");
  const at = (iso: string) => `2026-11-${iso}`;

  it("accepts a watch that ran long enough, answered after it finished", () => {
    const r = checkOfflineAttemptTimes({
      startedAt: at("07T08:00:00.000Z"),
      completedAt: at("07T08:05:00.000Z"),
      answeredAt: at("07T08:07:00.000Z"),
      requiredSeconds: 240,
      now,
    });
    expect(r).toEqual({
      ok: true,
      startedAt: at("07T08:00:00.000Z"),
      completedAt: at("07T08:05:00.000Z"),
      answeredAt: at("07T08:07:00.000Z"),
    });
  });

  it("refuses a watch that was too short", () => {
    const r = checkOfflineAttemptTimes({
      startedAt: at("07T08:00:00.000Z"),
      completedAt: at("07T08:01:00.000Z"),
      answeredAt: at("07T08:02:00.000Z"),
      requiredSeconds: 240,
      now,
    });
    expect(r.ok === false && r.error).toBe("watch_incomplete");
  });

  it("refuses times out of order, in the future, or over 30 days old", () => {
    const base = { requiredSeconds: 30, now };
    const outOfOrder = checkOfflineAttemptTimes({
      ...base,
      startedAt: at("07T08:05:00.000Z"),
      completedAt: at("07T08:00:00.000Z"),
      answeredAt: at("07T08:06:00.000Z"),
    });
    expect(outOfOrder.ok === false && outOfOrder.error).toBe("invalid_times");
    const future = checkOfflineAttemptTimes({
      ...base,
      startedAt: at("07T11:50:00.000Z"),
      completedAt: at("07T11:55:00.000Z"),
      answeredAt: at("07T13:00:00.000Z"),
    });
    expect(future.ok === false && future.error).toBe("invalid_times");
    const old = checkOfflineAttemptTimes({
      ...base,
      startedAt: "2026-10-01T08:00:00.000Z",
      completedAt: "2026-10-01T08:05:00.000Z",
      answeredAt: "2026-10-01T08:06:00.000Z",
    });
    expect(old.ok === false && old.error).toBe("too_old");
  });
});
