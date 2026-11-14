import { useEffect, useMemo, useRef, useState } from "react";
import { simulateTimeline } from "../engine/engine";
import type {
  Design,
  FlightTimeline,
  MissionOptions,
  MissionEventOutcome,
  ResourceName,
  ScenarioRecord,
} from "../engine/types";
import { Tooltip } from "./Tooltip";

const resourceNames: ResourceName[] = [
  "mass",
  "power",
  "budget",
  "data",
  "comms",
  "time",
];

const resourceLabels: Record<ResourceName, string> = {
  mass: "Mass",
  power: "Power",
  budget: "Budget",
  data: "Data",
  comms: "Comms",
  time: "Time",
};

const resourceColors: Record<ResourceName, string> = {
  mass: "#73d5ff",
  power: "#fbbf24",
  budget: "#c084fc",
  data: "#86efac",
  comms: "#fb7185",
  time: "#f0abfc",
};

interface FlightScreenProps {
  design: Design;
  scenario: ScenarioRecord;
  seed: number;
  options: MissionOptions;
  onComplete: (timeline: FlightTimeline) => void;
}

export function FlightScreen({
  design,
  scenario,
  seed,
  options,
  onComplete,
}: FlightScreenProps) {
  const timeline = useMemo(
    () => simulateTimeline(design, scenario, seed, 32, options),
    [design, scenario, seed, options],
  );
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeEvent, setActiveEvent] = useState<
    (MissionEventOutcome & { day: number }) | null
  >(null);
  const progressRef = useRef(0);
  const shownEvents = useRef(new Set<string>());
  progressRef.current = progress;

  useEffect(() => {
    if (isPaused) return;
    const durationMs = 14000;
    const startedAt = performance.now() - progressRef.current * durationMs;
    let frame = 0;

    const tick = (now: number) => {
      const nextProgress = Math.min(1, (now - startedAt) / durationMs);
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      const currentDay = timeline.durationDays * nextProgress;
      const nextEvent = timeline.events.find(
        (event) =>
          event.occurred &&
          event.day <= currentDay &&
          !shownEvents.current.has(event.id),
      );
      if (nextEvent) {
        shownEvents.current.add(nextEvent.id);
        setActiveEvent(nextEvent);
        setIsPaused(true);
        return;
      }
      if (nextProgress >= 1) {
        onComplete(timeline);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPaused, onComplete, timeline]);

  const currentPoint =
    timeline.points[
      Math.min(
        timeline.points.length - 1,
        Math.floor(progress * timeline.points.length),
      )
    ] ?? timeline.points[0];

  return (
    <section className="screen flight-screen" aria-labelledby="flight-title">
      <div className="screen-heading">
        <p className="eyebrow">Flight simulation</p>
        <h1 id="flight-title">{currentPoint?.phase ?? "launch"}</h1>
      </div>
      <div className="flight-layout">
        <div className="flight-main">
          <FlightCanvas timeline={timeline} progress={progress} />
          <div className="flight-progress">
            <div className="flight-progress-heading">
              <span>Mission day {Math.round(timeline.durationDays * progress)}</span>
              <strong>{Math.round(progress * 100)}%</strong>
            </div>
            <div className="resource-bar">
              <span className="resource-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <button
            className="button button-muted"
            type="button"
            onClick={() => onComplete(timeline)}
          >
            Skip to debrief
          </button>
        </div>
        <FlightResourceDashboard point={currentPoint} />
      </div>
      {activeEvent && (
        <div className="event-overlay" role="dialog" aria-modal="true" aria-labelledby="event-title">
          <div className="event-card panel">
            <p className="panel-label">Mission event · day {Math.round(activeEvent.day)}</p>
            <h2 id="event-title">{activeEvent.name}</h2>
            <p>
              <strong>{activeEvent.outcome}</strong>
            </p>
            <p className="muted">{activeEvent.explanation}</p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setActiveEvent(null);
                setIsPaused(false);
              }}
            >
              Continue flight
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function FlightCanvas({
  timeline,
  progress,
}: {
  timeline: FlightTimeline;
  progress: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, index) => ({
        x: ((index * 47) % 100) / 100,
        y: ((index * 83) % 100) / 100,
        size: index % 5 === 0 ? 1.8 : 1,
      })),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.fillStyle = "#050917";
    context.fillRect(0, 0, width, height);

    for (const star of stars) {
      context.fillStyle = `rgb(220 235 255 / ${0.35 + star.size / 4})`;
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    }

    const moon = { x: width * 0.84, y: height * 0.34 };
    context.strokeStyle = "#395887";
    context.setLineDash([5, 6]);
    context.beginPath();
    context.moveTo(width * 0.08, height * 0.72);
    context.quadraticCurveTo(width * 0.42, height * 0.1, moon.x, moon.y);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#c6d3e8";
    context.beginPath();
    context.arc(moon.x, moon.y, Math.min(width, height) * 0.12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#9cacc6";
    context.beginPath();
    context.arc(moon.x - 12, moon.y - 6, 8, 0, Math.PI * 2);
    context.arc(moon.x + 14, moon.y + 11, 5, 0, Math.PI * 2);
    context.fill();

    const start = { x: width * 0.08, y: height * 0.72 };
    const control = { x: width * 0.42, y: height * 0.1 };
    const spacecraft = {
      x:
        (1 - progress) ** 2 * start.x +
        2 * (1 - progress) * progress * control.x +
        progress ** 2 * moon.x,
      y:
        (1 - progress) ** 2 * start.y +
        2 * (1 - progress) * progress * control.y +
        progress ** 2 * moon.y,
    };
    context.fillStyle = "#73d5ff";
    context.beginPath();
    context.arc(spacecraft.x, spacecraft.y, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f4f7ff";
    context.font = "12px system-ui";
    context.fillText("Earth", start.x - 4, start.y + 22);
    context.fillText("Moon", moon.x - 17, moon.y + 30);
  }, [progress, stars]);

  return (
    <canvas
      className="flight-canvas"
      ref={canvasRef}
      role="img"
      aria-label={`Animated spacecraft flight to the Moon, currently ${timeline.points[0]?.phase ?? "launch"}`}
    />
  );
}

function FlightResourceDashboard({
  point,
}: {
  point: FlightTimeline["points"][number] | undefined;
}) {
  return (
    <aside className="panel flight-dashboard">
      <div className="card-title-row">
        <div>
          <p className="panel-label">Live telemetry</p>
          <h2>Resources draining</h2>
        </div>
        <Tooltip label="These readings come from the engine timeline for the current mission day." />
      </div>
      <div className="resource-list">
        {point &&
          resourceNames.map((name) => {
            const resource = point.resources[name];
            const width = Math.min(
              100,
              resource.limit > 0 ? (resource.used / resource.limit) * 100 : 100,
            );
            return (
              <div className="resource-row" key={name}>
                <div className="resource-heading">
                  <span>{resourceLabels[name]}</span>
                  <strong>
                    {resource.used.toFixed(1)} / {resource.limit.toFixed(1)}
                  </strong>
                </div>
                <div className="resource-bar">
                  <span
                    className="resource-bar-fill"
                    style={{ background: resourceColors[name], width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
}
