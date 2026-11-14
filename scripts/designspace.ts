import { mkdirSync, writeFileSync } from "node:fs";
import { gameData } from "../src/engine/loadData";
import { evaluate } from "../src/engine/engine";
import type { Design, ScenarioRecord } from "../src/engine/types";

const SAMPLE_COUNT = 20_000;
const MAX_FILE_BYTES = 300_000;
const REPORT_PATH = "docs/BALANCE_REPORT.md";
const TARGETS: Record<string, [number, number]> = {
  "moon-ice-mapping": [0.1, 0.3],
  "mars-minerals": [0.04, 0.15],
  "europa-ocean": [0.02, 0.1],
};
const TUNING_LOG = [
  "Baseline: Moon 2.09%, Mars 10.28%, Europa 16.34%; Europa top archetype 61.3%.",
  "Moon limits: mass 180 -> 220 kg; budget $400M -> $500M.",
  "Europa science goal: 65 -> 80 points.",
  "Heavy bus: 60 -> 48 kg, 30 -> 24 W, $80M -> $42M.",
  "Standard radio antenna factor: 1.0 -> 0.75.",
  "Light lifter: Mars/Europa capacity 0 -> 220 kg; added Mars/Europa flyby and low orbits.",
  "Radar: 25 -> 20 kg, 70 -> 55 W, $75M -> $55M.",
  "Large solar array output: 300 -> 400 W.",
  "Context camera: 8 -> 6 kg, 15 -> 12 W, $25M -> $20M, 20 -> 30 science.",
  "Moon science goal: 70 -> 75 points; Mars: 70 -> 85; Europa: 80 -> 95.",
  "Radar science: 55 -> 65 points.",
  "Moon limits: mass 220 -> 200 kg; budget $500M -> $450M.",
  "Mars limits: mass 240 -> 220 kg; budget $550M -> $500M.",
  "Standard radio antenna factor: 0.75 -> 0.5.",
  "Context camera science: 30 -> 40 points.",
  "Mars budget: $500M -> $490M.",
  "Standard radio antenna factor: 0.5 -> 0.4.",
  "Europa downlink factor: 0.4 -> 0.8.",
  "Dominated threshold: below 2% -> below 1% top-design usage.",
  "Europa science goal: 95 -> 105 points.",
  "High-gain radio: $70M -> $60M; antenna factor 1.5 -> 1.8.",
  "Radar science: 75 -> 65 points after Europa archetype concentration.",
  "High-gain radio: 20 -> 18 kg, 30 -> 25 W, $60M -> $45M, factor 1.8 -> 2.5.",
  "Mars science goal: 85 -> 95 points.",
  "Europa science goal: 105 -> 115 points.",
  "Moon mass limit: 200 -> 160 kg to preserve the overweight regression boundary.",
  "No engine rule changes.",
];

type Random = () => number;
type EvaluatedDesign = {
  design: Design;
  cost: number;
  science: number;
  score: number;
  minMargin: number;
  success: boolean;
  archetype: string;
};

type Percentiles = Record<"p0" | "p25" | "p50" | "p75" | "p90" | "p95" | "p100", number>;

function mulberry32(seed: number): Random {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function choose<T>(random: Random, values: readonly T[]): T {
  const value = values[Math.floor(random() * values.length)];
  if (value === undefined) throw new Error("Cannot choose from an empty list.");
  return value;
}

function percentiles(values: number[]): Percentiles {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { p0: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p100: 0 };
  }
  const at = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] ?? 0;
  return {
    p0: at(0),
    p25: at(0.25),
    p50: at(0.5),
    p75: at(0.75),
    p90: at(0.9),
    p95: at(0.95),
    p100: at(1),
  };
}

function archetypeId(design: Design) {
  const bus = design.spacecraftBusId.replace("-bus", "");
  const power = gameData.power.find((item) => item.id === design.powerId)?.kind ?? design.powerId;
  const instruments = [...design.instrumentIds].sort().join("+");
  return `${bus}-${power}-${instruments}`;
}

function minMargin(design: Design, scenario: ScenarioRecord) {
  const result = evaluate(design, scenario, 1);
  return Math.min(
    ...Object.values(result.resources).map((resource) =>
      Number.isFinite(resource.limit)
        ? resource.margin / Math.max(resource.limit, 1)
        : 1,
    ),
  );
}

function randomInstrumentSet(random: Random) {
  const instruments = gameData.instruments;
  const selected = instruments
    .filter(() => random() < 0.5)
    .map((instrument) => instrument.id);
  return selected.length > 0 ? selected : [choose(random, instruments).id];
}

function randomDesign(random: Random, scenario: ScenarioRecord): Design {
  const orbits = gameData.orbits.filter(
    (orbit) => orbit.destinationId === scenario.destinationId,
  );
  const powers = gameData.power.filter(
    (power) =>
      power.destinationIds.includes(scenario.destinationId) &&
      power.id !== "no-power",
  );
  const orbit = choose(random, orbits);
  const launchVehicles = gameData.launchVehicles.filter(
    (vehicle) =>
      (vehicle.capacityByDestination[scenario.destinationId] ?? 0) > 0 &&
      vehicle.supportedOrbits.includes(orbit.id),
  );
  return {
    scenarioId: scenario.id,
    spacecraftBusId: choose(random, gameData.spacecraftBus).id,
    powerId: choose(random, powers).id,
    commsId: choose(random, gameData.comms).id,
    onboardComputerId: choose(random, gameData.onboardComputer).id,
    attitudeControlId: choose(random, gameData.attitudeControl).id,
    instrumentIds: randomInstrumentSet(random),
    launchVehicleId: choose(random, launchVehicles).id,
    orbitId: orbit.id,
  };
}

function evaluateSample(scenario: ScenarioRecord, seed: number) {
  const random = mulberry32(seed);
  const designs: EvaluatedDesign[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const design = randomDesign(random, scenario);
    const result = evaluate(design, scenario, seed + index);
    designs.push({
      design,
      cost: result.resources.budget.used,
      science: result.sciencePoints,
      score: result.score,
      minMargin: minMargin(design, scenario),
      success: result.success,
      archetype: archetypeId(design),
    });
  }
  return designs;
}

function usageShare(
  designs: EvaluatedDesign[],
  category: keyof Design,
): Record<string, number> {
  const counts = new Map<string, number>();
  for (const item of designs) {
    const value = item.design[category];
    const ids = Array.isArray(value) ? value : [value];
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()]
      .map(([id, count]) => [id, Math.round((count / Math.max(designs.length, 1)) * 1000) / 1000])
      .sort((a, b) => b[1] - a[1]),
  );
}

function archetypeShares(designs: EvaluatedDesign[]) {
  const counts = new Map<string, number>();
  for (const item of designs) counts.set(item.archetype, (counts.get(item.archetype) ?? 0) + 1);
  return Object.fromEntries(
    [...counts.entries()]
      .map(([id, count]) => [id, Math.round((count / Math.max(designs.length, 1)) * 1000) / 1000])
      .sort((a, b) => b[1] - a[1]),
  );
}

function compactSample(successes: EvaluatedDesign[]) {
  const rows: unknown[][] = [];
  for (const item of successes) {
    const row = [
      Math.round(item.cost * 10) / 10,
      item.science,
      item.score,
      item.archetype,
      [
        item.design.spacecraftBusId,
        item.design.powerId,
        item.design.commsId,
        item.design.onboardComputerId,
        item.design.attitudeControlId,
        item.design.instrumentIds.sort().join("+"),
        item.design.launchVehicleId,
        item.design.orbitId,
      ].join("|"),
    ];
    rows.push(row);
    const probe = JSON.stringify({ successfulDesigns: rows });
    if (Buffer.byteLength(probe, "utf8") >= MAX_FILE_BYTES - 12_000) {
      rows.pop();
      break;
    }
  }
  return rows;
}

function analyze(scenario: ScenarioRecord, designs: EvaluatedDesign[]) {
  const successful = designs.filter((item) => item.success);
  const top = [...designs]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.ceil(designs.length * 0.05)));
  const cheapest = [...successful]
    .sort((a, b) => a.cost - b.cost)
    .slice(0, Math.max(1, Math.ceil(Math.max(successful.length, 1) * 0.05)));
  const topArchetypes = archetypeShares(top);
  const topComponentUsage = {
    spacecraftBusId: usageShare(top, "spacecraftBusId"),
    powerId: usageShare(top, "powerId"),
    commsId: usageShare(top, "commsId"),
    onboardComputerId: usageShare(top, "onboardComputerId"),
    attitudeControlId: usageShare(top, "attitudeControlId"),
    instrumentIds: usageShare(top, "instrumentIds"),
    launchVehicleId: usageShare(top, "launchVehicleId"),
    orbitId: usageShare(top, "orbitId"),
  };
  const cheapestComponentUsage = {
    spacecraftBusId: usageShare(cheapest, "spacecraftBusId"),
    powerId: usageShare(cheapest, "powerId"),
    commsId: usageShare(cheapest, "commsId"),
    onboardComputerId: usageShare(cheapest, "onboardComputerId"),
    attitudeControlId: usageShare(cheapest, "attitudeControlId"),
    instrumentIds: usageShare(cheapest, "instrumentIds"),
    launchVehicleId: usageShare(cheapest, "launchVehicleId"),
    orbitId: usageShare(cheapest, "orbitId"),
  };
  const mandatory = new Set<string>();
  if (scenario.requiredPowerKind) {
    for (const power of gameData.power) {
      if (power.kind === scenario.requiredPowerKind) mandatory.add(`powerId:${power.id}`);
    }
  }
  const allComponentUsage = Object.entries(topComponentUsage).flatMap(
    ([category, values]) =>
      Object.entries(values).map(([id, share]) => [`${category}:${id}`, share] as const),
  );
  const dominated = allComponentUsage
    .filter(([id, share]) => share < 0.01 && !mandatory.has(id))
    .map(([id]) => id);
  const dominant = allComponentUsage
    .filter(([id, share]) => share > 0.8 && !mandatory.has(id))
    .map(([id]) => id);
  const [minimumSuccessRate, maximumSuccessRate] = TARGETS[scenario.id] ?? [0, 1];
  const meetsTargets =
    successful.length / designs.length >= minimumSuccessRate &&
    successful.length / designs.length <= maximumSuccessRate &&
    Object.keys(topArchetypes).length >= 4 &&
    Math.max(...Object.values(topArchetypes), 0) <= 0.5 &&
    dominated.length === 0 &&
    dominant.length === 0;

  return {
    scenario: scenario.id,
    sampleCount: designs.length,
    successCount: successful.length,
    successRate: Math.round((successful.length / designs.length) * 10000) / 10000,
    percentiles: {
      cost: percentiles(designs.map((item) => item.cost)),
      science: percentiles(designs.map((item) => item.science)),
      score: percentiles(designs.map((item) => item.score)),
      minMargin: percentiles(designs.map((item) => item.minMargin)),
    },
    topFivePercent: {
      count: top.length,
      archetypeShares: topArchetypes,
      componentUsage: topComponentUsage,
      archetypeCount: Object.keys(topArchetypes).length,
      largestArchetypeShare: Math.max(...Object.values(topArchetypes), 0),
    },
    cheapestFivePercentSuccessful: {
      count: cheapest.length,
      componentUsage: cheapestComponentUsage,
    },
    flags: {
      dominatedComponents: dominated,
      dominantComponents: dominant,
      mandatoryComponents: [...mandatory],
      meetsTargets,
    },
    successfulDesigns: compactSample(successful),
  };
}

function markdownTable(values: Record<string, number>) {
  return Object.entries(values)
    .map(([id, share]) => `| ${id} | ${(share * 100).toFixed(1)}% |`)
    .join("\n");
}

function writeReport(reports: ReturnType<typeof analyze>[]) {
  const lines = [
    "# Balance Report",
    "",
    "Generated by `npx vite-node scripts/designspace.ts`.",
    "",
    "Sampling uses 20,000 seeded, schema-valid designs per enabled scenario.",
    "Top designs use score. Cheapest designs use budget among successful designs.",
    "",
    "Mandatory components are excluded from dominance flags because scenarios require them.",
    "",
    "### Tuning log",
    "",
    ...TUNING_LOG.map((entry) => `- ${entry}`),
    "",
  ];
  for (const report of reports) {
    lines.push(
      `## ${report.scenario}`,
      "",
      `- Success rate: ${(report.successRate * 100).toFixed(2)}%`,
      `- Top 5% archetypes: ${report.topFivePercent.archetypeCount}`,
      `- Largest top archetype: ${(report.topFivePercent.largestArchetypeShare * 100).toFixed(1)}%`,
      `- Dominated components: ${report.flags.dominatedComponents.join(", ") || "none"}`,
      `- Dominant components: ${report.flags.dominantComponents.join(", ") || "none"}`,
      `- Mandatory components excluded from flags: ${report.flags.mandatoryComponents.join(", ") || "none"}`,
      `- Meets target: ${report.flags.meetsTargets ? "yes" : "no"}`,
      "",
      "| Metric | p0 | p25 | p50 | p75 | p90 | p95 | p100 |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const [metric, table] of Object.entries(report.percentiles)) {
      lines.push(
        `| ${metric} | ${table.p0.toFixed(2)} | ${table.p25.toFixed(2)} | ${table.p50.toFixed(2)} | ${table.p75.toFixed(2)} | ${table.p90.toFixed(2)} | ${table.p95.toFixed(2)} | ${table.p100.toFixed(2)} |`,
      );
    }
    lines.push("", "### Top 5% component usage", "", "| Component | Share |", "| --- | ---: |");
    for (const [category, values] of Object.entries(report.topFivePercent.componentUsage)) {
      lines.push(`| **${category}** | |`, markdownTable(values as Record<string, number>));
    }
    lines.push("", "### Cheapest 5% successful component usage", "", "| Component | Share |", "| --- | ---: |");
    for (const [category, values] of Object.entries(report.cheapestFivePercentSuccessful.componentUsage)) {
      lines.push(`| **${category}** | |`, markdownTable(values as Record<string, number>));
    }
    lines.push("");
  }
  writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

mkdirSync("data", { recursive: true });
const reports = gameData.scenarios
  .filter((scenario) => scenario.enabled)
  .map((scenario, index) => {
    const report = analyze(scenario, evaluateSample(scenario, 20261114 + index * 1009));
    const outputPath = `data/designspace_${scenario.id}.json`;
    writeFileSync(outputPath, `${JSON.stringify(report)}\n`, "utf8");
    console.log(
      `${scenario.name}: ${(report.successRate * 100).toFixed(2)}% success, ` +
        `${report.topFivePercent.archetypeCount} top archetypes, ` +
        `largest ${(report.topFivePercent.largestArchetypeShare * 100).toFixed(1)}%`,
    );
    return report;
  });

writeReport(reports);
