import { describe, expect, it } from "vitest";
import { evaluate } from "../src/engine/engine";
import { gameData } from "../src/engine/loadData";
import type { Design } from "../src/engine/types";

function designsForScenario(scenarioId: string): Design[] {
  const scenario = gameData.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Scenario ${scenarioId} is missing from data.`);
  const orbitIds = gameData.orbits
    .filter((orbit) => orbit.destinationId === scenario.destinationId)
    .map((orbit) => orbit.id);
  const launchVehicleIds = ["light-lifter", "heavy-lifter"];
  const designs: Design[] = [];

  const powerIds = scenario.requiredPowerKind === "nuclear"
    ? ["nuclear-generator"]
    : ["solar-array", "large-solar-array", "nuclear-generator"];
  for (const powerId of powerIds) {
    for (const attitudeControlId of ["basic", "precise"]) {
      for (const instrumentIds of [
        ["spectrometer"],
        ["radar"],
        ["spectrometer", "radar"],
        ["camera"],
      ]) {
        for (const spacecraftBusId of ["compact-bus", "heavy-bus"]) {
          for (const commsId of ["standard-radio", "high-gain-radio"]) {
            for (const onboardComputerId of ["simple", "advanced"]) {
              for (const launchVehicleId of launchVehicleIds) {
                for (const orbitId of orbitIds) {
                  designs.push({
                    scenarioId: scenario.id,
                    spacecraftBusId,
                    powerId,
                    commsId,
                    onboardComputerId,
                    attitudeControlId,
                    instrumentIds,
                    launchVehicleId,
                    orbitId,
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  return designs;
}

describe("scenario balance reports", () => {
  for (const scenario of gameData.scenarios.filter((item) => item.enabled)) {
    it(`${scenario.name} has varied, non-trivial winners`, () => {
      const designs = designsForScenario(scenario.id);
      const results = designs.map((design, index) => ({
        design,
        result: evaluate(design, scenario, index + 1),
      }));
      const winners = results.filter(({ result }) => result.success);
      const shapes = new Set(
        winners.map(
          ({ design }) =>
            `${design.spacecraftBusId}/${design.powerId}/${design.commsId}/${design.instrumentIds.join("+")}`,
        ),
      );
      const winningRate = winners.length / results.length;

      console.log(
        `${scenario.name}: ${winners.length}/${results.length} succeed (${Math.round(
          winningRate * 100,
        )}%).`,
      );
      console.log(`Winning shapes: ${[...shapes].join(", ") || "none"}`);
      expect(shapes.size).toBeGreaterThanOrEqual(3);
      expect(winningRate).toBeLessThan(0.8);
    });
  }
});
