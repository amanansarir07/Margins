export type Source = "NASA-based" | "Game model";
export type Difficulty = "cadet" | "engineer" | "veteran";
export type PowerKind = "solar" | "nuclear";

export interface DataRecord {
  id: string;
  name: string;
  source: Source;
  sourceNote: string;
  tier?: "simple" | "advanced";
}

export interface DestinationRecord extends DataRecord {
  description: string;
  distanceFromEarth: number;
  oneWaySignalTime: number;
  typicalTripTime: number;
  surfaceGravity: number;
  sunlightComparedToEarth: number;
  propellantFactor: number;
  downlinkDistanceFactor: number;
}

export interface ResourceLimits {
  massKg: number;
  powerW: number;
  budgetM: number;
  dataMbitPerDay: number;
  communicationsMbitPerDay: number;
  timeDays: number;
}

export interface ScenarioRecord extends DataRecord {
  enabled: boolean;
  destinationId: string;
  objective: string;
  requiredInstruments: string[];
  requiredInstrumentAnyOf: string[];
  limits: ResourceLimits;
  scienceGoal: number;
  maxProgramMonths: number;
  transitTimeDays: number;
  criticalResources: string[];
  events: string[];
  requiredPowerKind?: PowerKind;
  radiationLevel?: "low" | "high";
  difficultyHints?: string[];
}

export interface InstrumentRecord extends DataRecord {
  purpose: string;
  massKg: number;
  powerW: number;
  dataMbitPerDay: number;
  costM: number;
  sciencePoints: number;
  scienceMultiplier?: number;
}

export interface SpacecraftBusRecord extends DataRecord {
  massKg: number;
  powerW: number;
  costM: number;
  dataCapacityMbitPerDay: number;
}

export interface PowerRecord extends DataRecord {
  massKg: number;
  powerW: number;
  costM: number;
  destinationIds: string[];
  kind: PowerKind;
}

export interface CommsRecord extends DataRecord {
  massKg: number;
  powerW: number;
  dataMbitPerDay: number;
  costM: number;
  antennaFactor: number;
}

export interface OnboardComputerRecord extends DataRecord {
  massKg: number;
  powerW: number;
  costM: number;
  dataProcessingMbitPerDay: number;
  processedDataScienceMultiplier?: number;
}

export interface AttitudeControlRecord extends DataRecord {
  massKg: number;
  powerW: number;
  costM: number;
  pointingAccuracy: number;
  scienceEfficiency: number;
}

export interface LaunchVehicleRecord extends DataRecord {
  capacityByDestination: Record<string, number>;
  supportedOrbits: string[];
  costM: number;
}

export interface OrbitRecord extends DataRecord {
  destinationId: string;
  description: string;
  insertionMassKg: number;
  timeDays: number;
  costM: number;
  propellantModifier: number;
}

export interface GameEventRecord extends DataRecord {
  description: string;
  probability: number;
  effects: Record<string, number>;
  outcomes: string[];
}

export interface DonkiEventRecord extends DataRecord {
  eventType: string;
  startTime: string;
  endTime: string;
  sourceId: string;
  effects: Record<string, number>;
  sourceUrl: string;
}

export interface MissionReferenceRecord extends DataRecord {
  missionName: string;
  agency: string;
  destinationId: string;
  launchDate: string;
  massKg: number;
  missionDurationDays: number;
  sourceUrl: string;
}

export interface Design {
  scenarioId: string;
  spacecraftBusId: string;
  powerId: string;
  commsId: string;
  onboardComputerId: string;
  attitudeControlId: string;
  instrumentIds: string[];
  launchVehicleId: string;
  orbitId: string;
}

export type ResourceName =
  | "mass"
  | "power"
  | "budget"
  | "data"
  | "comms"
  | "time";

export interface ResourceSummary {
  used: number;
  limit: number;
  margin: number;
}

export type ResourceReport = Record<ResourceName, ResourceSummary>;

export interface PreviewResourcesResult {
  resources: ResourceReport;
  warnings: string[];
}

export interface EvaluationChecks {
  mass: boolean;
  power: boolean;
  data: boolean;
  budget: boolean;
  time: boolean;
  launchCompatibility: {
    pass: boolean;
    mass: boolean;
    orbit: boolean;
  };
  componentCompatibility: boolean;
}

export interface MissionEventOutcome {
  id: string;
  name: string;
  occurred: boolean;
  outcome: string;
  explanation: string;
}

export interface ScoreBreakdown {
  resourceMargins: number;
  science: number;
  reliability: number;
  checks: number;
}

export interface EvaluationResult {
  checks: EvaluationChecks;
  resources: ResourceReport;
  sciencePoints: number;
  reliability: number;
  events: MissionEventOutcome[];
  score: number;
  grade: string;
  scoreBreakdown: ScoreBreakdown;
  success: boolean;
  reasons: string[];
}

export interface MissionOptions {
  difficulty?: Difficulty;
  sandbox?: boolean;
}

export interface SuggestedFix {
  design: Design;
  label: string;
  cost: number;
  massImpact: number;
  powerImpact: number;
  explanation: string;
  evaluation: EvaluationResult;
}

export type FlightPhase = "launch" | "transit" | "arrival" | "operations";

export interface TimelinePoint {
  day: number;
  phase: FlightPhase;
  resources: ResourceReport;
}

export interface TimelineEvent extends MissionEventOutcome {
  day: number;
  phase: FlightPhase;
}

export interface FlightTimeline {
  durationDays: number;
  points: TimelinePoint[];
  events: TimelineEvent[];
  evaluation: EvaluationResult;
}
