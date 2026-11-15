import { gameData } from "../engine/loadData";

export interface DailyMission {
  date: string;
  scenarioId: string;
  twistId: string;
  contractId: string;
  objectiveId: string;
  seed: number;
  code: string;
}

function hash(value: string) {
  let state = 2166136261;
  for (const character of value) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function hexSuffix(value: number) {
  return value.toString(16).toUpperCase().padStart(4, "0").slice(-4);
}

export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyMission(date = new Date()): DailyMission {
  const dateString = utcDateString(date);
  const seed = hash(`margins:${dateString}`);
  const scenarios = gameData.scenarios.filter((scenario) => scenario.enabled);
  const scenario = scenarios[seed % scenarios.length];
  if (!scenario) throw new Error("Daily mission has no enabled scenarios.");
  const twists = gameData.twists.filter((twist) =>
    twist.scenarioIds.includes(scenario.id),
  );
  const contracts = gameData.contracts.filter(
    (contract) => contract.scenarioId === scenario.id,
  );
  const objectives = gameData.objectives.filter(
    (objective) => objective.scenarioId === scenario.id,
  );
  const twist = twists[Math.floor(seed / 7) % twists.length];
  const contract = contracts[Math.floor(seed / 13) % contracts.length];
  const objective = objectives[Math.floor(seed / 17) % objectives.length];
  if (!twist || !contract || !objective) {
    throw new Error(`Daily mission data is incomplete for ${scenario.id}.`);
  }
  const destinationCode = scenario.destinationId.slice(0, 1).toUpperCase();
  return {
    date: dateString,
    scenarioId: scenario.id,
    twistId: twist.id,
    contractId: contract.id,
    objectiveId: objective.id,
    seed,
    code: `MARGINS-${dateString}-${destinationCode}-${hexSuffix(seed)}`,
  };
}
