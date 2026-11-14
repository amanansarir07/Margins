import { useEffect, useReducer, useState } from "react";
import { gameData } from "../engine/loadData";
import { BriefingScreen } from "./BriefingScreen";
import { appReducer, initialState } from "./state";
import { TitleScreen } from "./TitleScreen";
import { WorkshopScreen } from "./WorkshopScreen";
import { ReviewScreen } from "./ReviewScreen";
import { DebriefScreen } from "./DebriefScreen";
import { FlightScreen } from "./FlightScreen";
import { KitScreen } from "./KitScreen";
import { PatchWallScreen } from "./PatchWallScreen";
import {
  loadDailyProgress,
  loadMissionStars,
  saveBestScoreForScenario,
  recordDailyCompletion,
  saveBestScore,
  saveLastDesign,
  saveMissionStars,
} from "./storage";
import { getDailyMission } from "./daily";

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [missionStars, setMissionStars] = useState(loadMissionStars);
  const [dailyProgress, setDailyProgress] = useState(loadDailyProgress);
  const dailyMission = getDailyMission();
  const scenario = gameData.scenarios.find(
    (item) => item.id === state.design.scenarioId,
  );

  useEffect(() => {
    saveLastDesign(state.design);
  }, [state.design]);

  useEffect(() => {
    if (state.result) {
      saveBestScore(state.result.score);
      saveBestScoreForScenario(state.design.scenarioId, state.result.score);
    }
  }, [state.design.scenarioId, state.result]);

  useEffect(() => {
    if (!state.result || !scenario) return;
    const margins = Object.values(state.result.resources);
    const stars =
      (state.result.success ? 1 : 0) +
      (state.result.resources.budget.used < scenario.limits.budgetM ? 1 : 0) +
      (margins.every(
        (resource) => resource.margin / Math.max(resource.limit, 1) > 0.15,
      )
        ? 1
        : 0) +
      (state.result.contract?.bonusStars ?? 0);
    saveMissionStars(scenario.id, stars);
    setMissionStars((current) => ({
      ...current,
      [scenario.id]: Math.max(current[scenario.id] ?? 0, stars),
    }));
  }, [scenario, state.result]);

  useEffect(() => {
    if (!state.dailyMission || !state.result) return;
    const progress = recordDailyCompletion(state.dailyMission.date);
    setDailyProgress(progress);
  }, [state.dailyMission, state.result]);

  if (window.location.pathname === "/kit") {
    return <KitScreen />;
  }
  if (window.location.pathname === "/patch-wall") {
    return <PatchWallScreen />;
  }

  return (
    <main className="app">
      {state.screen === "title" && (
        <TitleScreen
          missionStars={missionStars}
          selectedScenarioId={state.design.scenarioId}
          dailyMission={dailyMission}
          dailyStreak={dailyProgress.currentStreak}
          difficulty={state.difficulty}
          onSelectScenario={(scenarioId) => {
            dispatch({
              type: "SET_DESIGN",
              design: { ...state.design, scenarioId },
            });
            dispatch({ type: "START_SOLO" });
          }}
          onDifficultyChange={(difficulty) =>
            dispatch({ type: "SET_DIFFICULTY", difficulty })
          }
          onStartQuickMission={() => dispatch({ type: "START_SOLO" })}
          onStartPrepMission={() => dispatch({ type: "GO_TO", screen: "workshop" })}
          onStartDaily={() =>
            dispatch({ type: "START_DAILY", mission: dailyMission })
          }
        />
      )}
      {state.screen === "briefing" && scenario && (
        <BriefingScreen
          scenario={scenario}
          seed={state.seed}
          options={{
            difficulty: state.difficulty,
            sandbox: state.sandbox,
            twistId: state.dailyMission?.twistId,
            contractId: state.dailyMission?.contractId,
          }}
          sandbox={state.sandbox}
          onContinue={() => dispatch({ type: "GO_TO", screen: "workshop" })}
        />
      )}
      {state.screen === "workshop" && scenario && (
        <WorkshopScreen
          design={state.design}
          scenario={scenario}
          options={{
            difficulty: state.difficulty,
            sandbox: state.sandbox,
            twistId: state.dailyMission?.twistId,
            contractId: state.dailyMission?.contractId,
          }}
          seed={state.seed}
          onDesignChange={(design) => dispatch({ type: "SET_DESIGN", design })}
          onContinue={() => dispatch({ type: "GO_TO", screen: "review" })}
        />
      )}
      {state.screen === "review" && scenario && (
        <ReviewScreen
          design={state.design}
          scenario={scenario}
          options={{
            difficulty: state.difficulty,
            sandbox: state.sandbox,
            twistId: state.dailyMission?.twistId,
            contractId: state.dailyMission?.contractId,
          }}
          onBack={() => dispatch({ type: "GO_TO", screen: "workshop" })}
          onLaunch={() => dispatch({ type: "GO_TO", screen: "flight" })}
        />
      )}
      {state.screen === "flight" && scenario && (
        <FlightScreen
          design={state.design}
          scenario={scenario}
          seed={state.seed}
          options={{
            difficulty: state.difficulty,
            sandbox: state.sandbox,
            twistId: state.dailyMission?.twistId,
            contractId: state.dailyMission?.contractId,
          }}
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
          dailyCode={state.dailyMission?.code}
          options={{
            difficulty: state.difficulty,
            sandbox: state.sandbox,
            twistId: state.dailyMission?.twistId,
            contractId: state.dailyMission?.contractId,
          }}
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
