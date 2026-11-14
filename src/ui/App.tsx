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
        <TitleScreen
          onStartSolo={() => dispatch({ type: "START_SOLO" })}
          onStartSandbox={() => dispatch({ type: "START_SANDBOX" })}
        />
      )}
      {state.screen === "briefing" && scenario && (
        <BriefingScreen
          scenario={scenario}
          difficulty={state.difficulty}
          sandbox={state.sandbox}
          onScenarioChange={(scenarioId) => {
            const nextScenario = gameData.scenarios.find(
              (item) => item.id === scenarioId,
            );
            const nextOrbit = gameData.orbits.find(
              (item) => item.destinationId === nextScenario?.destinationId,
            );
            const nextLaunchVehicle = gameData.launchVehicles.find(
              (item) =>
                nextScenario &&
                (item.capacityByDestination[nextScenario.destinationId] ?? 0) > 0 &&
                item.supportedOrbits.includes(nextOrbit?.id ?? ""),
            );
            if (nextScenario && nextOrbit && nextLaunchVehicle) {
              dispatch({
                type: "SET_DESIGN",
                design: {
                  ...state.design,
                  scenarioId,
                  orbitId: nextOrbit.id,
                  launchVehicleId: nextLaunchVehicle.id,
                  powerId:
                    nextScenario.requiredPowerKind === "nuclear"
                      ? "nuclear-generator"
                      : state.design.powerId,
                },
              });
            }
          }}
          onDifficultyChange={(difficulty) =>
            dispatch({ type: "SET_DIFFICULTY", difficulty })
          }
          onContinue={() => dispatch({ type: "GO_TO", screen: "workshop" })}
        />
      )}
      {state.screen === "workshop" && scenario && (
        <WorkshopScreen
          design={state.design}
          scenario={scenario}
          options={{ difficulty: state.difficulty, sandbox: state.sandbox }}
          onDesignChange={(design) => dispatch({ type: "SET_DESIGN", design })}
          onContinue={() => dispatch({ type: "GO_TO", screen: "review" })}
        />
      )}
      {state.screen === "review" && scenario && (
        <ReviewScreen
          design={state.design}
          scenario={scenario}
          options={{ difficulty: state.difficulty, sandbox: state.sandbox }}
          onBack={() => dispatch({ type: "GO_TO", screen: "workshop" })}
          onLaunch={() => dispatch({ type: "GO_TO", screen: "flight" })}
        />
      )}
      {state.screen === "flight" && scenario && (
        <FlightScreen
          design={state.design}
          scenario={scenario}
          seed={state.seed}
          options={{ difficulty: state.difficulty, sandbox: state.sandbox }}
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
          options={{ difficulty: state.difficulty, sandbox: state.sandbox }}
          onRerun={() => dispatch({ type: "GO_TO", screen: "workshop" })}
          onApplyFix={(design) => {
            dispatch({ type: "SET_DESIGN", design });
            dispatch({ type: "GO_TO", screen: "workshop" });
          }}
        />
      )}
    </main>
  );
}
