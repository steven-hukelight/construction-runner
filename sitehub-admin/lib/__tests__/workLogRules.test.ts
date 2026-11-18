import {
  londonMidnightIso,
  namesFromPlaceCsv,
  namesFromPlacePdfText,
  parseNameList,
  placeGroupLabel,
  plotRunNames,
  uniqueRecentPlaces,
} from "@/lib/worklog/rules";

describe("parseNameList", () => {
  it("splits lines and commas and drops blanks and repeats", () => {
    expect(parseNameList("Plot 101\n\nPlot 102, plot 101\nLevel 3")).toEqual([
      "Plot 101",
      "Plot 102",
      "Level 3",
    ]);
  });
});

describe("plotRunNames", () => {
  it("builds a block and core run", () => {
    expect(plotRunNames({ block: "Block D", core: "1", from: 1, to: 3 })).toEqual([
      "Block D Core 1 Plot 1",
      "Block D Core 1 Plot 2",
      "Block D Core 1 Plot 3",
    ]);
  });

  it("pads numbers when asked", () => {
    expect(plotRunNames({ from: 8, to: 10, pad: true })).toEqual(["Plot 08", "Plot 09", "Plot 10"]);
  });
});

describe("namesFromPlaceCsv", () => {
  it("reads Block, Core, Plot columns", () => {
    expect(
      namesFromPlaceCsv("Block,Core,Plot\nBlock D,1,1\nBlock D,1,2\n"),
    ).toEqual(["Block D Core 1 Plot 1", "Block D Core 1 Plot 2"]);
  });

  it("reads a single name column and quoted commas", () => {
    expect(namesFromPlaceCsv('Name\n"Drainage, SW"\nRoads\n')).toEqual(["Drainage, SW", "Roads"]);
  });
});

describe("namesFromPlacePdfText", () => {
  it("reads a CSV table printed in a PDF", () => {
    expect(namesFromPlacePdfText("Block,Core,Plot\nBlock D,1,1\nBlock D,1,2\n")).toEqual([
      "Block D Core 1 Plot 1",
      "Block D Core 1 Plot 2",
    ]);
  });

  it("reads a block heading then a number run", () => {
    expect(namesFromPlacePdfText("Block D Core 1\n1 2 3\n")).toEqual([
      "Block D Core 1 Plot 1",
      "Block D Core 1 Plot 2",
      "Block D Core 1 Plot 3",
    ]);
  });

  it("reads Plot tokens when the PDF has no line breaks", () => {
    expect(namesFromPlacePdfText("Block D Core 1 Plot 8 Block D Core 1 Plot 9")).toEqual([
      "Block D Core 1 Plot 8",
      "Block D Core 1 Plot 9",
    ]);
  });

  it("reads a Plot No table", () => {
    expect(namesFromPlacePdfText("Plot No Type\n1 2B\n2 2B\n")).toEqual(["Plot 1", "Plot 2"]);
  });

  it("does not treat a RAMS paragraph as plots", () => {
    expect(
      namesFromPlacePdfText("This RAMS covers works to Block D. See page 12. Review date 2026."),
    ).toEqual([]);
  });
});

describe("placeGroupLabel", () => {
  it("groups housing plots and leaves infrastructure as Other", () => {
    expect(placeGroupLabel("Block D Core 1 Plot 40")).toBe("Block D Core 1");
    expect(placeGroupLabel("Drainage SW")).toBe("Other");
  });
});

describe("uniqueRecentPlaces", () => {
  it("keeps the first activity seen for each place", () => {
    expect(
      uniqueRecentPlaces([
        { place_id: "p1", activity_id: "a1" },
        { place_id: "p2", activity_id: "a2" },
        { place_id: "p1", activity_id: "a9" },
        { place_id: "p3", activity_id: "a3" },
      ], 2),
    ).toEqual([
      { placeId: "p1", activityId: "a1" },
      { placeId: "p2", activityId: "a2" },
    ]);
  });
});

describe("londonMidnightIso", () => {
  it("is midnight London in winter and summer", () => {
    expect(londonMidnightIso(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01-15T00:00:00.000Z");
    expect(londonMidnightIso(new Date("2026-07-15T12:00:00Z"))).toBe("2026-07-14T23:00:00.000Z");
  });
});
