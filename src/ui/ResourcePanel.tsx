import { previewResources } from "../engine/engine";
import type { Design, ResourceName, ScenarioRecord } from "../engine/types";
import { Tooltip } from "./Tooltip";

const resourceLabels: Record<ResourceName, string> = {
  mass: "Mass",
  power: "Power",
  budget: "Budget",
  data: "Data",
  comms: "Comms",
  time: "Time",
};

const resourceUnits: Record<ResourceName, string> = {
  mass: "kg",
  power: "W",
  budget: "$M",
  data: "Mbit/day",
  comms: "Mbit/day",
  time: "days",
};

const resourceHelp: Record<ResourceName, string> = {
  mass: "The spacecraft mass, including propellant.",
  power: "Power used by the spacecraft compared with available power.",
  budget: "The mission cost compared with its budget cap.",
  data: "Science data generated each day.",
  comms: "Science data that must be sent home each day.",
  time: "Transit and orbit time compared with the program limit.",
};

function getBarClass(used: number, limit: number) {
  const ratio = limit > 0 ? used / limit : 1;
  if (ratio > 0.9) return "resource-bar-fill danger";
  if (ratio > 0.75) return "resource-bar-fill warning";
  return "resource-bar-fill";
}

export function ResourcePanel({
  design,
  scenario,
}: {
  design: Design;
  scenario: ScenarioRecord;
}) {
  const preview = previewResources(design, scenario);

  return (
    <aside className="resource-panel panel" aria-labelledby="resources-title">
      <div className="card-title-row">
        <div>
          <p className="panel-label">Live design check</p>
          <h2 id="resources-title">Resource margins</h2>
        </div>
        <Tooltip label="These bars update as you change the mission design." />
      </div>
      <div className="resource-list">
        {(Object.keys(resourceLabels) as ResourceName[]).map((name) => {
          const resource = preview.resources[name];
          const width = Math.min(
            100,
            resource.limit > 0 ? (resource.used / resource.limit) * 100 : 100,
          );
          return (
            <div className="resource-row" key={name}>
              <div className="resource-heading">
                <span>
                  {resourceLabels[name]}{" "}
                  <Tooltip label={resourceHelp[name]} />
                </span>
                <strong>
                  {resource.used.toFixed(1)} / {resource.limit.toFixed(1)}{" "}
                  {resourceUnits[name]}
                </strong>
              </div>
              <div
                className="resource-bar"
                role="progressbar"
                aria-label={`${resourceLabels[name]} usage`}
                aria-valuemin={0}
                aria-valuemax={resource.limit}
                aria-valuenow={resource.used}
              >
                <span
                  className={getBarClass(resource.used, resource.limit)}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="warning-list" aria-live="polite">
        {preview.warnings.length === 0 ? (
          <p className="success-text">No immediate resource warnings.</p>
        ) : (
          <ul>
            {preview.warnings.slice(0, 4).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
