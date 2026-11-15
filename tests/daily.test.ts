import { describe, expect, it } from "vitest";
import { getDailyMission } from "../src/ui/daily";

describe("daily missions", () => {
  it("selects the same replay for the same UTC date", () => {
    const date = new Date("2026-11-15T12:00:00Z");
    const first = getDailyMission(date);
    const second = getDailyMission(new Date("2026-11-15T23:59:59Z"));

    expect(first).toEqual(second);
    expect(first.objectiveId).toBeTruthy();
    expect(first.code).toMatch(/^MARGINS-2026-11-15-[A-Z]-[0-9A-F]{4}$/);
  });

  it("changes the replay when the UTC date changes", () => {
    expect(getDailyMission(new Date("2026-11-15T00:00:00Z")).code).not.toBe(
      getDailyMission(new Date("2026-11-16T00:00:00Z")).code,
    );
  });
});
