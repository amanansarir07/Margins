import { useState, type DragEvent } from "react";
import { gameData } from "../engine/loadData";
import { assessThreats, previewResources } from "../engine/engine";
import { playSound } from "../audio/sound";
import { vibrate } from "../audio/haptics";
import type {
  Design,
  MissionOptions,
  ScenarioRecord,
  ThreatAssessment,
} from "../engine/types";
import { BalanceScale } from "./foundation/BalanceScale";
import { Battery } from "./foundation/Battery";
import { Button } from "./foundation/Button";
import { FuelGauge } from "./foundation/FuelGauge";
import { Gauge } from "./foundation/Gauge";
import { SignalBars } from "./foundation/SignalBars";

type Slot =
  | "bus"
  | "power"
  | "comms"
  | "computer"
  | "attitude"
  | "instruments"
  | "launch"
  | "orbit"
  | "mitigations";

type ShelfItem = { id: string; name: string; sourceNote: string };
const WORKBENCH_TUTORIAL_KEY = "margins:workbench-callouts-seen";

function firstWorkbenchSession() {
  try {
    return localStorage.getItem(WORKBENCH_TUTORIAL_KEY) !== "true";
  } catch {
    return true;
  }
}

const slotLabels: Record<Slot, string> = {
  bus: "Spacecraft bus",
  power: "Power",
  comms: "Communications",
  computer: "Computer",
  attitude: "Attitude control",
  instruments: "Instruments",
  launch: "Launch vehicle",
  orbit: "Orbit",
  mitigations: "Threat defenses",
};

function slotForDesignKey(slot: Slot): keyof Design | null {
  return {
    bus: "spacecraftBusId",
    power: "powerId",
    comms: "commsId",
    computer: "onboardComputerId",
    attitude: "attitudeControlId",
    instruments: null,
    launch: "launchVehicleId",
    orbit: "orbitId",
    mitigations: null,
  }[slot];
}

function statusFor(used: number, limit: number) {
  const ratio = limit > 0 ? used / limit : 1;
  return ratio > 1 ? "danger" : ratio > 0.85 ? "warning" : "healthy";
}

function resourceImpact(
  before: ReturnType<typeof previewResources>,
  after: ReturnType<typeof previewResources>,
) {
  const changes = (["mass", "power", "budget"] as const)
    .map((name) => {
      const delta = after.resources[name].used - before.resources[name].used;
      if (Math.abs(delta) < 0.05) return null;
      const unit = name === "mass" ? "kg" : name === "power" ? "W" : "$M";
      return `${name} ${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${unit}`;
    })
    .filter((change): change is string => Boolean(change));
  return changes.length > 0 ? changes.join(" · ") : "No mass, power, or budget change";
}

export function WorkshopScreen({
  design,
  scenario,
  options,
  seed,
  onDesignChange,
  onContinue,
}: {
  design: Design;
  scenario: ScenarioRecord;
  options: MissionOptions;
  seed: number;
  onDesignChange: (design: Design) => void;
  onContinue: () => void;
}) {
  const [drawer, setDrawer] = useState<Slot | null>(null);
  const [bouncedSlot, setBouncedSlot] = useState<Slot | null>(null);
  const [designFeedback, setDesignFeedback] = useState("Select a part to see its impact.");
  const [showCallouts, setShowCallouts] = useState(firstWorkbenchSession);
  const preview = previewResources(design, scenario, options);

  const dismissCallouts = () => {
    setShowCallouts(false);
    try {
      localStorage.setItem(WORKBENCH_TUTORIAL_KEY, "true");
    } catch {
      // The callouts can reappear when storage is unavailable.
    }
  };

  const placePart = (slot: Slot, id: string) => {
    const key = slotForDesignKey(slot);
    let nextDesign = design;
    if (slot === "instruments") {
      const selected = design.instrumentIds.includes(id);
      nextDesign = {
        ...design,
        instrumentIds: selected
          ? design.instrumentIds.filter((instrumentId) => instrumentId !== id)
          : [...design.instrumentIds, id],
      };
    } else if (slot === "mitigations") {
      const selected = design.mitigationIds ?? [];
      nextDesign = {
        ...design,
        mitigationIds: selected.includes(id)
          ? selected.filter((mitigationId) => mitigationId !== id)
          : [...selected, id],
      };
    } else if (key) {
      nextDesign = { ...design, [key]: id };
    }
    onDesignChange(nextDesign);
    setDesignFeedback(resourceImpact(preview, previewResources(nextDesign, scenario, options)));
    playSound("snap");
    vibrate(8);
    setBouncedSlot(slot);
    window.setTimeout(() => setBouncedSlot(null), 220);
  };

  const readDrop = (event: DragEvent, slot: Slot) => {
    const value = event.dataTransfer.getData("text/plain");
    const [itemSlot, id] = value.split(":");
    if (itemSlot === slot && id) placePart(slot, id);
  };

  const resources = preview.resources;

  return (
    <section className="screen workbench-screen" aria-labelledby="workbench-title">
      <header className="screen-heading workbench-heading">
        <div>
          <p className="eyebrow">Margins / workbench</p>
          <h1 id="workbench-title">{scenario.name}</h1>
        </div>
        <span className="workbench-mode">{options.difficulty ?? "engineer"}</span>
      </header>
      <div className="workbench-layout">
        <aside className="parts-shelf" aria-label="Parts shelf">
          <h2>Parts shelf</h2>
          <ShelfGroup
            label="Bus"
            slot="bus"
            items={gameData.spacecraftBus}
            selected={design.spacecraftBusId}
            onPlace={placePart}
          />
          <ShelfGroup
            label="Power"
            slot="power"
            items={gameData.power.filter(
              (item) =>
                item.id !== "no-power" &&
                item.destinationIds.includes(scenario.destinationId),
            )}
            selected={design.powerId}
            onPlace={placePart}
          />
          <ShelfGroup
            label="Comms"
            slot="comms"
            items={gameData.comms}
            selected={design.commsId}
            onPlace={placePart}
          />
          <ShelfGroup
            label="Computer"
            slot="computer"
            items={gameData.onboardComputer}
            selected={design.onboardComputerId}
            onPlace={placePart}
          />
          <ShelfGroup
            label="Attitude"
            slot="attitude"
            items={gameData.attitudeControl}
            selected={design.attitudeControlId}
            onPlace={placePart}
          />
          <ShelfGroup
            label="Instruments"
            slot="instruments"
            items={gameData.instruments}
            selected={design.instrumentIds}
            onPlace={placePart}
            multiple
          />
          <ShelfGroup
            label="Threat defenses"
            slot="mitigations"
            items={gameData.mitigations}
            selected={design.mitigationIds ?? []}
            onPlace={placePart}
            multiple
          />
          <ShelfGroup
            label="Launch"
            slot="launch"
            items={gameData.launchVehicles}
            selected={design.launchVehicleId}
            onPlace={placePart}
          />
          <ShelfGroup
            label="Orbit"
            slot="orbit"
            items={gameData.orbits.filter(
              (item) => item.destinationId === scenario.destinationId,
            )}
            selected={design.orbitId}
            onPlace={placePart}
          />
        </aside>

        <div className="spacecraft-stage">
          <SpacecraftView design={design} scenario={scenario} />
          <div className="slot-grid">
            <SlotButton
              label="Power"
              value={findName(gameData.power, design.powerId)}
              slot="power"
              selected
              bounced={bouncedSlot === "power"}
              onClick={() => setDrawer("power")}
              onDrop={(event) => readDrop(event, "power")}
            />
            <SlotButton
              label="Bus"
              value={findName(gameData.spacecraftBus, design.spacecraftBusId)}
              slot="bus"
              selected
              bounced={bouncedSlot === "bus"}
              onClick={() => setDrawer("bus")}
              onDrop={(event) => readDrop(event, "bus")}
            />
            <SlotButton
              label="Comms"
              value={findName(gameData.comms, design.commsId)}
              slot="comms"
              selected
              bounced={bouncedSlot === "comms"}
              onClick={() => setDrawer("comms")}
              onDrop={(event) => readDrop(event, "comms")}
            />
            <SlotButton
              label="Computer"
              value={findName(gameData.onboardComputer, design.onboardComputerId)}
              slot="computer"
              selected
              bounced={bouncedSlot === "computer"}
              onClick={() => setDrawer("computer")}
              onDrop={(event) => readDrop(event, "computer")}
            />
            <SlotButton
              label="Attitude"
              value={findName(gameData.attitudeControl, design.attitudeControlId)}
              slot="attitude"
              selected
              bounced={bouncedSlot === "attitude"}
              onClick={() => setDrawer("attitude")}
              onDrop={(event) => readDrop(event, "attitude")}
            />
            <SlotButton
              label="Instruments"
              value={`${design.instrumentIds.length} mounted`}
              slot="instruments"
              selected={design.instrumentIds.length > 0}
              bounced={bouncedSlot === "instruments"}
              onClick={() => setDrawer("instruments")}
              onDrop={(event) => readDrop(event, "instruments")}
            />
            <SlotButton
              label="Launch"
              value={findName(gameData.launchVehicles, design.launchVehicleId)}
              slot="launch"
              selected
              bounced={bouncedSlot === "launch"}
              onClick={() => setDrawer("launch")}
              onDrop={(event) => readDrop(event, "launch")}
            />
            <SlotButton
              label="Orbit"
              value={findName(gameData.orbits, design.orbitId)}
              slot="orbit"
              selected
              bounced={bouncedSlot === "orbit"}
              onClick={() => setDrawer("orbit")}
              onDrop={(event) => readDrop(event, "orbit")}
            />
          </div>
          <ThreatBriefing
            scenario={scenario}
            design={design}
            seed={seed}
            options={options}
          />
        </div>

        <aside className="gauge-cluster" aria-label="Live resource gauges">
          <h2>Telemetry</h2>
          <BalanceScale used={resources.mass.used} limit={resources.mass.limit} />
          <Battery
            value={Math.max(0, resources.power.limit - resources.power.used)}
            max={resources.power.limit}
          />
          <FuelGauge value={resources.budget.used} max={resources.budget.limit} />
          <SignalBars
            label="Comms"
            value={Math.max(0, resources.comms.limit - resources.comms.used)}
            max={resources.comms.limit}
          />
          <SignalBars
            label="Data"
            value={Math.max(0, resources.data.limit - resources.data.used)}
            max={resources.data.limit}
          />
          <Gauge
            label="Time"
            value={resources.time.used}
            max={resources.time.limit}
            unit="days"
            status={statusFor(resources.time.used, resources.time.limit)}
          />
          {preview.warnings.length > 0 && (
            <ul className="gauge-warning-list" aria-live="polite">
              {preview.warnings.slice(0, 3).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      <Button className="lock-design-button" type="button" onClick={onContinue}>
        RUN GO / NO-GO CHECK
      </Button>
      <div className="design-feedback" role="status" aria-live="polite">
        <strong>LAST CHANGE</strong>
        <span>{designFeedback}</span>
      </div>
      {showCallouts && (
        <aside className="workbench-callouts" aria-label="Workbench tips">
          <ol>
            <li>Pick a part. Read its mass, power, and budget change.</li>
            <li>Keep every gauge below its limit.</li>
            <li>Swap parts before launch. Full design checks run at launch.</li>
          </ol>
          <Button className="button-muted" type="button" onClick={dismissCallouts}>
            GOT IT
          </Button>
        </aside>
      )}
      {drawer && (
        <PartDrawer
          slot={drawer}
          design={design}
          scenario={scenario}
          onClose={() => setDrawer(null)}
          onPlace={placePart}
        />
      )}
    </section>
  );
}

function ThreatBriefing({
  scenario,
  design,
  seed,
  options,
}: {
  scenario: ScenarioRecord;
  design: Design;
  seed: number;
  options: MissionOptions;
}) {
  const threats = assessThreats(design, scenario, seed, options);
  return (
    <section className="threat-briefing panel" aria-labelledby="threat-title">
      <div className="panel-label">KNOWN HAZARDS / SEED {seed}</div>
      <h2 id="threat-title">Threat briefing</h2>
      {options.twistId && (
        <p className="threat-twist">
          <strong>TWIST:</strong>{" "}
          {gameData.twists.find((twist) => twist.id === options.twistId)?.description}
        </p>
      )}
      <div className="threat-months" aria-label="Mission month timeline">
        <span>MONTH 1</span><span>MONTH {scenario.maxProgramMonths}</span>
      </div>
      <div className="threat-list">
        {threats.map((threat) => (
          <ThreatRow key={threat.id} threat={threat} />
        ))}
      </div>
    </section>
  );
}

function ThreatRow({ threat }: { threat: ThreatAssessment }) {
  return (
    <article className={`threat-row threat-${threat.status}`}>
      <div>
        <strong>{threat.type.toUpperCase()}</strong>
        <span>MONTH {threat.monthStart}-{threat.monthEnd}</span>
      </div>
      <b>{threat.status.toUpperCase()}</b>
      <p>{threat.reason}</p>
      <small>{threat.resource.toUpperCase()} / {threat.consequence}</small>
    </article>
  );
}

function findName<T extends { id: string; name: string }>(
  items: readonly T[],
  id: string,
) {
  return items.find((item) => item.id === id)?.name ?? "Not selected";
}

function ShelfGroup<T extends ShelfItem>({
  label,
  slot,
  items,
  selected,
  onPlace,
  multiple = false,
}: {
  label: string;
  slot: Slot;
  items: readonly T[];
  selected: string | string[];
  onPlace: (slot: Slot, id: string) => void;
  multiple?: boolean;
}) {
  return (
    <div className="shelf-group">
      <h3>{label}</h3>
      <div className="shelf-items">
        {items.map((item) => {
          const isSelected = Array.isArray(selected)
            ? selected.includes(item.id)
            : selected === item.id;
          return (
            <button
              className={`shelf-part${isSelected ? " selected" : ""}`}
              draggable
              key={item.id}
              title={item.sourceNote}
              type="button"
              onClick={() => onPlace(slot, item.id)}
              onDragStart={(event) =>
                event.dataTransfer.setData("text/plain", `${slot}:${item.id}`)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlace(slot, item.id);
                }
              }}
            >
              <span className="shelf-part-shape" />
              <span>{item.name}</span>
              {multiple && isSelected && <small>mounted</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotButton({
  label,
  value,
  slot,
  selected,
  bounced,
  onClick,
  onDrop,
}: {
  label: string;
  value: string;
  slot: Slot;
  selected: boolean;
  bounced: boolean;
  onClick: () => void;
  onDrop: (event: DragEvent) => void;
}) {
  return (
    <button
      className={`spacecraft-slot spacecraft-slot-${slot}${selected ? " filled" : ""}${bounced ? " slot-bounce" : ""}`}
      type="button"
      onClick={onClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      title={`Swap ${label}`}
    >
      <strong>{label}</strong>
      <span>{value}</span>
    </button>
  );
}

function SpacecraftView({
  design,
  scenario,
}: {
  design: Design;
  scenario: ScenarioRecord;
}) {
  const power = gameData.power.find((item) => item.id === design.powerId);
  const comms = gameData.comms.find((item) => item.id === design.commsId);
  const launch = gameData.launchVehicles.find(
    (item) => item.id === design.launchVehicleId,
  );
  const computer = gameData.onboardComputer.find(
    (item) => item.id === design.onboardComputerId,
  );
  const attitude = gameData.attitudeControl.find(
    (item) => item.id === design.attitudeControlId,
  );
  const panelScale = power?.id === "large-solar-array" ? 1.35 : 1;
  const dishScale = comms?.antennaFactor ?? 1;

  return (
    <div className="spacecraft-view">
      <svg
        viewBox="0 0 760 420"
        role="img"
        aria-label={`Spacecraft for ${scenario.name}`}
      >
        {power?.kind === "solar" && (
          <>
            <rect
              className="spacecraft-solar-wing"
              height={70 * panelScale}
              width={150 * panelScale}
              x={30 - (panelScale - 1) * 55}
              y={170 - (panelScale - 1) * 35}
            />
            <rect
              className="spacecraft-solar-wing"
              height={70 * panelScale}
              width={150 * panelScale}
              x={580}
              y={170 - (panelScale - 1) * 35}
            />
          </>
        )}
        {power?.kind === "nuclear" && (
          <rect className="spacecraft-nuclear" height="46" width="70" x="35" y="185" />
        )}
        <path className="spacecraft-body" d="M 220 145 L 540 145 L 590 210 L 540 275 L 220 275 L 170 210 Z" />
        <rect className="spacecraft-module module-computer" height="42" width="60" x="270" y="158" />
        <rect className="spacecraft-module module-attitude" height="42" width="60" x="350" y="220" />
        <text className="spacecraft-label" x="300" y="184">CPU</text>
        <text className="spacecraft-label" x="380" y="246">ACS</text>
        <line className="spacecraft-mast" x1="380" x2="380" y1="145" y2="90" />
        <circle
          className="spacecraft-dish"
          cx="380"
          cy="75"
          r={25 * dishScale}
        />
        {design.instrumentIds.map((instrumentId, index) => (
          <g key={instrumentId}>
            <line
              className="spacecraft-mount"
              x1={270 + index * 75}
              x2={270 + index * 75}
              y1="275"
              y2="320"
            />
            <circle
              className="spacecraft-instrument"
              cx={270 + index * 75}
              cy="335"
              r="18"
            />
            <text
              className="spacecraft-label"
              x={270 + index * 75}
              y="340"
            >
              {instrumentId.slice(0, 3).toUpperCase()}
            </text>
          </g>
        ))}
        <path className="spacecraft-rocket" d="M 300 365 L 460 365 L 430 405 L 330 405 Z" />
        <text className="spacecraft-vehicle" x="380" y="389">
          {launch?.name ?? "Launch vehicle"}
        </text>
      </svg>
    </div>
  );
}

function PartDrawer({
  slot,
  design,
  scenario,
  onClose,
  onPlace,
}: {
  slot: Slot;
  design: Design;
  scenario: ScenarioRecord;
  onClose: () => void;
  onPlace: (slot: Slot, id: string) => void;
}) {
  const items = getItems(slot, scenario);
  const selected = slot === "instruments"
    ? design.instrumentIds
    : design[slotForDesignKey(slot) as keyof Design];
  return (
    <aside className="part-drawer" aria-label={`${slotLabels[slot]} options`}>
      <div className="drawer-heading">
        <h2>Swap {slotLabels[slot]}</h2>
        <Button type="button" onClick={onClose}>Close</Button>
      </div>
      {items.map((item) => {
        const active = Array.isArray(selected)
          ? selected.includes(item.id)
          : selected === item.id;
        return (
          <button
            className={`drawer-option${active ? " active" : ""}`}
            key={item.id}
            type="button"
            title={item.sourceNote}
            onClick={() => onPlace(slot, item.id)}
          >
            <strong>{item.name}</strong>
            <span>{active ? "Mounted" : "Mount part"}</span>
          </button>
        );
      })}
    </aside>
  );
}

function getItems(slot: Slot, scenario: ScenarioRecord): ShelfItem[] {
  switch (slot) {
    case "bus":
      return gameData.spacecraftBus;
    case "power":
      return gameData.power.filter(
        (item) =>
          item.id !== "no-power" &&
          item.destinationIds.includes(scenario.destinationId),
      );
    case "comms":
      return gameData.comms;
    case "computer":
      return gameData.onboardComputer;
    case "attitude":
      return gameData.attitudeControl;
    case "instruments":
      return gameData.instruments;
    case "launch":
      return gameData.launchVehicles;
    case "orbit":
      return gameData.orbits.filter(
        (item) => item.destinationId === scenario.destinationId,
      );
    case "mitigations":
      return gameData.mitigations;
  }
}
