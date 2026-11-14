import { gameData } from "./loadData";
import type {
  AttitudeControlRecord,
  CommsRecord,
  Design,
  EvaluationResult,
  FlightPhase,
  FlightTimeline,
  GameEventRecord,
  Difficulty,
  InstrumentRecord,
  LaunchVehicleRecord,
  OnboardComputerRecord,
  OrbitRecord,
  PowerRecord,
  PreviewResourcesResult,
  ResourceReport,
  ScenarioRecord,
  SpacecraftBusRecord,
  SuggestedFix,
  MissionOptions,
} from "./types";

type Components = {
  bus: SpacecraftBusRecord;
  power: PowerRecord;
  comms: CommsRecord;
  computer: OnboardComputerRecord;
  attitude: AttitudeControlRecord;
  instruments: InstrumentRecord[];
  launchVehicle: LaunchVehicleRecord;
  orbit: OrbitRecord;
  destination: (typeof gameData.destinations)[number];
};

type CalculatedDesign = Components & {
  dryMass: number;
  propellantMass: number;
  totalMass: number;
  powerUsed: number;
  powerAvailable: number;
  generatedData: number;
  downlink: number;
  budgetUsed: number;
  timeUsed: number;
  timeLimit: number;
  dataReturnedFraction: number;
};

const resourceNames = [
  "mass",
  "power",
  "budget",
  "data",
  "comms",
  "time",
] as const;

const defaultOptions: Required<MissionOptions> = {
  difficulty: "engineer",
  sandbox: false,
};

function resolveOptions(options?: MissionOptions): Required<MissionOptions> {
  return { ...defaultOptions, ...options };
}

function difficultyLimit(
  limit: number,
  resource: keyof ResourceReport,
  options: Required<MissionOptions>,
): number {
  if (options.sandbox && resource === "budget") return Number.POSITIVE_INFINITY;
  if (options.difficulty === "cadet") return limit * 1.2;
  if (options.difficulty === "veteran") {
    return limit * (resource === "budget" ? 0.75 : 0.9);
  }
  return limit;
}

function componentCompatibility(
  calculated: CalculatedDesign,
  options: Required<MissionOptions>,
): boolean {
  if (options.difficulty !== "cadet") return true;
  return [
    calculated.bus,
    calculated.power,
    calculated.comms,
    calculated.computer,
    calculated.attitude,
    ...calculated.instruments,
  ].every((component) => component.tier !== "advanced");
}

function findById<T extends { id: string }>(
  records: readonly T[],
  id: string,
  collectionName: string,
): T {
  const record = records.find((item) => item.id === id);
  if (!record) {
    throw new Error(`Unknown ${collectionName} id "${id}".`);
  }
  return record;
}

function getComponents(design: Design, scenario: ScenarioRecord): Components {
  const destination = findById(
    gameData.destinations,
    scenario.destinationId,
    "destination",
  );
  const orbit = findById(gameData.orbits, design.orbitId, "orbit");

  if (orbit.destinationId !== destination.id) {
    throw new Error(
      `Orbit "${orbit.id}" is for "${orbit.destinationId}", not "${destination.id}".`,
    );
  }

  return {
    bus: findById(gameData.spacecraftBus, design.spacecraftBusId, "spacecraft bus"),
    power: findById(gameData.power, design.powerId, "power"),
    comms: findById(gameData.comms, design.commsId, "communications"),
    computer: findById(
      gameData.onboardComputer,
      design.onboardComputerId,
      "onboard computer",
    ),
    attitude: findById(
      gameData.attitudeControl,
      design.attitudeControlId,
      "attitude control",
    ),
    instruments: design.instrumentIds.map((id) =>
      findById(gameData.instruments, id, "instrument"),
    ),
    launchVehicle: findById(
      gameData.launchVehicles,
      design.launchVehicleId,
      "launch vehicle",
    ),
    orbit,
    destination,
  };
}

function calculateDesign(
  design: Design,
  scenario: ScenarioRecord,
): CalculatedDesign {
  const components = getComponents(design, scenario);
  const dryMass =
    components.bus.massKg +
    components.power.massKg +
    components.comms.massKg +
    components.computer.massKg +
    components.attitude.massKg +
    components.instruments.reduce((total, instrument) => total + instrument.massKg, 0);
  const propellantMass =
    dryMass *
    components.destination.propellantFactor *
    components.orbit.propellantModifier;
  const totalMass = dryMass + propellantMass;
  const powerUsed =
    components.bus.powerW +
    components.comms.powerW +
    components.computer.powerW +
    components.attitude.powerW +
    components.instruments.reduce((total, instrument) => total + instrument.powerW, 0);
  const powerAvailable =
    components.power.kind === "solar"
      ? components.power.powerW * components.destination.sunlightComparedToEarth
      : components.power.powerW;
  const generatedData = components.instruments.reduce(
    (total, instrument) => total + instrument.dataMbitPerDay,
    0,
  );
  const downlink =
    200 *
    components.comms.antennaFactor *
    components.destination.downlinkDistanceFactor;
  const budgetUsed =
    components.bus.costM +
    components.power.costM +
    components.comms.costM +
    components.computer.costM +
    components.attitude.costM +
    components.instruments.reduce((total, instrument) => total + instrument.costM, 0) +
    components.launchVehicle.costM +
    components.orbit.costM +
    propellantMass * 0.1;
  const timeUsed = scenario.transitTimeDays + components.orbit.timeDays;
  const timeLimit = Math.min(
    scenario.limits.timeDays,
    scenario.maxProgramMonths * 30 + scenario.transitTimeDays,
  );

  return {
    ...components,
    dryMass,
    propellantMass,
    totalMass,
    powerUsed,
    powerAvailable,
    generatedData,
    downlink,
    budgetUsed,
    timeUsed,
    timeLimit,
    dataReturnedFraction:
      generatedData === 0 ? 1 : Math.min(1, downlink / generatedData),
  };
}

function calculateResources(
  calculated: CalculatedDesign,
  scenario: ScenarioRecord,
  options: Required<MissionOptions>,
): ResourceReport {
  const resources = {
    mass: {
      used: calculated.totalMass,
      limit: difficultyLimit(scenario.limits.massKg, "mass", options),
    },
    power: {
      used: calculated.powerUsed,
      limit: Math.min(
        calculated.powerAvailable,
        difficultyLimit(scenario.limits.powerW, "power", options),
      ),
    },
    budget: {
      used: calculated.budgetUsed,
      limit: difficultyLimit(scenario.limits.budgetM, "budget", options),
    },
    data: {
      used: calculated.generatedData,
      limit: difficultyLimit(scenario.limits.dataMbitPerDay, "data", options),
    },
    comms: {
      used: calculated.generatedData,
      limit: Math.min(
        calculated.downlink,
        difficultyLimit(scenario.limits.communicationsMbitPerDay, "comms", options),
      ),
    },
    time: {
      used: calculated.timeUsed,
      limit: difficultyLimit(calculated.timeLimit, "time", options),
    },
  };

  return Object.fromEntries(
    resourceNames.map((name) => [
      name,
      {
        ...resources[name],
        margin: resources[name].limit - resources[name].used,
      },
    ]),
  ) as ResourceReport;
}

function makeWarnings(resources: ResourceReport): string[] {
  return resourceNames.flatMap((name) => {
    const resource = resources[name];
    if (resource.margin < 0) {
      return [
        `${name} is over by ${Math.abs(resource.margin).toFixed(1)}.`,
      ];
    }
    if (resource.limit > 0 && resource.margin / resource.limit < 0.15) {
      return [`${name} margin is under 15%.`];
    }
    return [];
  });
}

export function previewResources(
  design: Design,
  scenario: ScenarioRecord,
  options?: MissionOptions,
): PreviewResourcesResult {
  const resolvedOptions = resolveOptions(options);
  const resources = calculateResources(
    calculateDesign(design, scenario),
    scenario,
    resolvedOptions,
  );
  return { resources, warnings: makeWarnings(resources) };
}

function roundImpact(value: number): number {
  return Math.round(value * 10) / 10;
}

function changeExplanation(
  label: string,
  cost: number,
  massImpact: number,
  powerImpact: number,
  evaluation: EvaluationResult,
): string {
  const costText =
    cost > 0 ? `adds $${cost.toFixed(1)}M` : `saves $${Math.abs(cost).toFixed(1)}M`;
  const massText =
    massImpact > 0
      ? `adds ${massImpact.toFixed(1)} kg`
      : `removes ${Math.abs(massImpact).toFixed(1)} kg`;
  const powerText =
    powerImpact > 0
      ? `adds ${powerImpact.toFixed(1)} W of power margin`
      : `uses ${Math.abs(powerImpact).toFixed(1)} W of power margin`;
  return evaluation.success
    ? `${label}: ${costText}; ${massText}; ${powerText}. Checks pass.`
    : `${label}: ${costText}; ${massText}; ${powerText}. Score ${evaluation.score}/1000.`;
}

export function suggestFixes(
  design: Design,
  scenario: ScenarioRecord,
  seed: number,
  options?: MissionOptions,
): SuggestedFix[] {
  const resolvedOptions = resolveOptions(options);
  const original = evaluate(design, scenario, seed, resolvedOptions);
  if (original.success) return [];

  const originalPreview = previewResources(design, scenario, resolvedOptions);
  const candidates: { design: Design; label: string }[] = [];
  const seen = new Set<string>([JSON.stringify(design)]);
  const addCandidate = (candidate: Design, label: string) => {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ design: candidate, label });
  };

  const addAdjacent = <T extends { id: string; name: string }>(
    records: readonly T[],
    selectedId: string,
    update: (id: string) => Design,
    componentName: string,
  ) => {
    const index = records.findIndex((record) => record.id === selectedId);
    if (index < 0) return;
    for (const neighbor of [records[index - 1], records[index + 1]]) {
      if (neighbor) {
        addCandidate(
          update(neighbor.id),
          `${componentName}: switch to ${neighbor.name}`,
        );
      }
    }
  };

  addAdjacent(
    gameData.spacecraftBus,
    design.spacecraftBusId,
    (id) => ({ ...design, spacecraftBusId: id }),
    "Spacecraft bus",
  );
  addAdjacent(
    gameData.power,
    design.powerId,
    (id) => ({ ...design, powerId: id }),
    "Power system",
  );
  addAdjacent(
    gameData.comms,
    design.commsId,
    (id) => ({ ...design, commsId: id }),
    "Antenna",
  );
  addAdjacent(
    gameData.onboardComputer,
    design.onboardComputerId,
    (id) => ({ ...design, onboardComputerId: id }),
    "Onboard computer",
  );
  addAdjacent(
    gameData.attitudeControl,
    design.attitudeControlId,
    (id) => ({ ...design, attitudeControlId: id }),
    "Attitude control",
  );

  for (const instrumentId of design.instrumentIds) {
    addCandidate(
      {
        ...design,
        instrumentIds: design.instrumentIds.filter((id) => id !== instrumentId),
      },
      `Instruments: drop ${findById(gameData.instruments, instrumentId, "instrument").name}`,
    );
    for (const replacement of gameData.instruments) {
      if (design.instrumentIds.includes(replacement.id)) continue;
      addCandidate(
        {
          ...design,
          instrumentIds: design.instrumentIds.map((id) =>
            id === instrumentId ? replacement.id : id,
          ),
        },
        `Instruments: swap to ${replacement.name}`,
      );
    }
  }

  for (const vehicle of gameData.launchVehicles) {
    if (vehicle.id !== design.launchVehicleId) {
      addCandidate(
        { ...design, launchVehicleId: vehicle.id },
        `Launch vehicle: switch to ${vehicle.name}`,
      );
    }
  }
  for (const orbit of gameData.orbits) {
    if (orbit.id !== design.orbitId && orbit.destinationId === scenario.destinationId) {
      addCandidate({ ...design, orbitId: orbit.id }, `Orbit: switch to ${orbit.name}`);
    }
  }

  const suggestions = candidates.map(({ design: candidateDesign, label }) => {
    const evaluation = evaluate(candidateDesign, scenario, seed, resolvedOptions);
    const candidatePreview = previewResources(
      candidateDesign,
      scenario,
      resolvedOptions,
    );
    const cost = roundImpact(
      candidatePreview.resources.budget.used -
        originalPreview.resources.budget.used,
    );
    const massImpact = roundImpact(
      candidatePreview.resources.mass.used - originalPreview.resources.mass.used,
    );
    const powerImpact = roundImpact(
      candidatePreview.resources.power.margin -
        originalPreview.resources.power.margin,
    );
    return {
      design: candidateDesign,
      label,
      cost,
      massImpact,
      powerImpact,
      explanation: changeExplanation(
        label,
        cost,
        massImpact,
        powerImpact,
        evaluation,
      ),
      evaluation,
    };
  });

  const successful = suggestions
    .filter((suggestion) => suggestion.evaluation.success)
    .sort((left, right) => left.cost - right.cost);
  if (successful.length > 0) return successful.slice(0, 3);

  return suggestions.sort(
    (left, right) => right.evaluation.score - left.evaluation.score,
  ).slice(0, 1);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function eventOutcome(
  event: GameEventRecord,
  occurred: boolean,
  marginRatio: number,
): { outcome: string; explanation: string } {
  if (!occurred) {
    return {
      outcome: "No event.",
      explanation:
        marginRatio >= 0.25
          ? "Critical margins absorbed the event."
          : "Seeded roll skipped this event.",
    };
  }

  const outcome =
    marginRatio >= 0.1 ? event.outcomes[0] ?? event.description : event.outcomes[1] ?? event.description;
  return {
    outcome,
    explanation:
      marginRatio >= 0.1
        ? "Critical margin absorbed the event."
        : "Tight margin made this event costly.",
  };
}

export function evaluate(
  design: Design,
  scenario: ScenarioRecord,
  seed: number,
  options?: MissionOptions,
): EvaluationResult {
  const resolvedOptions = resolveOptions(options);
  const calculated = calculateDesign(design, scenario);
  const resources = calculateResources(calculated, scenario, resolvedOptions);
  const launchMass = calculated.launchVehicle.capacityByDestination[scenario.destinationId] ?? 0;
  const launchMassPass = calculated.totalMass <= launchMass;
  const launchOrbitPass = calculated.launchVehicle.supportedOrbits.includes(
    calculated.orbit.id,
  );
  const checks = {
    mass: resources.mass.margin >= 0,
    power:
      resources.power.margin >= 0 &&
      (!scenario.requiredPowerKind ||
        calculated.power.kind === scenario.requiredPowerKind),
    data: resources.data.margin >= 0,
    budget: resources.budget.margin >= 0,
    time: resources.time.margin >= 0,
    launchCompatibility: {
      pass: launchMassPass && launchOrbitPass,
      mass: launchMassPass,
      orbit: launchOrbitPass,
    },
    componentCompatibility: componentCompatibility(calculated, resolvedOptions),
  };

  const hasRequiredInstrument =
    resolvedOptions.sandbox ||
    scenario.requiredInstrumentAnyOf.length === 0 ||
    scenario.requiredInstrumentAnyOf.some((id) =>
      design.instrumentIds.includes(id),
    );
  const scienceMultiplier = calculated.computer.processedDataScienceMultiplier ?? 1;
  const sciencePoints = Math.round(
    calculated.instruments.reduce(
      (total, instrument) =>
        total +
        instrument.sciencePoints *
          (instrument.scienceMultiplier ?? 1) *
          calculated.attitude.scienceEfficiency,
      0,
    ) *
      calculated.dataReturnedFraction *
      scienceMultiplier,
  );

  const random = mulberry32(seed);
  const criticalRatios = scenario.criticalResources.map((name) => {
    const resource = resources[name as keyof ResourceReport];
    return resource.limit <= 0 ? 0 : resource.margin / resource.limit;
  });
  const criticalMarginRatio = criticalRatios.length
    ? Math.min(...criticalRatios)
    : Math.min(...resourceNames.map((name) => resources[name].margin / Math.max(resources[name].limit, 1)));
  const events = scenario.events.map((eventId) => {
    const event = findById(gameData.eventsGame, eventId, "event");
    const risk =
      criticalMarginRatio >= 0.25
        ? 0
        : Math.min(
            1,
            (event.probability + (0.25 - Math.max(criticalMarginRatio, 0))) *
              (resolvedOptions.difficulty === "veteran" ? 1.5 : 1),
          );
    const occurred = random() < risk;
    const result = eventOutcome(event, occurred, criticalMarginRatio);
    return {
      id: event.id,
      name: event.name,
      occurred,
      ...result,
    };
  });

  let reliability = 1;
  let eventSciencePenalty = 0;
  for (const event of events) {
    if (event.occurred) {
      const source = findById(gameData.eventsGame, event.id, "event");
      reliability += source.effects.reliability ?? 0;
      eventSciencePenalty += source.effects.science ?? 0;
    }
  }
  reliability = Math.max(0, Math.min(1, reliability));
  const adjustedScience = Math.max(0, sciencePoints + eventSciencePenalty);
  const scoredChecks = [
    checks.mass,
    checks.power,
    checks.data,
    checks.budget,
    checks.time,
    checks.launchCompatibility.pass,
  ];
  const allChecks = scoredChecks.every(Boolean);
  const success =
    allChecks &&
    hasRequiredInstrument &&
    checks.componentCompatibility &&
    (resolvedOptions.sandbox || adjustedScience >= scenario.scienceGoal) &&
    reliability >= 0.5;

  const reasons = [
    ...resourceNames
      .filter((name) => resources[name].margin < 0)
      .map(
        (name) =>
          `${name} fails by ${Math.abs(resources[name].margin).toFixed(1)}.`,
      ),
    ...(!checks.launchCompatibility.mass
      ? [`Launch capacity is ${launchMass.toFixed(1)} kg; design mass is ${calculated.totalMass.toFixed(1)} kg.`]
      : []),
    ...(!checks.launchCompatibility.orbit
      ? [`Launch vehicle lacks ${calculated.orbit.name} support.`]
      : []),
    ...(!hasRequiredInstrument
      ? ["Add a spectrometer or radar."]
      : []),
    ...(!checks.componentCompatibility
      ? ["Cadet mode blocks advanced components."]
      : []),
    ...(!checks.power &&
    scenario.requiredPowerKind &&
    calculated.power.kind !== scenario.requiredPowerKind
      ? [`Use ${scenario.requiredPowerKind} power for this mission.`]
      : []),
    ...(!resolvedOptions.sandbox && adjustedScience < scenario.scienceGoal
      ? [`Science returned ${adjustedScience}; goal is ${scenario.scienceGoal}.`]
      : []),
    ...events
      .filter((event) => event.occurred)
      .map((event) => `${event.name}: ${event.explanation}`),
  ];
  if (success) {
    reasons.unshift(
      `All checks pass. Science returned ${adjustedScience}.`,
    );
  }

  const marginScore =
    (resourceNames.reduce((total, name) => {
      const resource = resources[name];
      const ratio = Number.isFinite(resource.limit)
        ? resource.margin / Math.max(resource.limit, 1)
        : 1;
      return total + Math.max(0, Math.min(1, ratio));
    }, 0) /
      resourceNames.length) *
    200;
  const checksScore =
    (scoredChecks.filter(Boolean).length / 6) *
    600;
  const baseScoreBreakdown = {
    resourceMargins: Math.round(marginScore),
    science: Math.round(
      Math.min(1, adjustedScience / Math.max(scenario.scienceGoal, 1)) * 100,
    ),
    reliability: Math.round(reliability * 100),
    checks: Math.round(checksScore),
  };
  const difficultyScoreMultiplier =
    resolvedOptions.difficulty === "veteran" ? 1.35 : 1;
  const score = Math.min(
    1000,
    Math.round(
      (baseScoreBreakdown.resourceMargins +
        baseScoreBreakdown.science +
        baseScoreBreakdown.reliability +
        baseScoreBreakdown.checks) *
        difficultyScoreMultiplier,
    ),
  );

  return {
    checks,
    resources,
    sciencePoints: adjustedScience,
    reliability,
    events,
    score,
    grade: gradeForScore(
        score,
    ),
    scoreBreakdown: baseScoreBreakdown,
    success,
    reasons,
  };
}

function gradeForScore(score: number): string {
  if (score >= 900) return "A";
  if (score >= 750) return "B";
  if (score >= 600) return "C";
  if (score >= 400) return "D";
  return "F";
}

function phaseAtDay(day: number, durationDays: number): FlightPhase {
  const progress = durationDays > 0 ? day / durationDays : 1;
  if (progress < 0.08) return "launch";
  if (progress < 0.55) return "transit";
  if (progress < 0.68) return "arrival";
  return "operations";
}

export function simulateTimeline(
  design: Design,
  scenario: ScenarioRecord,
  seed: number,
  sampleCount = 32,
  options?: MissionOptions,
): FlightTimeline {
  const evaluation = evaluate(design, scenario, seed, options);
  const durationDays = Math.max(evaluation.resources.time.used, 1);
  const drainFactors = {
    mass: 0.1,
    power: 0.4,
    budget: 0.85,
    data: 0.65,
    comms: 0.65,
    time: 1,
  } as const;
  const points = Array.from({ length: Math.max(sampleCount, 2) }, (_, index) => {
    const progress = index / (Math.max(sampleCount, 2) - 1);
    const resources = Object.fromEntries(
      resourceNames.map((name) => {
        const start = evaluation.resources[name];
        const drain = Math.max(0, start.limit - start.used) * drainFactors[name];
        const used = start.used + drain * progress;
        return [
          name,
          {
            used,
            limit: start.limit,
            margin: start.limit - used,
          },
        ];
      }),
    ) as ResourceReport;
    const day = durationDays * progress;
    return { day, phase: phaseAtDay(day, durationDays), resources };
  });
  const events = evaluation.events.map((event, index) => {
    const day = durationDays * ((index + 1) / (evaluation.events.length + 1));
    return { ...event, day, phase: phaseAtDay(day, durationDays) };
  });

  return { durationDays, points, events, evaluation };
}
