import { isAttendanceCronAuthorized } from "@/lib/attendanceCronAuth";

function req(headers: Record<string, string>): Request {
  return new Request("https://www.construction-runner.com/api/attendance/archive", {
    headers,
  });
}

describe("isAttendanceCronAuthorized", () => {
  const prevSecret = process.env.CRON_SECRET;
  const prevVercel = process.env.VERCEL;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  });

  it("accepts Bearer CRON_SECRET", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(isAttendanceCronAuthorized(req({ authorization: "Bearer test-secret" }))).toBe(true);
    expect(isAttendanceCronAuthorized(req({ authorization: "Bearer wrong" }))).toBe(false);
  });

  it("rejects everything when CRON_SECRET is unset, even on Vercel", () => {
    delete process.env.CRON_SECRET;
    process.env.VERCEL = "1";
    expect(isAttendanceCronAuthorized(req({ "x-vercel-cron": "1" }))).toBe(false);
    expect(isAttendanceCronAuthorized(req({ "x-vercel-cron-schedule": "0 7 * * *" }))).toBe(false);
    expect(isAttendanceCronAuthorized(req({ authorization: "Bearer " }))).toBe(false);
    expect(isAttendanceCronAuthorized(req({}))).toBe(false);
  });
});
