import type { Design, Difficulty, EvaluationResult } from "../engine/types";
import { loadLastDesign } from "./storage";
import type { DailyMission } from "./daily";

export type Screen =
  | "title"
  | "briefing"
  | "workshop"
  | "review"
  | "flight"
  | "debrief";

export interface AppState {
  screen: Screen;
  design: Design;
  result: EvaluationResult | null;
  seed: number;
  difficulty: Difficulty;
  sandbox: boolean;
  dailyMission: DailyMission | null;
}

export type AppAction =
  | { type: "START_SOLO" }
  | { type: "START_SANDBOX" }
  | { type: "START_DAILY"; mission: DailyMission }
  | { type: "GO_TO"; screen: Exclude<Screen, "title"> }
  | { type: "SET_DESIGN"; design: Design }
  | { type: "SET_DIFFICULTY"; difficulty: Difficulty }
  | { type: "SET_SANDBOX"; sandbox: boolean }
  | { type: "COMPLETE_FLIGHT"; result: EvaluationResult };

export const initialDesign: Design = {
  scenarioId: "moon-ice-mapping",
  spacecraftBusId: "compact-bus",
  powerId: "solar-array",
  commsId: "standard-radio",
  onboardComputerId: "simple",
  attitudeControlId: "precise",
  instrumentIds: ["spectrometer"],
  launchVehicleId: "light-lifter",
  orbitId: "flyby",
};

const savedDesign = loadLastDesign();

export const initialState: AppState = {
  screen: "title",
  design: savedDesign ?? initialDesign,
  result: null,
  seed: 42,
  difficulty: "engineer",
  sandbox: false,
  dailyMission: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_SOLO":
      return { ...state, screen: "briefing", sandbox: false, dailyMission: null };
    case "START_SANDBOX":
      return { ...state, screen: "briefing", sandbox: true };
    case "START_DAILY":
      return {
        ...state,
        screen: "briefing",
        sandbox: false,
        dailyMission: action.mission,
        seed: action.mission.seed,
        design: { ...state.design, scenarioId: action.mission.scenarioId },
      };
    case "GO_TO":
      return { ...state, screen: action.screen };
    case "SET_DESIGN":
      return { ...state, design: action.design };
    case "SET_DIFFICULTY":
      return { ...state, difficulty: action.difficulty, sandbox: false };
    case "SET_SANDBOX":
      return { ...state, sandbox: action.sandbox };
    case "COMPLETE_FLIGHT":
      return { ...state, result: action.result, screen: "debrief" };
    default:
      return state;
  }
}
