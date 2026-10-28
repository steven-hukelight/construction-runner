import { detectFileType } from "@/lib/siteAlarms/planFiles";
import {
  alarmPushContent,
  allClearPushContent,
  buildMusterBoard,
  parseInstructions,
  parseMusterPoints,
  roleLabel,
  type AudienceMember,
  type ResponseRow,
} from "@/lib/siteAlarms/types";

const member = (id: string, name: string, extras: Partial<AudienceMember> = {}): AudienceMember => ({
  user_id: id,
  name,
  role: "operative",
  on_site: true,
  staff: false,
  ...extras,
});

describe("parseMusterPoints", () => {
  it("accepts a named point with map and plan positions", () => {
    const parsed = parseMusterPoints([{ name: "Gate A", lat: 51.5, lng: -0.1, plan_x: 0.2, plan_y: 0.8 }]);
    expect("points" in parsed).toBe(true);
    if ("points" in parsed) {
      expect(parsed.points[0].name).toBe("Gate A");
      expect(parsed.points[0].lat).toBe(51.5);
      expect(parsed.points[0].plan_x).toBe(0.2);
    }
  });

  it("rejects a plan pin off the image and a half-finished map position", () => {
    expect("error" in parseMusterPoints([{ name: "A", plan_x: 1.2, plan_y: 0.5 }])).toBe(true);
    expect("error" in parseMusterPoints([{ name: "A", lat: 51.5 }])).toBe(true);
  });

  it("rejects a list that is not an array", () => {
    expect(parseMusterPoints({})).toEqual({ error: "Muster points must be a list" });
  });
});

describe("parseInstructions", () => {
  it("keeps only known alarm types and trims blanks", () => {
    const parsed = parseInstructions({ fire: "  Leave by the stairs  ", other: "nope", medical: "" });
    expect("instructions" in parsed).toBe(true);
    if ("instructions" in parsed) {
      expect(parsed.instructions).toEqual({ fire: "Leave by the stairs" });
    }
  });
});

describe("buildMusterBoard", () => {
  it("counts on-site people without a response as unaccounted", () => {
    const board = buildMusterBoard(
      [member("a", "Ann"), member("b", "Ben", { on_site: false, staff: true })],
      [],
      new Map(),
    );
    expect(board.unaccounted.map((p) => p.user_id)).toEqual(["a"]);
    expect(board.safe).toHaveLength(0);
  });

  it("does not treat off-site staff who have not answered as unaccounted", () => {
    const board = buildMusterBoard([member("s", "Sue", { on_site: false, staff: true })], [], new Map());
    expect(board.unaccounted).toHaveLength(0);
  });

  it("groups responses, including people who were not in the snapshot", () => {
    const responses: ResponseRow[] = [
      { alarm_id: "1", user_id: "a", status: "safe", responded_at: "2026-10-27T10:00:00Z", lat: null, lng: null },
      { alarm_id: "1", user_id: "h", status: "need_help", responded_at: "2026-10-27T10:01:00Z", lat: null, lng: null },
    ];
    const board = buildMusterBoard(
      [member("a", "Ann")],
      responses,
      new Map([["h", { name: "Holly", role: "operative" }]]),
    );
    expect(board.safe.map((p) => p.name)).toEqual(["Ann"]);
    expect(board.needHelp.map((p) => p.name)).toEqual(["Holly"]);
  });
});

describe("alarm push copy", () => {
  it("names the raiser, the site and the time in the body", () => {
    const { title, body } = alarmPushContent(
      { type: "fire", is_drill: false, raised_by_name: "John Smith", raised_at: "2026-10-27T13:32:00Z" },
      "Site A",
    );
    expect(title).toBe("FIRE - evacuate now");
    expect(body).toMatch(/Raised by John Smith at Site A/);
    expect(body).toMatch(/\d{2}:\d{2}/);
  });

  it("prefixes drills", () => {
    const { title } = alarmPushContent(
      { type: "medical", is_drill: true, raised_by_name: "Jane", raised_at: "2026-10-27T13:32:00Z" },
      "Yard",
    );
    expect(title.startsWith("DRILL:")).toBe(true);
  });

  it("names who stood the alarm down", () => {
    const { title, body } = allClearPushContent(
      { type: "fire", is_drill: false, stood_down_by_name: "Pat Lee", stood_down_at: "2026-10-27T14:00:00Z" },
      "Site A",
    );
    expect(title).toBe("All clear - Site A");
    expect(body).toMatch(/stood down by Pat Lee/);
  });
});

describe("roleLabel", () => {
  it("uses the same labels as the rest of the dashboard", () => {
    expect(roleLabel("site_admin")).toBe("Site admin");
    expect(roleLabel("operative")).toBe("Operative");
  });
});

describe("detectFileType", () => {
  it("trusts the bytes, not the filename", () => {
    expect(detectFileType(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe("pdf");
    expect(detectFileType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectFileType(Uint8Array.from([0x00, 0x01]))).toBeNull();
  });
});
