import type { Design, EvaluationResult } from "../engine/types";
import { loadLastDesign } from "./storage";

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
}

export type AppAction =
  | { type: "START_SOLO" }
  | { type: "GO_TO"; screen: Exclude<Screen, "title"> }
  | { type: "SET_DESIGN"; design: Design }
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
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_SOLO":
      return { ...state, screen: "briefing" };
    case "GO_TO":
      return { ...state, screen: action.screen };
    case "SET_DESIGN":
      return { ...state, design: action.design };
    case "COMPLETE_FLIGHT":
      return { ...state, result: action.result, screen: "debrief" };
    default:
      return state;
  }
}
