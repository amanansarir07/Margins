import { useEffect, useMemo, useState } from "react";
import { simulateTimeline, suggestFixes } from "../engine/engine";
import { gameData } from "../engine/loadData";
import { playSound } from "../audio/sound";
import { Button } from "./foundation/Button";
import { Stamp } from "./foundation/Stamp";
import {
  createMissionPatch,
  missionName,
  saveSvgAsImage,
} from "./missionPatch";
import {
  saveMissionPatch,
  loadAxisBests,
  saveAxisBests,
  type AxisName,
  type SavedMissionPatch,
} from "./storage";
import {
  DesignSpaceAxes,
  DesignSpaceChart,
  getAxisValues,
} from "./DesignSpaceChart";
import type {
  Design,
  EvaluationResult,
  MissionOptions,
  ResourceName,
  ScenarioRecord,
  SuggestedFix,
} from "../engine/types";

const resourceNames: ResourceName[] = [
  "mass",
  "power",
  "budget",
  "data",
  "comms",
  "time",
];

const resourceColors: Record<ResourceName, string> = {
  mass: "#2B5BD7",
  power: "#FFC20E",
  budget: "#E63B2E",
  data: "#2EC4A6",
  comms: "#14213D",
  time: "#C9D1D9",
};

function calculateStars(result: EvaluationResult, scenario: ScenarioRecord) {
  const margins = Object.values(result.resources);
  return (
    (result.success ? 1 : 0) +
    (result.resources.budget.used < scenario.limits.budgetM ? 1 : 0) +
    (margins.every(
      (resource) => resource.margin / Math.max(resource.limit, 1) > 0.15,
    )
      ? 1
      : 0)
  );
}

interface DebriefScreenProps {
  design: Design;
  scenario: ScenarioRecord;
  result: EvaluationResult;
  seed: number;
  options: MissionOptions;
  onRerun: () => void;
  onApplyFix: (design: Design) => void;
}

export function DebriefScreen({
  design,
  scenario,
  result,
  seed,
  options,
  onRerun,
  onApplyFix,
}: DebriefScreenProps) {
  const timeline = useMemo(
    () => simulateTimeline(design, scenario, seed, 32, options),
    [design, scenario, seed, options],
  );
  const fixes = useMemo(
    () => suggestFixes(design, scenario, seed, options),
    [design, scenario, seed, options],
  );
  const instrumentNames = design.instrumentIds.map(
    (id) => gameData.instruments.find((instrument) => instrument.id === id)?.name ?? id,
  );
  const stars = calculateStars(result, scenario);
  const patchSvg = useMemo(
    () => createMissionPatch(design, scenario, result, instrumentNames, stars),
    [design, instrumentNames, result, scenario, stars],
  );
  const patchTitle = missionName(design, scenario, instrumentNames);
  const [visibleStars, setVisibleStars] = useState(0);
  const [scoreShown, setScoreShown] = useState(0);
  const [patchError, setPatchError] = useState("");
  const [hint, setHint] = useState("");
  const [newRecords, setNewRecords] = useState<AxisName[]>([]);

  useEffect(() => {
    setVisibleStars(0);
    setScoreShown(0);
    const starTimers = Array.from({ length: stars }, (_, index) =>
      window.setTimeout(() => {
        setVisibleStars(index + 1);
        playSound("success");
      }, 500 + index * 480),
    );
    const scoreStart = 500 + stars * 480;
    const scoreStartTime = performance.now() + scoreStart;
    let frame = 0;
    const countScore = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - scoreStartTime) / 1000));
      setScoreShown(Math.round(result.score * progress));
      if (progress < 1) frame = requestAnimationFrame(countScore);
    };
    const scoreTimer = window.setTimeout(
      () => requestAnimationFrame(countScore),
      scoreStart,
    );
    return () => {
      starTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(scoreTimer);
      cancelAnimationFrame(frame);
    };
  }, [result.score, stars]);

  useEffect(() => {
    const patch: SavedMissionPatch = {
      id: `${scenario.id}-${seed}-${result.score}`,
      scenarioId: scenario.id,
      missionName: patchTitle,
      svg: patchSvg,
      stars,
      score: result.score,
      createdAt: new Date().toISOString(),
    };
    saveMissionPatch(patch);
  }, [patchSvg, patchTitle, result.score, scenario.id, seed, stars]);

  useEffect(() => {
    const values = getAxisValues(result);
    const current = loadAxisBests();
    const improved = (Object.entries(values) as Array<[AxisName, number]>).filter(
      ([axis, value]) =>
        current[axis] === undefined ||
        (axis === "cost" ? value < current[axis] : value > current[axis]),
    );
    if (improved.length > 0) {
      saveAxisBests(Object.fromEntries(improved));
      setNewRecords(improved.map(([axis]) => axis));
      playSound("success");
    }
  }, [result]);

  const savePatchImage = async () => {
    setPatchError("");
    try {
      await saveSvgAsImage(patchSvg, `${patchTitle.replaceAll(" ", "-").toLowerCase()}.png`);
    } catch (error) {
      console.error("Could not save the mission patch image.", error);
      setPatchError("Patch image failed. Try the button again.");
    }
  };

  return (
    <section className="screen debrief-screen" aria-labelledby="debrief-title">
      <header className="debrief-hero">
        <div>
          <p className="eyebrow">Margins / debrief</p>
          <h1 id="debrief-title">
            {result.success ? "Mission success" : "Mission failure"}
          </h1>
        </div>
        <Stamp tone={result.success ? "pass" : "fail"} sound>
          {result.success ? "MISSION PASS" : "MISSION FAIL"}
        </Stamp>
      </header>
      <div className="debrief-score-row">
        <div className="debrief-stars" aria-label={`${visibleStars} of 3 stars earned`}>
          {[0, 1, 2].map((star) => (
            <span className={star < visibleStars ? "star-earned" : ""} key={star}>
              {star < visibleStars ? "★" : "☆"}
            </span>
          ))}
        </div>
        {newRecords.length > 0 && (
          <div className="axis-record-stamp">
            <Stamp tone="pass" sound>
              NEW RECORD: {newRecords.join(", ")}
            </Stamp>
          </div>
        )}
        <article className="panel axis-panel">
          <p className="panel-label">Design-space score axes</p>
          <DesignSpaceAxes scenario={scenario} result={result} />
        </article>
        <div className="debrief-score">
          <span>SCORE</span>
          <strong>{scoreShown}</strong>
          <small>/ 1000</small>
        </div>
      </div>
      <div className="debrief-grid">
        <article className="panel patch-panel">
          <p className="panel-label">Mission patch</p>
          <h2>{patchTitle}</h2>
          <div
            className="mission-patch-preview"
            dangerouslySetInnerHTML={{ __html: patchSvg }}
          />
          <Button className="button-primary" type="button" onClick={savePatchImage}>
            SAVE PATCH AS IMAGE
          </Button>
          {patchError && <p className="launch-reason">{patchError}</p>}
        </article>
        <article className="panel">
          <p className="panel-label">Score breakdown</p>
          <div className="score-inline">
            <span>Checks {result.scoreBreakdown.checks}</span>
            <span>Margins {result.scoreBreakdown.resourceMargins}</span>
            <span>Science {result.scoreBreakdown.science}</span>
            <span>Reliability {result.scoreBreakdown.reliability}</span>
          </div>
        </article>
      </div>
      <article className="panel">
        <p className="panel-label">Why</p>
        <ul className="reason-list debrief-reasons">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </article>
      <article className="panel chart-panel">
        <div className="card-title-row">
          <div>
            <p className="panel-label">Mission telemetry</p>
            <h2>Resources over time</h2>
          </div>
          <span className="muted">Used / limit</span>
        </div>
        <ResourceChart timeline={timeline} />
      </article>
      <article className="panel chart-panel design-space-panel">
        <div className="card-title-row">
          <div>
            <p className="panel-label">Design space</p>
            <h2>Cost / science frontier</h2>
          </div>
          <span className="muted">Successful designs</span>
        </div>
        <DesignSpaceChart
          scenario={scenario}
          design={design}
          result={result}
          patchSvg={patchSvg}
          onHint={setHint}
        />
        {hint && <p className="chart-hint" aria-live="polite">{hint}</p>}
      </article>
      {!result.success && <SuggestedFixCard fixes={fixes} onApplyFix={onApplyFix} />}
      <Button className="button-primary wide-button" type="button" onClick={onRerun}>
        RERUN WITH CHANGES
      </Button>
    </section>
  );
}

function SuggestedFixCard({
  fixes,
  onApplyFix,
}: {
  fixes: SuggestedFix[];
  onApplyFix: (design: Design) => void;
}) {
  return (
    <article className="panel fix-panel">
      <p className="panel-label">Mission coach</p>
      <h2>What would have saved you</h2>
      {fixes.length === 0 ? (
        <p className="muted">No small change could rescue this design.</p>
      ) : (
        <div className="fix-list">
          {fixes.map((fix) => (
            <div className="fix-item" key={fix.label}>
              <div>
                <strong>{fix.label}</strong>
                <p>{fix.explanation}</p>
                <span className="fix-impact">
                  Cost {fix.cost >= 0 ? "+" : ""}
                  {fix.cost.toFixed(1)} $M · Mass {fix.massImpact >= 0 ? "+" : ""}
                  {fix.massImpact.toFixed(1)} kg · Power margin{" "}
                  {fix.powerImpact >= 0 ? "+" : ""}
                  {fix.powerImpact.toFixed(1)} W
                </span>
              </div>
              <Button
                className="button-muted"
                type="button"
                onClick={() => onApplyFix(fix.design)}
              >
                APPLY THIS FIX
              </Button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ResourceChart({
  timeline,
}: {
  timeline: ReturnType<typeof simulateTimeline>;
}) {
  const width = 720;
  const height = 280;
  const padding = 32;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  return (
    <div className="chart-wrap">
      <svg
        className="resource-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Resource usage over the mission timeline"
      >
        {[0, 0.5, 1].map((line) => {
          const y = padding + chartHeight * line;
          return (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#14213D"
              strokeDasharray="3 5"
            />
          );
        })}
        {resourceNames.map((name) => {
          const points = timeline.points
            .map((point, index) => {
              const resource = point.resources[name];
              const ratio =
                resource.limit > 0 ? Math.min(1, resource.used / resource.limit) : 1;
              const x =
                padding + (index / (timeline.points.length - 1)) * chartWidth;
              const y = padding + (1 - ratio) * chartHeight;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={name}
              fill="none"
              points={points}
              stroke={resourceColors[name]}
              strokeWidth="3"
            />
          );
        })}
      </svg>
    </div>
  );
}
