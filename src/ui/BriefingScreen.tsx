import { gameData } from "../engine/loadData";
import type { Difficulty, ScenarioRecord } from "../engine/types";

interface BriefingScreenProps {
  scenario: ScenarioRecord;
  difficulty: Difficulty;
  sandbox: boolean;
  onScenarioChange: (scenarioId: string) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onContinue: () => void;
}

function SourceTag({ source }: { source: string }) {
  return <span className="source-tag">{source}</span>;
}

function FactCard({
  label,
  value,
  unit,
  source,
}: {
  label: string;
  value: number;
  unit: string;
  source: string;
}) {
  return (
    <li className="fact-item">
      <span>{label}</span>
      <strong>
        {value} {unit}
      </strong>
      <SourceTag source={source} />
    </li>
  );
}

export function BriefingScreen({
  scenario,
  difficulty,
  sandbox,
  onScenarioChange,
  onDifficultyChange,
  onContinue,
}: BriefingScreenProps) {
  const destination = gameData.destinations.find(
    (item) => item.id === scenario.destinationId,
  );
  const requiredNames = scenario.requiredInstrumentAnyOf
    .map((id) => gameData.instruments.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  if (!destination) {
    return <p>Destination data is unavailable.</p>;
  }

  return (
    <section className="screen" aria-labelledby="briefing-title">
      <div className="screen-heading">
        <p className="eyebrow">Mission briefing</p>
        <h1 id="briefing-title">{scenario.name}</h1>
      </div>
      <div className="briefing-grid">
        <article className="panel">
          <p className="panel-label">Mission setup</p>
          <label className="field-label" htmlFor="scenario-select">
            Destination scenario
          </label>
          <select
            className="select-field"
            id="scenario-select"
            value={scenario.id}
            onChange={(event) => onScenarioChange(event.target.value)}
          >
            {gameData.scenarios
              .filter((item) => item.enabled)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <label className="field-label" htmlFor="difficulty-select">
            Difficulty
          </label>
          <select
            className="select-field"
            disabled={sandbox}
            id="difficulty-select"
            value={difficulty}
            onChange={(event) =>
              onDifficultyChange(event.target.value as Difficulty)
            }
          >
            <option value="cadet">Cadet · simple parts, hints on</option>
            <option value="engineer">Engineer · normal</option>
            <option value="veteran">Veteran · tight margins, score ×1.35</option>
          </select>
          {sandbox && (
            <p className="hint-text">
              Sandbox is active: no budget cap and no science goal.
            </p>
          )}
        </article>
        <article className="panel briefing-objective">
          <p className="panel-label">Objective</p>
          <h2>{scenario.objective}</h2>
          <p className="muted">
            Science goal:{" "}
            <strong>{sandbox ? "None in Sandbox" : `${scenario.scienceGoal} points`}</strong>
          </p>
          <p className="panel-label">Requirements</p>
          <p>
            {sandbox ? (
              <strong>No instrument requirement in Sandbox</strong>
            ) : (
              <>
                Choose at least one:{" "}
                <strong>{requiredNames.join(" or ") || "No instrument requirement"}</strong>
              </>
            )}
          </p>
        </article>
        <article className="panel">
          <p className="panel-label">Mission constraints</p>
          <dl className="constraint-list">
            <div>
              <dt>Budget cap</dt>
              <dd>{sandbox ? "No cap" : `$${scenario.limits.budgetM}M`}</dd>
            </div>
            <div>
              <dt>Program time</dt>
              <dd>{scenario.maxProgramMonths} months + transit</dd>
            </div>
          </dl>
          <p className="panel-label">Critical resources</p>
          <div className="tag-list">
            {scenario.criticalResources.map((resource) => (
              <span className="critical-tag" key={resource}>
                {resource}
              </span>
            ))}
          </div>
          {difficulty === "cadet" &&
            scenario.difficultyHints &&
            scenario.difficultyHints.length > 0 && (
            <>
              <p className="panel-label hint-heading">Mission hints</p>
              <ul className="hint-list">
                {scenario.difficultyHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </>
          )}
        </article>
        <article className="panel destination-card">
          <div className="card-title-row">
            <div>
              <p className="panel-label">Destination fact card</p>
              <h2>{destination.name}</h2>
            </div>
            <SourceTag source={destination.source} />
          </div>
          <p className="muted">{destination.description}</p>
          <ul className="fact-list">
            <FactCard
              label="Distance from Earth"
              value={destination.distanceFromEarth}
              unit="km"
              source={destination.source}
            />
            <FactCard
              label="One-way signal time"
              value={destination.oneWaySignalTime}
              unit="min"
              source={destination.source}
            />
            <FactCard
              label="Typical trip"
              value={destination.typicalTripTime}
              unit="days"
              source={destination.source}
            />
            <FactCard
              label="Surface gravity"
              value={destination.surfaceGravity}
              unit="m/s²"
              source={destination.source}
            />
            <FactCard
              label="Sunlight compared to Earth"
              value={destination.sunlightComparedToEarth}
              unit="×"
              source={destination.source}
            />
          </ul>
        </article>
      </div>
      <button className="button button-primary wide-button" type="button" onClick={onContinue}>
        Open design workshop
      </button>
    </section>
  );
}
