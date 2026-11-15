import { gameData } from "../engine/loadData";
import type { MissionOptions, ObjectiveRecord, ScenarioRecord } from "../engine/types";

interface BriefingScreenProps {
  scenario: ScenarioRecord;
  sandbox: boolean;
  options: MissionOptions;
  objectiveId: string;
  onSelectObjective: (objectiveId: string) => void;
  onContinue: () => void;
}

export function BriefingScreen({
  scenario,
  sandbox,
  options,
  objectiveId,
  onSelectObjective,
  onContinue,
}: BriefingScreenProps) {
  const objectives = gameData.objectives.filter(
    (objective) => objective.scenarioId === scenario.id,
  );
  const selectedObjective =
    objectives.find((objective) => objective.id === objectiveId) ?? objectives[0];
  const requiredInstruments = selectedObjective?.requiredInstrumentAnyOf.length
    ? selectedObjective.requiredInstrumentAnyOf
    : selectedObjective?.requiredInstruments ?? scenario.requiredInstrumentAnyOf;

  return (
    <section className="screen" aria-labelledby="briefing-title">
      <div className="screen-heading">
        <p className="eyebrow">Mission briefing</p>
        <h1 id="briefing-title">{scenario.name}</h1>
      </div>
      <div className="briefing-grid">
        <article className="panel briefing-objective">
          <p className="panel-label">Objective · {scenario.source}</p>
          <h2>{selectedObjective?.description ?? scenario.objective}</h2>
          <div className="decision-value">
          Science goal: <strong>{sandbox ? "None" : `${selectedObjective?.scienceGoal ?? scenario.scienceGoal} points`}</strong>
          </div>
          <p className="panel-label">Requirements</p>
          <div className="decision-value">
            {sandbox
              ? "No instrument requirement"
              : requiredNamesFor(requiredInstruments).join(" or ") || "None"}
          </div>
        </article>
        <article className="panel">
          <p className="panel-label">Mission constraints</p>
          <dl className="constraint-list">
            <div>
              <dt>Budget cap</dt>
              <dd>
                {sandbox
                  ? "No cap"
                  : `$${(
                      scenario.limits.budgetM *
                      (selectedObjective?.budgetMultiplier ?? 1)
                    ).toFixed(0)}M`}
              </dd>
            </div>
            <div>
              <dt>Program time</dt>
              <dd>
                {(
                  scenario.maxProgramMonths *
                  (selectedObjective?.timeMultiplier ?? 1)
                ).toFixed(0)}{" "}
                months + transit
              </dd>
            </div>
          </dl>
          <p className="panel-label">Critical resources</p>
          <div className="tag-list">
            {(selectedObjective?.criticalResources ?? scenario.criticalResources).map((resource) => (
              <span className="critical-tag" key={resource}>
                {resource}
              </span>
            ))}
          </div>
          {objectives.length > 0 && (
            <div className="objective-picker" aria-label="Mission objective">
              <p className="panel-label">Choose objective</p>
              <div className="objective-options">
                {objectives.map((objective) => (
                  <ObjectiveButton
                    key={objective.id}
                    objective={objective}
                    selected={objective.id === selectedObjective?.id}
                    onSelect={onSelectObjective}
                  />
                ))}
              </div>
            </div>
          )}
          {scenario.difficultyHints?.[0] && (
            <div className="decision-value">{scenario.difficultyHints[0]}</div>
          )}
          {options.twistId && (
            <div className="daily-briefing">
              <p className="panel-label">Daily twist</p>
              <strong>{gameData.twists.find((twist) => twist.id === options.twistId)?.name}</strong>
              <span>{gameData.twists.find((twist) => twist.id === options.twistId)?.description}</span>
            </div>
          )}
          {options.contractId && (
            <div className="daily-briefing">
              <p className="panel-label">Contract · +1 star</p>
              <strong>{gameData.contracts.find((contract) => contract.id === options.contractId)?.name}</strong>
              <span>{gameData.contracts.find((contract) => contract.id === options.contractId)?.description}</span>
            </div>
          )}
        </article>
      </div>
      <button className="button button-primary wide-button" type="button" onClick={onContinue}>
        BUILD THIS MISSION
      </button>
    </section>
  );
}

function requiredNamesFor(ids: string[]) {
  return ids
    .map((id) => gameData.instruments.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

function ObjectiveButton({
  objective,
  selected,
  onSelect,
}: {
  objective: ObjectiveRecord;
  selected: boolean;
  onSelect: (objectiveId: string) => void;
}) {
  return (
    <button
      className={`objective-option${selected ? " selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(objective.id)}
    >
      <strong>{objective.name}</strong>
      <span>{objective.description}</span>
      <small>{objective.scienceGoal} SCIENCE · {objective.criticalResources.join(" / ")}</small>
    </button>
  );
}
