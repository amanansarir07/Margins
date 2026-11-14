import { useReducer } from "react";
import { gameData } from "../engine/loadData";
import { BriefingScreen } from "./BriefingScreen";
import { appReducer, initialState } from "./state";
import { TitleScreen } from "./TitleScreen";

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const scenario = gameData.scenarios.find(
    (item) => item.id === state.design.scenarioId,
  );

  return (
    <main className="app">
      {state.screen === "title" && (
        <TitleScreen onStartSolo={() => dispatch({ type: "START_SOLO" })} />
      )}
      {state.screen === "briefing" && scenario && (
        <BriefingScreen
          scenario={scenario}
          onContinue={() => dispatch({ type: "GO_TO", screen: "workshop" })}
        />
      )}
    </main>
  );
}
