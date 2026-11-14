import { describe, expect, it } from "vitest";
import { evaluate } from "../src/engine/engine";
import { gameData } from "../src/engine/loadData";
import type { Design } from "../src/engine/types";

const moon = gameData.scenarios.find((scenario) => scenario.id === "moon-ice-mapping");
if (!moon) {
  throw new Error("Moon scenario is missing from data.");
}

const designs: Design[] = [];
for (const powerId of ["solar-array", "large-solar-array", "nuclear-generator"]) {
  for (const attitudeControlId of ["basic", "precise"]) {
    for (const instrumentIds of [["spectrometer"], ["radar"], ["spectrometer", "radar"]]) {
      designs.push({
        scenarioId: moon.id,
        spacecraftBusId: "compact-bus",
        powerId,
        commsId: "standard-radio",
        onboardComputerId: "simple",
        attitudeControlId,
        instrumentIds,
        launchVehicleId: "light-lifter",
        orbitId: "flyby",
      });
    }
  }
}

describe("Moon balance report", () => {
  it("reports the winning design shapes", () => {
    const results = designs.map((design, index) => ({
      design,
      result: evaluate(design, moon, index + 1),
    }));
    const winners = results.filter(({ result }) => result.success);
    const shapes = new Set(
      winners.map(
        ({ design }) =>
          `${design.powerId}/${design.attitudeControlId}/${design.instrumentIds.join("+")}`,
      ),
    );

    console.log(`Moon balance: ${winners.length}/${results.length} designs succeed.`);
    console.log(`Winning shapes: ${[...shapes].join(", ") || "none"}`);
    expect(shapes.size).toBeGreaterThanOrEqual(3);
  });
});
