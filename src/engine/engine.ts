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
  HazardStatus,
  ThreatAssessment,
  ThreatHazard,
  MitigationRecord,
  ResourceName,
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
  mitigations: MitigationRecord[];
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

type ResolvedMissionOptions = Omit<
  Required<MissionOptions>,
  "twistId" | "contractId"
> & Pick<MissionOptions, "twistId" | "contractId">;

const defaultOptions: ResolvedMissionOptions = {
  difficulty: "engineer",
  sandbox: false,
  decisions: {},
};

function resolveOptions(options?: MissionOptions): ResolvedMissionOptions {
  return { ...defaultOptions, ...options };
}

function difficultyLimit(
  limit: number,
  resource: keyof ResourceReport,
  options: ResolvedMissionOptions,
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
  options: ResolvedMissionOptions,
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
    mitigations: (design.mitigationIds ?? []).map((id) =>
      findById(gameData.mitigations, id, "mitigation"),
    ),
  };
}

function twistForOptions(options: ResolvedMissionOptions) {
  return options.twistId
    ? findById(gameData.twists, options.twistId, "twist")
    : undefined;
}

function calculateDesign(
  design: Design,
  scenario: ScenarioRecord,
  twist?: (typeof gameData.twists)[number],
): CalculatedDesign {
  const components = getComponents(design, scenario);
  const dryMass =
    components.bus.massKg +
    components.power.massKg +
    components.comms.massKg +
    components.computer.massKg +
    components.attitude.massKg +
    components.instruments.reduce((total, instrument) => total + instrument.massKg, 0);
  const mitigationMass = components.mitigations.reduce(
    (total, mitigation) => total + mitigation.massKg,
    0,
  );
  const propellantMass =
    dryMass *
    components.destination.propellantFactor *
    components.orbit.propellantModifier;
  const totalMass = dryMass + mitigationMass + propellantMass;
  const powerUsed =
    components.bus.powerW +
    components.comms.powerW +
    components.computer.powerW +
    components.attitude.powerW +
    components.instruments.reduce((total, instrument) => total + instrument.powerW, 0) +
    components.mitigations.reduce((total, mitigation) => total + mitigation.powerW, 0);
  const batteryMargin = components.mitigations.reduce(
    (total, mitigation) => total + (mitigation.powerMarginW ?? 0),
    0,
  );
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
    components.destination.downlinkDistanceFactor *
    (twist?.communicationsMultiplier ?? 1);
  const budgetUsed =
    components.bus.costM +
    components.power.costM +
    components.comms.costM +
    components.computer.costM +
    components.attitude.costM +
    components.instruments.reduce((total, instrument) => total + instrument.costM, 0) +
    components.mitigations.reduce((total, mitigation) => total + mitigation.costM, 0) +
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
    powerAvailable: powerAvailable + batteryMargin,
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
  options: ResolvedMissionOptions,
): ResourceReport {
  const twist = twistForOptions(options);
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
      limit:
        difficultyLimit(scenario.limits.budgetM, "budget", options) *
        (twist?.budgetMultiplier ?? 1),
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
    calculateDesign(design, scenario, twistForOptions(resolvedOptions)),
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

export function getThreatBriefing(
  scenario: ScenarioRecord,
  seed: number,
  twist?: (typeof gameData.twists)[number],
): ThreatHazard[] {
  const random = mulberry32(seed);
  const hazards = scenario.events.flatMap((eventId) => {
    const event = findById(gameData.eventsGame, eventId, "event");
    return random() < event.probability
      ? [{
          id: event.id,
          type: event.hazardType,
          monthStart: event.monthWindow.start,
          monthEnd: event.monthWindow.end + (twist?.hazardWindowExtraMonths ?? 0),
          severity: event.severity,
          consequence: event.consequence,
          resource: event.resource,
          warningLeadDays: event.warningLeadDays,
          ...(event.decision ? { decision: event.decision } : {}),
        }]
      : [];
  });
  if (hazards.length > 0) return hazards;
  const fallback = findById(
    gameData.eventsGame,
    scenario.events[0] ?? "",
    "event",
  );
  return [{
    id: fallback.id,
    type: fallback.hazardType,
    monthStart: fallback.monthWindow.start,
    monthEnd: fallback.monthWindow.end + (twist?.hazardWindowExtraMonths ?? 0),
    severity: fallback.severity,
    consequence: fallback.consequence,
    resource: fallback.resource,
    warningLeadDays: fallback.warningLeadDays,
    ...(fallback.decision ? { decision: fallback.decision } : {}),
  }];
}

function hazardThreshold(severity: ThreatHazard["severity"]): number {
  return severity === "high" ? 0.25 : severity === "medium" ? 0.15 : 0.05;
}

function assessHazard(
  hazard: ThreatHazard,
  calculated: CalculatedDesign,
  resources: ResourceReport,
): ThreatAssessment {
  const resource = resources[hazard.resource];
  const ratio = resource.limit > 0 ? resource.margin / resource.limit : -1;
  const radiationProtected = calculated.mitigations.some(
    (mitigation) => mitigation.id === "radiation-hardened-computer",
  );
  const batteryProtected =
    calculated.mitigations.some((mitigation) => mitigation.id === "battery-margin") &&
    hazard.resource === "power";
  const redundant = calculated.mitigations.some(
    (mitigation) => mitigation.id === "redundant-computer",
  );
  if (
    (hazard.type === "radiation-burst" && radiationProtected) ||
    (hazard.type === "instrument-fault" && redundant)
  ) {
    return { ...hazard, status: "survives", reason: "Mitigation protects this system." };
  }
  const effectiveRatio = batteryProtected ? ratio + 0.2 : ratio;
  const threshold = hazardThreshold(hazard.severity);
  const status: HazardStatus =
    effectiveRatio >= threshold
      ? "survives"
      : effectiveRatio >= threshold - 0.1
        ? "marginal"
        : "fails";
  return {
    ...hazard,
    status,
    reason:
      status === "survives"
        ? `${hazard.resource} margin absorbs this hazard.`
        : status === "marginal"
          ? `${hazard.resource} margin is close to the hazard threshold.`
          : `${hazard.resource} margin is below the hazard threshold.`,
  };
}

export function assessThreats(
  design: Design,
  scenario: ScenarioRecord,
  seed: number,
  options?: MissionOptions,
): ThreatAssessment[] {
  const resolvedOptions = resolveOptions(options);
  const twist = twistForOptions(resolvedOptions);
  const calculated = calculateDesign(design, scenario, twist);
  return getThreatBriefing(scenario, seed, twist).map((hazard) =>
    assessHazard(hazard, calculated, calculateResources(calculated, scenario, resolvedOptions)),
  );
}

export function evaluate(
  design: Design,
  scenario: ScenarioRecord,
  seed: number,
  options?: MissionOptions,
): EvaluationResult {
  const resolvedOptions = resolveOptions(options);
  const twist = twistForOptions(resolvedOptions);
  const calculated = calculateDesign(design, scenario, twist);
  const resources = calculateResources(calculated, scenario, resolvedOptions);
  const launchMass = calculated.launchVehicle.capacityByDestination[scenario.destinationId] ?? 0;
  const launchMassPass = calculated.totalMass <= launchMass;
  const launchOrbitPass = calculated.launchVehicle.supportedOrbits.includes(
    calculated.orbit.id,
  );
  const launcherPass = !(
    twist?.heavyLauncherGrounded && calculated.launchVehicle.id === "heavy-lifter"
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
      pass: launchMassPass && launchOrbitPass && launcherPass,
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

  const threats = assessThreats(design, scenario, seed, resolvedOptions);
  const events = threats.map((threat) => {
    const event = findById(gameData.eventsGame, threat.id, "event");
    const decisionId = resolvedOptions.decisions[threat.id];
    const safeMode = decisionId === "safe-mode";
    const keepObserving = decisionId === "keep-observing";
    const statusOutcome =
      threat.status === "survives"
        ? event.outcomes[0] ?? event.description
        : event.outcomes[1] ?? event.description;
    const decisionOutcome = safeMode
      ? "Safe mode protects instruments but loses 2 science days."
      : keepObserving
        ? threat.status === "survives"
          ? "Observations continue with no added loss."
          : "Observations continue; the weak margin costs reliability."
        : statusOutcome;
    return {
      id: event.id,
      name: event.name,
      occurred: true,
      outcome: decisionOutcome,
      explanation: safeMode
        ? "The chosen safe mode trades science time for protection."
        : threat.reason,
      month: Math.round((threat.monthStart + threat.monthEnd) / 2),
      severity: threat.severity,
      status: threat.status,
      resource: threat.resource,
      warningLeadDays: threat.warningLeadDays +
        (design.mitigationIds?.includes("radiation-monitor") ? 30 : 0),
      ...(decisionId ? { decisionId } : {}),
    };
  });

  let reliability = 1;
  let eventSciencePenalty = 0;
  for (const event of events) {
    const source = findById(gameData.eventsGame, event.id, "event");
    const statusFactor =
      event.status === "fails" ? 1 : event.status === "marginal" ? 0.5 : 0;
    reliability += (source.effects.reliability ?? 0) * statusFactor;
    eventSciencePenalty += (source.effects.science ?? 0) * statusFactor;
    if (event.decisionId === "safe-mode") eventSciencePenalty -= 2;
    if (event.decisionId === "keep-observing" && event.status !== "survives") {
      reliability -= 0.1;
    }
  }
  reliability = Math.max(0, Math.min(1, reliability));
  const adjustedScience = Math.max(0, sciencePoints + eventSciencePenalty);
  const contractRecord = resolvedOptions.contractId
    ? findById(gameData.contracts, resolvedOptions.contractId, "contract")
    : undefined;
  const contract = contractRecord
    ? evaluateContract(contractRecord, calculated, resources)
    : undefined;
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
    ...(!launcherPass ? ["Heavy Lifter is grounded for this twist."] : []),
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
  if (contract && !contract.passed) reasons.push(`Contract failed: ${contract.reason}`);

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
    ...(contract ? { contract } : {}),
  };
}

function evaluateContract(
  contract: (typeof gameData.contracts)[number],
  calculated: CalculatedDesign,
  resources: ResourceReport,
) {
  const passed =
    contract.kind === "mass-under"
      ? calculated.totalMass < (contract.threshold ?? 0)
      : contract.kind === "budget-under"
        ? resources.budget.used < (contract.threshold ?? 0)
        : contract.kind === "time-under"
          ? calculated.timeUsed < (contract.threshold ?? 0)
          : contract.kind === "power-not"
            ? calculated.power.kind !== contract.powerKind
            : contract.kind === "zero-data-loss"
              ? calculated.dataReturnedFraction >= 1
              : false;
  return {
    id: contract.id,
    name: contract.name,
    passed,
    reason: passed ? contract.description : contract.description,
    bonusStars: passed ? contract.bonusStars : 0,
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
  const durationDays = Math.max(
    evaluation.resources.time.limit,
    evaluation.resources.time.used,
    1,
  );
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
    const day = Math.min(
      durationDays,
      Math.max(1, event.month * 30),
    );
    return { ...event, day, phase: phaseAtDay(day, durationDays) };
  });

  return { durationDays, points, events, evaluation };
}
