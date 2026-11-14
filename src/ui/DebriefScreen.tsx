import { useMemo } from "react";
import { simulateTimeline, suggestFixes } from "../engine/engine";
import type {
  Design,
  EvaluationResult,
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
  mass: "#73d5ff",
  power: "#fbbf24",
  budget: "#c084fc",
  data: "#86efac",
  comms: "#fb7185",
  time: "#f0abfc",
};

interface DebriefScreenProps {
  design: Design;
  scenario: ScenarioRecord;
  result: EvaluationResult;
  seed: number;
  onRerun: () => void;
  onApplyFix: (design: Design) => void;
}

export function DebriefScreen({
  design,
  scenario,
  result,
  seed,
  onRerun,
  onApplyFix,
}: DebriefScreenProps) {
  const timeline = useMemo(
    () => simulateTimeline(design, scenario, seed),
    [design, scenario, seed],
  );
  const fixes = useMemo(
    () => suggestFixes(design, scenario, seed),
    [design, scenario, seed],
  );

  return (
    <section className="screen debrief-screen" aria-labelledby="debrief-title">
      <div className="screen-heading">
        <p className="eyebrow">Mission debrief</p>
        <h1 id="debrief-title">
          {result.success ? "Mission success" : "Mission failure"}
        </h1>
        <p className="grade-display">
          Grade <strong>{result.grade}</strong> · {result.score}/1000
        </p>
      </div>
      <div className="debrief-grid">
        <article className="panel">
          <p className="panel-label">Score breakdown</p>
          <div className="score-list">
            <ScoreRow label="Checks" value={result.scoreBreakdown.checks} max={600} />
            <ScoreRow
              label="Resource margins"
              value={result.scoreBreakdown.resourceMargins}
              max={200}
            />
            <ScoreRow label="Science" value={result.scoreBreakdown.science} max={100} />
            <ScoreRow
              label="Reliability"
              value={result.scoreBreakdown.reliability}
              max={100}
            />
          </div>
        </article>
        <article className="panel">
          <p className="panel-label">Why</p>
          <ul className="reason-list debrief-reasons">
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>
      </div>
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
      <article className="panel">
        <p className="panel-label">Events</p>
        <ul className="event-list">
          {result.events.map((event) => (
            <li key={event.id}>
              <strong>{event.name}</strong>
              <span>{event.occurred ? event.outcome : "No event occurred."}</span>
              <small>{event.explanation}</small>
            </li>
          ))}
        </ul>
      </article>
      {!result.success && (
        <SuggestedFixCard fixes={fixes} onApplyFix={onApplyFix} />
      )}
      <button className="button button-primary wide-button" type="button" onClick={onRerun}>
        Rerun with changes
      </button>
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
              <button
                className="button button-muted"
                type="button"
                onClick={() => onApplyFix(fix.design)}
              >
                Apply this fix
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ScoreRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="score-row">
      <div className="score-row-heading">
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div className="score-bar">
        <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
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
              stroke="#2a385d"
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
              const x = padding + (index / (timeline.points.length - 1)) * chartWidth;
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
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="chart-legend">
        {resourceNames.map((name) => (
          <span key={name}>
            <i style={{ background: resourceColors[name] }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
