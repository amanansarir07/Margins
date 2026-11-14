import { describe, expect, it } from "vitest";
import {
  evaluate,
  getThreatBriefing,
  assessThreats,
  previewResources,
  simulateTimeline,
  suggestFixes,
} from "../src/engine/engine";
import { gameData } from "../src/engine/loadData";
import type { Design, MissionOptions } from "../src/engine/types";

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

  it("keeps event timing deterministic for the same seed", () => {
    const first = simulateTimeline(baseDesign, moon, 9876);
    const second = simulateTimeline(baseDesign, moon, 9876);

    expect(first.events).toEqual(second.events);
    expect(gameData.eventsGame.find((event) => event.id === "solar-flare")?.decision?.choices)
      .toHaveLength(2);
  });

  it("places visible hazards before the end of the mission window", () => {
    const timeline = simulateTimeline(baseDesign, moon, 9876);

    expect(timeline.events.some((event) => event.day < timeline.durationDays)).toBe(true);
  });

  it("uses the visible threat briefing as the flight event list", () => {
    const briefing = getThreatBriefing(moon, 9876);
    const timeline = simulateTimeline(baseDesign, moon, 9876);

    expect(timeline.events.map((event) => event.id)).toEqual(
      briefing.map((hazard) => hazard.id),
    );
    expect(timeline.events.every((event) => event.occurred)).toBe(true);
  });

  it("keeps hazard decisions deterministic", () => {
    const hazard = getThreatBriefing(moon, 9876)[0];
    if (!hazard) throw new Error("Threat briefing is empty.");
    const decisions = { [hazard.id]: "safe-mode" };

    expect(
      evaluate(baseDesign, moon, 9876, { decisions }),
    ).toEqual(evaluate(baseDesign, moon, 9876, { decisions }));
  });

  it("shows mitigation status before flight", () => {
    const design = {
      ...baseDesign,
      mitigationIds: ["battery-margin"],
    };
    const threats = assessThreats(design, moon, 9876);

    expect(threats.every((threat) => ["survives", "marginal", "fails"].includes(threat.status)))
      .toBe(true);
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

  it("supports Mars and keeps its orbit compatible", () => {
    const mars = gameData.scenarios.find((scenario) => scenario.id === "mars-minerals");
    if (!mars) throw new Error("Mars scenario is missing from test data.");

    const result = evaluate(
      {
        ...baseDesign,
        scenarioId: mars.id,
        powerId: "nuclear-generator",
        launchVehicleId: "heavy-lifter",
        orbitId: "mars-flyby",
      },
      mars,
      1,
    );

    expect(mars.enabled).toBe(true);
    expect(result.checks.launchCompatibility.orbit).toBe(true);
  });

  it("requires nuclear power at Europa", () => {
    const europa = gameData.scenarios.find((scenario) => scenario.id === "europa-ocean");
    if (!europa) throw new Error("Europa scenario is missing from test data.");

    const result = evaluate(
      {
        ...baseDesign,
        scenarioId: europa.id,
        launchVehicleId: "heavy-lifter",
        orbitId: "europa-flyby",
      },
      europa,
      1,
    );

    expect(result.checks.power).toBe(false);
    expect(result.reasons).toContain("Use nuclear power for this mission.");
  });

  it("enforces Cadet component limits and removes Sandbox goals", () => {
    const cadet: MissionOptions = { difficulty: "cadet", sandbox: false };
    expect(evaluate(baseDesign, moon, 1, cadet).checks.componentCompatibility).toBe(
      false,
    );

    const sandbox: MissionOptions = { difficulty: "engineer", sandbox: true };
    expect(previewResources(baseDesign, moon, sandbox).resources.budget.limit).toBe(
      Infinity,
    );
    expect(evaluate(baseDesign, moon, 1, sandbox).success).toBe(true);
  });
});
