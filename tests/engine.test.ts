import { describe, expect, it } from "vitest";
import {
  evaluate,
  previewResources,
  simulateTimeline,
  suggestFixes,
} from "../src/engine/engine";
import { gameData } from "../src/engine/loadData";
import type { Design } from "../src/engine/types";

const moon = gameData.scenarios.find((scenario) => scenario.id === "moon-ice-mapping");

if (!moon) {
  throw new Error("Moon scenario is missing from test data.");
}

const baseDesign: Design = {
  scenarioId: moon.id,
  spacecraftBusId: "compact-bus",
  powerId: "solar-array",
  commsId: "standard-radio",
  onboardComputerId: "simple",
  attitudeControlId: "precise",
  instrumentIds: ["spectrometer"],
  launchVehicleId: "light-lifter",
  orbitId: "flyby",
};

describe("mission engine", () => {
  it("fails an overweight design", () => {
    const result = evaluate(
      {
        ...baseDesign,
        spacecraftBusId: "heavy-bus",
        instrumentIds: ["spectrometer", "radar", "camera"],
      },
      moon,
      7,
    );

    expect(result.checks.mass).toBe(false);
    expect(result.success).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("mass"))).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    expect(evaluate(baseDesign, moon, 12345)).toEqual(
      evaluate(baseDesign, moon, 12345),
    );
  });

  it("passes a hand-built Moon design", () => {
    const result = evaluate(baseDesign, moon, 1);

    expect(result.success).toBe(true);
    expect(result.checks.launchCompatibility.pass).toBe(true);
    expect(result.sciencePoints).toBeGreaterThanOrEqual(moon.scienceGoal);
  });

  it("explains a power failure when solar panels are removed", () => {
    const result = evaluate(
      { ...baseDesign, powerId: "no-power" },
      moon,
      1,
    );

    expect(result.checks.power).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("power"))).toBe(true);
  });

  it("creates a four-phase timeline with draining resource samples", () => {
    const timeline = simulateTimeline(baseDesign, moon, 1);
    const phases = new Set(timeline.points.map((point) => point.phase));

    expect(phases).toEqual(new Set(["launch", "transit", "arrival", "operations"]));
    expect(timeline.points.at(-1)?.resources.time.used).toBeGreaterThan(
      timeline.points[0]?.resources.time.used ?? 0,
    );
    expect(timeline.evaluation.grade).toMatch(/[A-F]/);
  });

  it("suggests a power fix for a power-failed design", () => {
    const failedDesign = { ...baseDesign, powerId: "no-power" };
    const fixes = suggestFixes(failedDesign, moon, 1);

    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes[0]?.design.powerId).not.toBe("no-power");
    expect(fixes[0]?.evaluation.success).toBe(true);
    expect(fixes[0]?.explanation).toContain("Power system");
  });

  it("returns no fixes for a successful design", () => {
    expect(suggestFixes(baseDesign, moon, 1)).toEqual([]);
  });
});
