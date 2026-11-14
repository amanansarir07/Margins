import { gameData } from "../engine/loadData";
import type { MissionOptions, ScenarioRecord } from "../engine/types";

interface BriefingScreenProps {
  scenario: ScenarioRecord;
  sandbox: boolean;
  options: MissionOptions;
  onContinue: () => void;
}

export function BriefingScreen({
  scenario,
  sandbox,
  options,
  onContinue,
}: BriefingScreenProps) {
  const requiredNames = scenario.requiredInstrumentAnyOf
    .map((id) => gameData.instruments.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <section className="screen" aria-labelledby="briefing-title">
      <div className="screen-heading">
        <p className="eyebrow">Mission briefing</p>
        <h1 id="briefing-title">{scenario.name}</h1>
      </div>
      <div className="briefing-grid">
        <article className="panel briefing-objective">
          <p className="panel-label">Objective · {scenario.source}</p>
          <h2>{scenario.objective}</h2>
          <div className="decision-value">
            Science goal: <strong>{sandbox ? "None" : `${scenario.scienceGoal} points`}</strong>
          </div>
          <p className="panel-label">Requirements</p>
          <div className="decision-value">
            {sandbox ? "No instrument requirement" : requiredNames.join(" or ") || "None"}
          </div>
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
