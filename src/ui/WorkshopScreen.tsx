import { gameData } from "../engine/loadData";
import { useState } from "react";
import type { Design, ScenarioRecord } from "../engine/types";
import { ResourcePanel } from "./ResourcePanel";
import { Tooltip } from "./Tooltip";

type TabId =
  | "bus"
  | "power"
  | "comms"
  | "computer"
  | "attitude"
  | "instruments"
  | "launch"
  | "orbit";

const tabs: { id: TabId; label: string }[] = [
  { id: "bus", label: "Spacecraft bus" },
  { id: "power", label: "Power" },
  { id: "comms", label: "Communications" },
  { id: "computer", label: "Computer" },
  { id: "attitude", label: "Attitude control" },
  { id: "instruments", label: "Instruments" },
  { id: "launch", label: "Launch vehicle" },
  { id: "orbit", label: "Orbit" },
];

interface WorkshopScreenProps {
  design: Design;
  scenario: ScenarioRecord;
  onDesignChange: (design: Design) => void;
  onContinue: () => void;
}

function ChoiceCard({
  id,
  name,
  summary,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  summary: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={`choice-card${selected ? " selected" : ""}`}>
      <input
        type="radio"
        name="component-choice"
        value={id}
        checked={selected}
        onChange={onSelect}
      />
      <span className="choice-card-copy">
        <strong>{name}</strong>
        <span>{summary}</span>
      </span>
      <Tooltip label={summary} />
    </label>
  );
}

export function WorkshopScreen({
  design,
  scenario,
  onDesignChange,
  onContinue,
}: WorkshopScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>("bus");

  const update = (patch: Partial<Design>) => onDesignChange({ ...design, ...patch });

  const renderTab = () => {
    switch (activeTab) {
      case "bus":
        return (
          <ChoiceList
            items={gameData.spacecraftBus}
            selected={design.spacecraftBusId}
            onSelect={(id) => update({ spacecraftBusId: id })}
            summary={(item) => `${item.massKg} kg · ${item.powerW} W · $${item.costM}M`}
          />
        );
      case "power":
        return (
          <ChoiceList
            items={gameData.power.filter((item) => item.id !== "no-power")}
            selected={design.powerId}
            onSelect={(id) => update({ powerId: id })}
            summary={(item) => `${item.powerW} W · ${item.massKg} kg · $${item.costM}M`}
          />
        );
      case "comms":
        return (
          <ChoiceList
            items={gameData.comms}
            selected={design.commsId}
            onSelect={(id) => update({ commsId: id })}
            summary={(item) => `${item.antennaFactor}× antenna · $${item.costM}M`}
          />
        );
      case "computer":
        return (
          <ChoiceList
            items={gameData.onboardComputer}
            selected={design.onboardComputerId}
            onSelect={(id) => update({ onboardComputerId: id })}
            summary={(item) => `${item.massKg} kg · ${item.powerW} W · $${item.costM}M`}
          />
        );
      case "attitude":
        return (
          <ChoiceList
            items={gameData.attitudeControl}
            selected={design.attitudeControlId}
            onSelect={(id) => update({ attitudeControlId: id })}
            summary={(item) => `${item.scienceEfficiency}× science · $${item.costM}M`}
          />
        );
      case "instruments":
        return (
          <div className="choice-list">
            {gameData.instruments.map((instrument) => {
              const selected = design.instrumentIds.includes(instrument.id);
              return (
                <label className={`choice-card${selected ? " selected" : ""}`} key={instrument.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      update({
                        instrumentIds: selected
                          ? design.instrumentIds.filter((id) => id !== instrument.id)
                          : [...design.instrumentIds, instrument.id],
                      })
                    }
                  />
                  <span className="choice-card-copy">
                    <strong>{instrument.name}</strong>
                    <span>{instrument.purpose}</span>
                  </span>
                  <Tooltip label={instrument.purpose} />
                </label>
              );
            })}
          </div>
        );
      case "launch":
        return (
          <ChoiceList
            items={gameData.launchVehicles}
            selected={design.launchVehicleId}
            onSelect={(id) => update({ launchVehicleId: id })}
            summary={(item) => `$${item.costM}M · supports ${item.supportedOrbits.join(", ")}`}
          />
        );
      case "orbit":
        return (
          <ChoiceList
            items={gameData.orbits}
            selected={design.orbitId}
            onSelect={(id) => update({ orbitId: id })}
            summary={(item) => `${item.timeDays} days · ${item.propellantModifier}× propellant`}
          />
        );
    }
  };

  return (
    <section className="screen workshop-screen" aria-labelledby="workshop-title">
      <div className="screen-heading">
        <p className="eyebrow">Design workshop</p>
        <h1 id="workshop-title">Build your {scenario.name} mission</h1>
      </div>
      <div className="workshop-layout">
        <div className="workshop-main">
          <div className="tabs" role="tablist" aria-label="Mission components">
            {tabs.map((tab) => (
              <button
                className={`tab${activeTab === tab.id ? " active" : ""}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="tab-panel" role="tabpanel">
            <div className="card-title-row">
              <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <Tooltip label="Choose a component; the resource panel updates immediately." />
            </div>
            {renderTab()}
          </div>
          <button className="button button-primary wide-button" type="button" onClick={onContinue}>
            Continue to Go/No-Go review
          </button>
        </div>
        <ResourcePanel design={design} scenario={scenario} />
      </div>
    </section>
  );
}

function ChoiceList<T extends { id: string; name: string; sourceNote: string }>({
  items,
  selected,
  onSelect,
  summary,
}: {
  items: readonly T[];
  selected: string;
  onSelect: (id: string) => void;
  summary: (item: T) => string;
}) {
  return (
    <div className="choice-list">
      {items.map((item) => (
        <ChoiceCard
          id={item.id}
          key={item.id}
          name={item.name}
          summary={summary(item)}
          selected={selected === item.id}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </div>
  );
}
