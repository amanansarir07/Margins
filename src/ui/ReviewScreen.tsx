import { useState } from "react";
import { vibrate } from "../audio/haptics";
import { playSound } from "../audio/sound";
import { evaluate } from "../engine/engine";
import type {
  Design,
  EvaluationResult,
  MissionOptions,
  ScenarioRecord,
} from "../engine/types";
import { Button } from "./foundation/Button";
import { Tooltip } from "./Tooltip";

function CheckRow({
  label,
  pass,
  margin,
  help,
  acknowledged,
  onAcknowledge,
}: {
  label: string;
  pass: boolean;
  margin?: number;
  help: string;
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  const status = !pass
    ? "fail"
    : margin !== undefined && margin < 0.15
      ? "warn"
      : "pass";
  const labelByStatus = {
    pass: "GO",
    warn: "CAUTION",
    fail: "NO-GO",
  };

  return (
    <li>
      <button
        className={`check-row ${status}${acknowledged ? " acknowledged" : ""}`}
        type="button"
        title={help}
        onClick={onAcknowledge}
      >
        <span className="check-indicator" aria-hidden="true">
          {status === "pass" ? "✓" : status === "warn" ? "!" : "×"}
        </span>
        <span className="check-copy">
          <strong>{label}</strong>
          <span>{help}</span>
        </span>
        <span className="check-status">{labelByStatus[status]}</span>
        <Tooltip label={help} />
      </button>
    </li>
  );
}

function hardChecksPass(result: EvaluationResult) {
  return (
    result.checks.mass &&
    result.checks.power &&
    result.checks.data &&
    result.checks.budget &&
    result.checks.time &&
    result.checks.launchCompatibility.pass
  );
}

export function ReviewScreen({
  design,
  scenario,
  options,
  onBack,
  onLaunch,
}: {
  design: Design;
  scenario: ScenarioRecord;
  options: MissionOptions;
  onBack: () => void;
  onLaunch: () => void;
}) {
  const [launched, setLaunched] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const result = evaluate(design, scenario, 42, options);
  const canLaunch = hardChecksPass(result);
  const launchReason =
    result.reasons[0] ?? "Resolve the red checks before launch.";

  const acknowledge = (label: string, pass: boolean) => {
    playSound(pass ? "click" : "warning");
    vibrate(pass ? 8 : 20);
    if (pass) {
      setAcknowledged((current) => ({ ...current, [label]: !current[label] }));
    }
  };

  return (
    <section className="screen" aria-labelledby="review-title">
      <div className="screen-heading">
        <p className="eyebrow">Margins / launch review</p>
        <h1 id="review-title">Pre-launch checklist</h1>
      </div>
      <div className="review-grid">
        <article className="panel">
          <div className="card-title-row">
            <div>
              <p className="panel-label">Click each green line</p>
              <h2>{canLaunch ? "Ready for launch." : "Resolve red lines."}</h2>
            </div>
            <Tooltip label="Click a passing line to confirm it before launch." />
          </div>
          <ul className="check-list">
            <CheckRow
              label="Mass"
              pass={result.checks.mass}
              margin={result.resources.mass.margin / result.resources.mass.limit}
              help="The complete spacecraft must fit within the mission mass limit."
              acknowledged={Boolean(acknowledged.Mass)}
              onAcknowledge={() => acknowledge("Mass", result.checks.mass)}
            />
            <CheckRow
              label="Power"
              pass={result.checks.power}
              margin={result.resources.power.margin / result.resources.power.limit}
              help="The selected power system must cover the spacecraft load."
              acknowledged={Boolean(acknowledged.Power)}
              onAcknowledge={() => acknowledge("Power", result.checks.power)}
            />
            <CheckRow
              label="Data"
              pass={result.checks.data}
              margin={result.resources.data.margin / result.resources.data.limit}
              help="The instruments must stay within the daily data limit."
              acknowledged={Boolean(acknowledged.Data)}
              onAcknowledge={() => acknowledge("Data", result.checks.data)}
            />
            <CheckRow
              label="Budget"
              pass={result.checks.budget}
              margin={result.resources.budget.margin / result.resources.budget.limit}
              help="The complete mission must stay within the budget cap."
              acknowledged={Boolean(acknowledged.Budget)}
              onAcknowledge={() => acknowledge("Budget", result.checks.budget)}
            />
            <CheckRow
              label="Time"
              pass={result.checks.time}
              margin={result.resources.time.margin / result.resources.time.limit}
              help="Transit and orbit time must fit the program window."
              acknowledged={Boolean(acknowledged.Time)}
              onAcknowledge={() => acknowledge("Time", result.checks.time)}
            />
            <CheckRow
              label="Launch mass"
              pass={result.checks.launchCompatibility.mass}
              help="The launch vehicle must carry the complete spacecraft."
              acknowledged={Boolean(acknowledged["Launch mass"])}
              onAcknowledge={() =>
                acknowledge("Launch mass", result.checks.launchCompatibility.mass)
              }
            />
            <CheckRow
              label="Launch orbit"
              pass={result.checks.launchCompatibility.orbit}
              help="The launch vehicle must support the selected orbit."
              acknowledged={Boolean(acknowledged["Launch orbit"])}
              onAcknowledge={() =>
                acknowledge("Launch orbit", result.checks.launchCompatibility.orbit)
              }
            />
          </ul>
        </article>
        <aside className="panel review-summary">
          <p className="panel-label">Mission forecast</p>
          <div className="summary-stat">
            <span>Science points</span>
            <strong>{result.sciencePoints}</strong>
          </div>
          <div className="summary-stat">
            <span>Reliability</span>
            <strong>{Math.round(result.reliability * 100)}%</strong>
          </div>
          <div className="summary-stat">
            <span>Score</span>
            <strong>{result.score}/1000</strong>
          </div>
          <p className="panel-label reasons-label">Why</p>
          <ul className="reason-list">
            {result.reasons.slice(0, 4).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="review-actions">
        <Button className="button-muted" type="button" onClick={onBack}>
          RETURN TO WORKBENCH
        </Button>
        <div className="launch-action">
          <Button
            className="button-primary launch-button"
            type="button"
            disabled={!canLaunch}
            title={canLaunch ? "Start the mission simulation." : launchReason}
            onClick={() => {
              setLaunched(true);
              onLaunch();
            }}
          >
            LAUNCH MISSION
          </Button>
          {!canLaunch && <p className="launch-reason">{launchReason}</p>}
          {launched && canLaunch && (
            <p className="success-text">Launch approved.</p>
          )}
        </div>
      </div>
    </section>
  );
}
