import {
  addMonths,
  campaignIsLive,
  faceFitStatus,
  failsInARow,
  isPlayable,
  moduleStatus,
  quizForPhone,
  requiredWatchSeconds,
  scoreQuiz,
  watchedLongEnough,
} from "@/lib/training/rules";
import { isHttpsUrl } from "@/lib/utils/httpsUrl";

const now = new Date("2026-11-07T12:00:00Z");

describe("moduleStatus", () => {
  it("is not started with no activity and no pass", () => {
    expect(moduleStatus({ lastPassedAt: null, refreshMonths: 12, activitySincePass: false, now }).status).toBe("not_started");
  });

  it("is in progress once a video was started", () => {
    expect(moduleStatus({ lastPassedAt: null, refreshMonths: 12, activitySincePass: true, now }).status).toBe("in_progress");
  });

  it("is passed inside the refresh period and due again after it", () => {
    const passed = moduleStatus({ lastPassedAt: "2026-01-10T09:00:00Z", refreshMonths: 12, activitySincePass: false, now });
    expect(passed.status).toBe("passed");
    expect(passed.dueAt).toBe("2027-01-10T09:00:00.000Z");
    expect(moduleStatus({ lastPassedAt: "2025-11-01T09:00:00Z", refreshMonths: 12, activitySincePass: false, now }).status).toBe("due_again");
  });

  it("never falls due when refresh is off", () => {
    const s = moduleStatus({ lastPassedAt: "2020-01-01T00:00:00Z", refreshMonths: null, activitySincePass: false, now });
    expect(s).toEqual({ status: "passed", dueAt: null });
  });
});

describe("addMonths", () => {
  it("clamps to the last day of a shorter month", () => {
    expect(addMonths("2026-01-31T10:00:00Z", 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });
});

describe("watch time", () => {
  it("uses the module minimum when set", () => {
    expect(requiredWatchSeconds(60, 300)).toBe(60);
  });

  it("uses 80% of the reported length otherwise, at least 30 seconds", () => {
    expect(requiredWatchSeconds(null, 300)).toBe(240);
    expect(requiredWatchSeconds(null, 20)).toBe(30);
    expect(requiredWatchSeconds(null, null)).toBe(30);
  });

  it("rejects a finish that came too soon after the start", () => {
    expect(watchedLongEnough("2026-11-07T11:59:30Z", now, 60)).toBe(false);
    expect(watchedLongEnough("2026-11-07T11:58:59Z", now, 60)).toBe(true);
  });
});

describe("quiz", () => {
  const questions = [
    { id: "a", stem: "A", options: ["x", "y", "z"], correct_index: 0 },
    { id: "b", stem: "B", options: ["x", "y", "z"], correct_index: 1 },
    { id: "c", stem: "C", options: ["x", "y", "z"], correct_index: 2 },
    { id: "d", stem: "D", options: ["x", "y", "z"], correct_index: 0 },
    { id: "e", stem: "E", options: ["x", "y", "z"], correct_index: 1 },
  ];

  it("passes on 4 of 5 and fails on 3 of 5", () => {
    expect(scoreQuiz(questions, { a: 0, b: 1, c: 2, d: 0, e: 0 }, 4)).toMatchObject({ score: 4, total: 5, passed: true });
    expect(scoreQuiz(questions, { a: 0, b: 1, c: 2, d: 1, e: 0 }, 4)).toMatchObject({ score: 3, passed: false });
  });

  it("ignores answers that are not a whole option index", () => {
    expect(scoreQuiz(questions, { a: "0", b: "1.0", c: null }, 4).score).toBe(2);
  });

  it("keeps each option's stored index when shuffling", () => {
    const phone = quizForPhone(questions);
    expect(phone.map((q) => q.id).sort()).toEqual(["a", "b", "c", "d", "e"]);
    for (const q of phone) {
      expect(q.options.map((o) => o.index).sort()).toEqual([0, 1, 2]);
      expect(q).not.toHaveProperty("correct_index");
    }
  });

  it("counts fails since the last pass", () => {
    expect(failsInARow([{ passed: false }, { passed: false }, { passed: true }, { passed: false }])).toBe(2);
    expect(failsInARow([])).toBe(0);
  });
});

describe("face fit", () => {
  it("is due with no test or a failed test", () => {
    expect(faceFitStatus(null, now)).toBe("due");
    expect(faceFitStatus({ result: "fail", review_due_at: "2027-06-01" }, now)).toBe("due");
  });

  it("is current, then review soon inside 30 days, then due after the date", () => {
    expect(faceFitStatus({ result: "pass", review_due_at: "2027-06-01" }, now)).toBe("current");
    expect(faceFitStatus({ result: "pass", review_due_at: "2026-11-20" }, now)).toBe("review_soon");
    expect(faceFitStatus({ result: "pass", review_due_at: "2026-11-07" }, now)).toBe("review_soon");
    expect(faceFitStatus({ result: "pass", review_due_at: "2026-11-06" }, now)).toBe("due");
  });
});

describe("helpers", () => {
  it("only treats a module with a video or a link as playable", () => {
    expect(isPlayable({ video_path: null, external_url: null })).toBe(false);
    expect(isPlayable({ video_path: "modules/x.mp4", external_url: null })).toBe(true);
    expect(isPlayable({ video_path: " ", external_url: "https://www.hse.gov.uk/" })).toBe(true);
    expect(isPlayable({ video_path: null, external_url: null, document_path: "companies/c/ppe/1.pdf" })).toBe(true);
  });

  it("shows a campaign between its start and end dates inclusive", () => {
    expect(campaignIsLive({ starts_on: "2026-11-01", ends_on: "2026-11-07" }, now)).toBe(true);
    expect(campaignIsLive({ starts_on: "2026-11-08", ends_on: "2026-11-30" }, now)).toBe(false);
  });

  it("accepts only https links", () => {
    expect(isHttpsUrl("https://www.hse.gov.uk/")).toBe(true);
    expect(isHttpsUrl("http://www.hse.gov.uk/")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
  });
});
