import { describe, expect, it } from "vitest";
import { parseReference, resolveAlias } from "../scripts/reference-parser.mjs";
import { plainText } from "../scripts/normalize-books.mjs";
import { competitionRank } from "../scripts/build-rankings.mjs";

const registry = new Set([
  "acts.14.15", "acts.17.24", "psalms.32.6", "psalms.135.5",
  "ecclesiastes.10.1", "1-john.4.9", "john.8.12", "job.38.1",
  "jeremie.10.13", "romans.1.1", "romans.1.2", "romans.1.3",
]);

describe("aliases", () => {
  it("resolves historical and numbered aliases", () => {
    expect(resolveAlias("Io")).toEqual({ slug: "john" });
    expect(resolveAlias("Io", 1)).toEqual({ slug: "1-john" });
    expect(resolveAlias("Reg", 3)).toEqual({ slug: "3-kings" });
  });
  it("keeps numbered families ambiguous without a number", () => {
    expect(resolveAlias("Cor")).toEqual({ ambiguous: true });
  });
});

describe("parser", () => {
  it("parses multiple contextual groups", () => {
    expect(parseReference("Act. 14, 15. 17, 24.", registry).filter((item) => item.status === "exact").map((item) => item.targetId)).toEqual(["acts.14.15", "acts.17.24"]);
  });
  it("switches book context", () => {
    expect(parseReference("Psal. 32, 6. 135, 5. Eccl. 10, 1.", registry).filter((item) => item.status === "exact").map((item) => item.targetId)).toEqual(["psalms.32.6", "psalms.135.5", "ecclesiastes.10.1"]);
  });
  it("parses numbered John", () => {
    expect(parseReference("1. Io. 4, 9.", registry).some((item) => item.status === "exact" && item.targetId === "1-john.4.9")).toBe(true);
  });
  it("recognizes chapter only", () => {
    expect(parseReference("Job. 38. Jer. 10, 13.", registry).map((item) => item.status)).toEqual(["chapter-only", "exact"]);
  });
  it("expands ranges and lists", () => {
    expect(parseReference("Rom. 1, 1-2, 3.", registry).filter((item) => item.status === "exact")).toHaveLength(3);
  });
  it("reports invalid targets", () => {
    expect(parseReference("Io. 99, 99.", registry).some((item) => item.status === "invalid-target")).toBe(true);
  });
  it("reports excluded books", () => {
    expect(parseReference("3. Esd. 1, 1.", registry).some((item) => item.status === "excluded-book")).toBe(true);
  });
});

it("sanitizes source HTML and entities", () => {
  expect(plainText("<b>In&nbsp;the</b> beginning &amp; end")).toBe("In the beginning & end");
});

interface RankableVerse {
  incoming: number;
  order: number;
  chapter: number;
  verse: number;
  rank?: number;
}

it("assigns competition ranks with canonical tie-breaking", () => {
  const rows: RankableVerse[] = [
    { incoming: 2, order: 2, chapter: 1, verse: 1 },
    { incoming: 3, order: 1, chapter: 1, verse: 1 },
    { incoming: 2, order: 1, chapter: 2, verse: 1 },
    { incoming: 0, order: 1, chapter: 3, verse: 1 },
  ];
  const ranked = competitionRank(rows) as RankableVerse[];
  expect(ranked.map((row) => row.rank)).toEqual([1, 2, 2, 4]);
  expect(ranked[1]?.order).toBe(1);
});
