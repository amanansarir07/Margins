import { useState } from "react";
import { evaluate } from "../engine/engine";
import type { Design, EvaluationResult, ScenarioRecord } from "../engine/types";
import { Tooltip } from "./Tooltip";

interface ReviewScreenProps {
  design: Design;
  scenario: ScenarioRecord;
  onBack: () => void;
  onLaunch: () => void;
}

function CheckRow({
  label,
  pass,
  margin,
  help,
}: {
  label: string;
  pass: boolean;
  margin?: number;
  help: string;
}) {
  const status = !pass ? "fail" : margin !== undefined && margin < 0.15 ? "warn" : "pass";
  const labelByStatus = {
    pass: "GO",
    warn: "CAUTION",
    fail: "NO-GO",
  };

  return (
    <li className={`check-row ${status}`}>
      <span className="check-indicator" aria-hidden="true">
        {status === "pass" ? "✓" : status === "warn" ? "!" : "×"}
      </span>
      <span className="check-copy">
        <strong>{label}</strong>
        <span>{help}</span>
      </span>
      <span className="check-status">{labelByStatus[status]}</span>
      <Tooltip label={help} />
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

export function ReviewScreen({ design, scenario, onBack, onLaunch }: ReviewScreenProps) {
  const [launched, setLaunched] = useState(false);
  const result = evaluate(design, scenario, 42);
  const canLaunch = hardChecksPass(result);
  const launchReason = result.reasons[0] ?? "Resolve the red checks before launch.";

  return (
    <section className="screen" aria-labelledby="review-title">
      <div className="screen-heading">
        <p className="eyebrow">Mission review</p>
        <h1 id="review-title">Go / No-Go</h1>
      </div>
      <div className="review-grid">
        <article className="panel">
          <div className="card-title-row">
            <div>
              <p className="panel-label">Pre-flight checklist</p>
              <h2>{canLaunch ? "The design is ready to fly." : "The design needs changes."}</h2>
            </div>
            <Tooltip label="Green checks pass, amber checks are close to a limit, and red checks fail." />
          </div>
          <ul className="check-list">
            <CheckRow
              label="Mass"
              pass={result.checks.mass}
              margin={result.resources.mass.margin / result.resources.mass.limit}
              help="The complete spacecraft must fit within the mission mass limit."
            />
            <CheckRow
              label="Power"
              pass={result.checks.power}
              margin={result.resources.power.margin / result.resources.power.limit}
              help="The selected power system must cover the spacecraft load."
            />
            <CheckRow
              label="Data"
              pass={result.checks.data}
              margin={result.resources.data.margin / result.resources.data.limit}
              help="The instruments must stay within the daily data limit."
            />
            <CheckRow
              label="Budget"
              pass={result.checks.budget}
              margin={result.resources.budget.margin / result.resources.budget.limit}
              help="The complete mission must stay within the budget cap."
            />
            <CheckRow
              label="Time"
              pass={result.checks.time}
              margin={result.resources.time.margin / result.resources.time.limit}
              help="Transit and orbit time must fit the program window."
            />
            <CheckRow
              label="Launch mass"
              pass={result.checks.launchCompatibility.mass}
              help="The launch vehicle must carry the complete spacecraft."
            />
            <CheckRow
              label="Launch orbit"
              pass={result.checks.launchCompatibility.orbit}
              help="The launch vehicle must support the selected orbit."
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
        <button className="button button-muted" type="button" onClick={onBack}>
          Back to workshop
        </button>
        <div className="launch-action">
          <button
            className="button button-primary"
            type="button"
            disabled={!canLaunch}
            title={canLaunch ? "Start the mission simulation." : launchReason}
            onClick={() => {
              setLaunched(true);
              onLaunch();
            }}
          >
            Launch mission
          </button>
          {!canLaunch && <p className="launch-reason">{launchReason}</p>}
          {launched && canLaunch && (
            <p className="success-text">Launch approved. Simulation is next.</p>
          )}
        </div>
      </div>
    </section>
  );
}
