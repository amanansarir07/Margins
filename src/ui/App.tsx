import { useEffect, useReducer } from "react";
import { gameData } from "../engine/loadData";
import { BriefingScreen } from "./BriefingScreen";
import { appReducer, initialState } from "./state";
import { TitleScreen } from "./TitleScreen";
import { WorkshopScreen } from "./WorkshopScreen";
import { ReviewScreen } from "./ReviewScreen";
import { DebriefScreen } from "./DebriefScreen";
import { FlightScreen } from "./FlightScreen";
import { saveBestScore, saveLastDesign } from "./storage";

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const scenario = gameData.scenarios.find(
    (item) => item.id === state.design.scenarioId,
  );

  useEffect(() => {
    saveLastDesign(state.design);
  }, [state.design]);

  useEffect(() => {
    if (state.result) saveBestScore(state.result.score);
  }, [state.result]);

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
      {state.screen === "workshop" && scenario && (
        <WorkshopScreen
          design={state.design}
          scenario={scenario}
          onDesignChange={(design) => dispatch({ type: "SET_DESIGN", design })}
          onContinue={() => dispatch({ type: "GO_TO", screen: "review" })}
        />
      )}
      {state.screen === "review" && scenario && (
        <ReviewScreen
          design={state.design}
          scenario={scenario}
          onBack={() => dispatch({ type: "GO_TO", screen: "workshop" })}
          onLaunch={() => dispatch({ type: "GO_TO", screen: "flight" })}
        />
      )}
      {state.screen === "flight" && scenario && (
        <FlightScreen
          design={state.design}
          scenario={scenario}
          seed={state.seed}
          onComplete={(timeline) =>
            dispatch({ type: "COMPLETE_FLIGHT", result: timeline.evaluation })
          }
        />
      )}
      {state.screen === "debrief" && scenario && state.result && (
        <DebriefScreen
          design={state.design}
          scenario={scenario}
          result={state.result}
          seed={state.seed}
          onRerun={() => dispatch({ type: "GO_TO", screen: "workshop" })}
        />
      )}
    </main>
  );
}
