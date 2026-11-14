import { useEffect, useMemo, useRef, useState } from "react";
import { vibrate } from "../audio/haptics";
import { playSound } from "../audio/sound";
import { gameData } from "../engine/loadData";
import { simulateTimeline } from "../engine/engine";
import type {
  Design,
  EventDecisionChoice,
  FlightTimeline,
  MissionEventOutcome,
  MissionOptions,
  ResourceName,
  ScenarioRecord,
} from "../engine/types";
import { Button } from "./foundation/Button";

const resourceNames: ResourceName[] = [
  "mass",
  "power",
  "budget",
  "data",
  "comms",
  "time",
];

const resourceLabels: Record<ResourceName, string> = {
  mass: "MASS",
  power: "POWER",
  budget: "BUDGET",
  data: "DATA",
  comms: "COMMS",
  time: "TIME",
};

const resourceUnits: Record<ResourceName, string> = {
  mass: "kg",
  power: "W",
  budget: "$M",
  data: "Mbit/day",
  comms: "Mbit/day",
  time: "days",
};

const fallbackDecisions: Record<string, EventDecisionChoice[]> = {
  default: [
    {
      id: "protect",
      label: "PROTECT SYSTEMS",
      detail: "Reduce operations while the event passes.",
      cost: "Lose 1 day of science.",
      saved: "Reliability margin.",
    },
    {
      id: "continue",
      label: "KEEP OBSERVING",
      detail: "Continue the science plan at full rate.",
      cost: "Use 5% more critical margin.",
      saved: "The current observation window.",
    },
  ],
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
  const [countdown, setCountdown] = useState(5);
  const [launched, setLaunched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeEvent, setActiveEvent] = useState<
    (MissionEventOutcome & { day: number }) | null
  >(null);
  const [decisionSeconds, setDecisionSeconds] = useState(12);
  const [decisionResult, setDecisionResult] =
    useState<EventDecisionChoice | null>(null);
  const [shaking, setShaking] = useState(false);
  const progressRef = useRef(0);
  const shownEvents = useRef(new Set<string>());
  const countdownStarted = useRef(false);
  progressRef.current = progress;

  useEffect(() => {
    if (countdownStarted.current) return;
    countdownStarted.current = true;
    playSound("launch");
    vibrate(40);
    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setLaunched(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!launched || isPaused) return;
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
        setDecisionSeconds(12);
        setDecisionResult(null);
        setIsPaused(true);
        setShaking(true);
        playSound("warning");
        vibrate(25);
        window.setTimeout(() => setShaking(false), 500);
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
  }, [isPaused, launched, onComplete, timeline]);

  const eventRecord = activeEvent
    ? gameData.eventsGame.find((event) => event.id === activeEvent.id)
    : undefined;
  const decisionChoices =
    eventRecord?.decision?.choices ?? fallbackDecisions.default;

  useEffect(() => {
    if (!activeEvent || decisionResult) return;
    const interval = window.setInterval(() => {
      setDecisionSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    const timeout = window.setTimeout(() => {
      setDecisionResult(decisionChoices[0] ?? null);
    }, 12000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [activeEvent, decisionChoices, decisionResult]);

  const currentPoint =
    timeline.points[
      Math.min(
        timeline.points.length - 1,
        Math.floor(progress * timeline.points.length),
      )
    ] ?? timeline.points[0];

  const chooseDecision = (choice: EventDecisionChoice) => {
    setDecisionResult(choice);
    playSound("click");
    vibrate(15);
  };

  const continueFlight = () => {
    setActiveEvent(null);
    setDecisionResult(null);
    setIsPaused(false);
  };

  return (
    <section
      className={`screen flight-screen${shaking ? " flight-shake" : ""}`}
      aria-labelledby="flight-title"
    >
      <header className="flight-header">
        <div>
          <p className="eyebrow">Margins / flight</p>
          <h1 id="flight-title">
            {countdown > 0 ? "LAUNCH COUNTDOWN" : currentPoint?.phase ?? "launch"}
          </h1>
        </div>
        <div className="flight-countdown" aria-live="assertive">
          {countdown > 0 ? `T-${countdown}` : "FLIGHT"}
        </div>
      </header>
      <div className="flight-layout">
        <div className="flight-main">
          <FlightCanvas
            destination={scenario.destinationId}
            timeline={timeline}
            progress={progress}
            launched={launched}
          />
          <TelemetryStrip point={currentPoint} />
          <div className="flight-progress">
            <div className="flight-progress-heading">
              <span>MISSION DAY {Math.round(timeline.durationDays * progress)}</span>
              <strong>{Math.round(progress * 100)}%</strong>
            </div>
            <div className="resource-bar">
              <span
                className="resource-bar-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <Button
            className="button-muted"
            type="button"
            onClick={() => onComplete(timeline)}
          >
            SKIP TO DEBRIEF
          </Button>
        </div>
      </div>
      {activeEvent && (
        <div
          className="event-overlay decision-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-title"
        >
          <div className="event-card panel">
            <p className="panel-label">
              EVENT / DAY {Math.round(activeEvent.day)} / {decisionSeconds}s
            </p>
            <div className="decision-timer">
              <span style={{ width: `${(decisionSeconds / 12) * 100}%` }} />
            </div>
            <h2 id="event-title">{activeEvent.name}</h2>
            <p>{eventRecord?.decision?.prompt ?? activeEvent.explanation}</p>
            {!decisionResult ? (
              <div className="decision-choice-list">
                {decisionChoices.map((choice) => (
                  <button
                    className="decision-choice"
                    key={choice.id}
                    type="button"
                    onClick={() => chooseDecision(choice)}
                  >
                    <strong>{choice.label}</strong>
                    <span>{choice.detail}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="decision-result" aria-live="polite">
                <strong>Decision recorded.</strong>
                <span>Cost: {decisionResult.cost}</span>
                <span>Saved: {decisionResult.saved}</span>
                <p>{decisionResult.detail}</p>
                <Button type="button" onClick={continueFlight}>
                  CONTINUE FLIGHT
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function FlightCanvas({
  destination,
  timeline,
  progress,
  launched,
}: {
  destination: string;
  timeline: FlightTimeline;
  progress: number;
  launched: boolean;
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
    context.fillStyle = "#14213D";
    context.fillRect(0, 0, width, height);

    for (const star of stars) {
      context.fillStyle = `rgba(201, 209, 217, ${0.35 + star.size / 4})`;
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    }

    const destinationPoint = { x: width * 0.84, y: height * 0.34 };
    const start = { x: width * 0.08, y: height * 0.72 };
    const control = { x: width * 0.42, y: height * 0.1 };
    context.strokeStyle = "#2EC4A6";
    context.lineWidth = 3;
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(control.x, control.y, destinationPoint.x, destinationPoint.y);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#FFC20E";
    context.beginPath();
    context.arc(destinationPoint.x, destinationPoint.y, Math.min(width, height) * 0.12, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#14213D";
    context.stroke();
    context.fillStyle = "#14213D";
    context.font = "700 14px 'Atkinson Hyperlegible'";
    context.fillText("EARTH", start.x - 20, start.y + 28);
    context.fillText(destination.toUpperCase(), destinationPoint.x - 32, destinationPoint.y + 35);

    if (!launched) return;
    const spacecraft = {
      x:
        (1 - progress) ** 2 * start.x +
        2 * (1 - progress) * progress * control.x +
        progress ** 2 * destinationPoint.x,
      y:
        (1 - progress) ** 2 * start.y +
        2 * (1 - progress) * progress * control.y +
        progress ** 2 * destinationPoint.y,
    };
    context.fillStyle = "#E63B2E";
    context.beginPath();
    context.moveTo(spacecraft.x - 12, spacecraft.y + 5);
    context.lineTo(spacecraft.x, spacecraft.y + (progress < 0.12 ? 24 : 12));
    context.lineTo(spacecraft.x + 12, spacecraft.y + 5);
    context.closePath();
    context.fill();
    context.fillStyle = "#FFC20E";
    context.beginPath();
    context.arc(spacecraft.x, spacecraft.y, 7, 0, Math.PI * 2);
    context.fill();
  }, [destination, launched, progress, stars, timeline]);

  return (
    <canvas
      className="flight-canvas"
      ref={canvasRef}
      role="img"
      aria-label={`Animated spacecraft flight to ${destination}, currently ${timeline.points[0]?.phase ?? "launch"}`}
    />
  );
}

function TelemetryStrip({
  point,
}: {
  point: FlightTimeline["points"][number] | undefined;
}) {
  return (
    <div className="telemetry-strip" aria-label="Live telemetry">
      {point &&
        resourceNames.map((name) => {
          const resource = point.resources[name];
          return (
            <div className="telemetry-readout" key={name}>
              <span>{resourceLabels[name]}</span>
              <strong>
                {resource.used.toFixed(1)}
                <small> {resourceUnits[name]}</small>
              </strong>
              <i
                className={
                  resource.margin < 0
                    ? "telemetry-danger"
                    : resource.margin / Math.max(resource.limit, 1) < 0.15
                      ? "telemetry-warning"
                      : ""
                }
              />
            </div>
          );
        })}
    </div>
  );
}
