import { gameData } from "./loadData";
import type {
  AttitudeControlRecord,
  CommsRecord,
  Design,
  EvaluationResult,
  GameEventRecord,
  InstrumentRecord,
  LaunchVehicleRecord,
  OnboardComputerRecord,
  OrbitRecord,
  PowerRecord,
  PreviewResourcesResult,
  ResourceReport,
  ScenarioRecord,
  SpacecraftBusRecord,
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
): ResourceReport {
  const resources = {
    mass: {
      used: calculated.totalMass,
      limit: scenario.limits.massKg,
    },
    power: {
      used: calculated.powerUsed,
      limit: Math.min(calculated.powerAvailable, scenario.limits.powerW),
    },
    budget: {
      used: calculated.budgetUsed,
      limit: scenario.limits.budgetM,
    },
    data: {
      used: calculated.generatedData,
      limit: scenario.limits.dataMbitPerDay,
    },
    comms: {
      used: calculated.generatedData,
      limit: Math.min(calculated.downlink, scenario.limits.communicationsMbitPerDay),
    },
    time: {
      used: calculated.timeUsed,
      limit: calculated.timeLimit,
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
        `${name} is over the limit by ${Math.abs(resource.margin).toFixed(1)}.`,
      ];
    }
    if (resource.limit > 0 && resource.margin / resource.limit < 0.15) {
      return [`${name} has a very small margin.`];
    }
    return [];
  });
}

export function previewResources(
  design: Design,
  scenario: ScenarioRecord,
): PreviewResourcesResult {
  const resources = calculateResources(calculateDesign(design, scenario), scenario);
  return { resources, warnings: makeWarnings(resources) };
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
      outcome: "No event occurred.",
      explanation:
        marginRatio >= 0.25
          ? "Healthy critical-resource margins kept this event from affecting the mission."
          : "The seeded roll did not trigger this event after considering the tight margins.",
    };
  }

  const outcome =
    marginRatio >= 0.1 ? event.outcomes[0] ?? event.description : event.outcomes[1] ?? event.description;
  return {
    outcome,
    explanation:
      marginRatio >= 0.1
        ? "The design had some margin, so the mission used it to absorb the event."
        : "A tight critical-resource margin made this event costly.",
  };
}

export function evaluate(
  design: Design,
  scenario: ScenarioRecord,
  seed: number,
): EvaluationResult {
  const calculated = calculateDesign(design, scenario);
  const resources = calculateResources(calculated, scenario);
  const launchMass = calculated.launchVehicle.capacityByDestination[scenario.destinationId] ?? 0;
  const launchMassPass = calculated.totalMass <= launchMass;
  const launchOrbitPass = calculated.launchVehicle.supportedOrbits.includes(
    calculated.orbit.id,
  );
  const checks = {
    mass: resources.mass.margin >= 0,
    power: resources.power.margin >= 0,
    data: resources.data.margin >= 0,
    budget: resources.budget.margin >= 0,
    time: resources.time.margin >= 0,
    launchCompatibility: {
      pass: launchMassPass && launchOrbitPass,
      mass: launchMassPass,
      orbit: launchOrbitPass,
    },
  };

  const hasRequiredInstrument =
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
        : Math.min(1, event.probability + (0.25 - Math.max(criticalMarginRatio, 0)));
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
  const allChecks =
    Object.values(checks).every((check) =>
      typeof check === "boolean" ? check : check.pass,
    );
  const success =
    allChecks &&
    hasRequiredInstrument &&
    adjustedScience >= scenario.scienceGoal &&
    reliability >= 0.5;

  const reasons = [
    ...resourceNames
      .filter((name) => resources[name].margin < 0)
      .map(
        (name) =>
          `${name} fails by ${Math.abs(resources[name].margin).toFixed(1)}.`,
      ),
    ...(!checks.launchCompatibility.mass
      ? [`The launch vehicle cannot carry ${calculated.totalMass.toFixed(1)} kg.`]
      : []),
    ...(!checks.launchCompatibility.orbit
      ? [`The launch vehicle does not support the ${calculated.orbit.name} orbit.`]
      : []),
    ...(!hasRequiredInstrument
      ? ["The mission needs a spectrometer or radar."]
      : []),
    ...(adjustedScience < scenario.scienceGoal
      ? [`Science returned ${adjustedScience} points; the goal is ${scenario.scienceGoal}.`]
      : []),
    ...events
      .filter((event) => event.occurred)
      .map((event) => `${event.name}: ${event.explanation}`),
  ];
  if (success) {
    reasons.unshift(
      `The mission clears every check and returns ${adjustedScience} science points.`,
    );
  }

  const marginScore =
    (resourceNames.reduce((total, name) => {
      const resource = resources[name];
      return total + Math.max(0, Math.min(1, resource.margin / Math.max(resource.limit, 1)));
    }, 0) /
      resourceNames.length) *
    200;
  const checksScore =
    (Object.values(checks).filter((check) =>
      typeof check === "boolean" ? check : check.pass,
    ).length /
      6) *
    600;
  const scoreBreakdown = {
    resourceMargins: Math.round(marginScore),
    science: Math.round(
      Math.min(1, adjustedScience / Math.max(scenario.scienceGoal, 1)) * 100,
    ),
    reliability: Math.round(reliability * 100),
    checks: Math.round(checksScore),
  };

  return {
    checks,
    resources,
    sciencePoints: adjustedScience,
    reliability,
    events,
    score: Math.min(
      1000,
      scoreBreakdown.resourceMargins +
        scoreBreakdown.science +
        scoreBreakdown.reliability +
        scoreBreakdown.checks,
    ),
    scoreBreakdown,
    success,
    reasons,
  };
}
