import type { Design } from "../engine/types";

export type Screen = "title" | "briefing" | "workshop" | "review";

export interface AppState {
  screen: Screen;
  design: Design;
}

export type AppAction =
  | { type: "START_SOLO" }
  | { type: "GO_TO"; screen: Exclude<Screen, "title"> }
  | { type: "SET_DESIGN"; design: Design };

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

export const initialState: AppState = {
  screen: "title",
  design: initialDesign,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_SOLO":
      return { ...state, screen: "briefing" };
    case "GO_TO":
      return { ...state, screen: action.screen };
    case "SET_DESIGN":
      return { ...state, design: action.design };
    default:
      return state;
  }
}
