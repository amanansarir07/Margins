import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { gameData } from "../engine/loadData";
import { isSoundMuted, playSound, toggleSoundMuted } from "../audio/sound";
import { vibrate } from "../audio/haptics";
import type { Difficulty } from "../engine/types";
import type { DailyMission } from "./daily";
import { loadBestScoreForScenario } from "./storage";

interface TitleScreenProps {
  missionStars: Record<string, number>;
  selectedScenarioId: string;
  difficulty: Difficulty;
  onSelectScenario: (scenarioId: string) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStartQuickMission: () => void;
  onStartPrepMission: () => void;
  dailyMission: DailyMission;
  dailyStreak: number;
  onStartDaily: () => void;
}

const destinationPositions: Record<string, { x: number; y: number }> = {
  moon: { x: 25, y: 62 },
  mars: { x: 52, y: 45 },
  europa: { x: 78, y: 62 },
};

function scenarioForDestination(destinationId: string) {
  return gameData.scenarios.find((scenario) => scenario.destinationId === destinationId);
}

function starsForDestination(destinationId: string, missionStars: Record<string, number>) {
  const scenario = scenarioForDestination(destinationId);
  return scenario ? missionStars[scenario.id] ?? 0 : 0;
}

function rankForStars(stars: number) {
  if (stars >= 10) return "Flight Director";
  if (stars >= 6) return "Engineer";
  return "Cadet";
}

function timeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(
    Math.floor((seconds % 3600) / 60),
  ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TitleScreen({
  missionStars,
  selectedScenarioId,
  difficulty,
  onSelectScenario,
  onDifficultyChange,
  onStartQuickMission,
  onStartPrepMission,
  dailyMission,
  dailyStreak,
  onStartDaily,
}: TitleScreenProps) {
  const [muted, setMuted] = useState(isSoundMuted);
  const [rocketHop, setRocketHop] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [resetCountdown, setResetCountdown] = useState(timeUntilReset);
  const totalStars = Object.values(missionStars).reduce((total, stars) => total + stars, 0);
  const selectedScenario = gameData.scenarios.find((scenario) => scenario.id === selectedScenarioId);
  const selectedDestination = gameData.destinations.find(
    (destination) => destination.id === selectedScenario?.destinationId,
  ) ?? gameData.destinations[0];
  const firstMission = totalStars === 0;

  useEffect(() => {
    const timer = window.setInterval(() => setResetCountdown(timeUntilReset()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setParallax({
        x: (event.clientX / window.innerWidth - 0.5) * 10,
        y: (event.clientY / window.innerHeight - 0.5) * 6,
      });
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const probe = document.querySelector<HTMLElement>(".launch-probe");
      if (probe) probe.classList.toggle("launch-probe-visible");
    }, 8500);
    return () => window.clearInterval(timer);
  }, []);

  const planet = useMemo(() => {
    if (selectedDestination.id === "mars") {
      return (
        <g className="launch-planet launch-planet-mars">
          <circle cx="850" cy="390" r="118" />
          <path d="M760 355 Q820 315 900 350 T960 420" />
          <path d="M790 445 Q850 410 930 450" />
        </g>
      );
    }
    if (selectedDestination.id === "europa") {
      return (
        <g className="launch-planet launch-planet-europa">
          <circle cx="850" cy="390" r="118" />
          <path d="M760 350 Q850 390 940 330 M750 420 Q850 370 950 440" />
          <path d="M805 285 Q850 390 780 495 M900 285 Q850 390 930 495" />
        </g>
      );
    }
    return (
      <g className="launch-planet launch-planet-moon">
        <circle cx="850" cy="390" r="118" />
        <circle cx="790" cy="350" r="14" />
        <circle cx="895" cy="430" r="22" />
        <circle cx="845" cy="315" r="9" />
      </g>
    );
  }, [selectedDestination.id]);

  const selectDestination = (destinationId: string) => {
    const scenario = scenarioForDestination(destinationId);
    if (!scenario) return;
    playSound("click");
    vibrate(12);
    onSelectScenario(scenario.id);
  };

  return (
    <section className="launch-site" aria-labelledby="launch-site-title">
      <svg
        className="launch-scene"
        viewBox="0 0 1000 720"
        role="img"
        aria-label={`${selectedDestination.name} launch site`}
        style={{ "--parallax-x": `${parallax.x}px`, "--parallax-y": `${parallax.y}px` } as CSSProperties}
      >
        <defs>
          <linearGradient id="launch-dusk" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#14213D" />
            <stop offset="0.62" stopColor="#2B5BD7" />
            <stop offset="1" stopColor="#E63B2E" />
          </linearGradient>
        </defs>
        <rect width="1000" height="720" fill="url(#launch-dusk)" />
        <g className="launch-parallax launch-stars">
          {Array.from({ length: 34 }, (_, index) => (
            <circle key={index} cx={(index * 83) % 980 + 10} cy={(index * 47) % 290 + 18} r={index % 4 === 0 ? 2 : 1} />
          ))}
        </g>
        <g className="launch-parallax launch-horizon" style={{ transform: "translate(var(--parallax-x), var(--parallax-y))" }}>
          {planet}
        </g>
        <path className="launch-ground" d="M0 560 Q200 525 400 555 T1000 540 V720 H0Z" />
        <g
          className={`launch-rocket${rocketHop ? " launch-rocket-hop" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Rocket. Activate to hop."
          onClick={() => {
            playSound("snap");
            vibrate(16);
            setRocketHop(true);
            window.setTimeout(() => setRocketHop(false), 350);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <path className="rocket-body" d="M475 475 L475 330 Q500 280 525 330 L525 475Z" />
          <path className="rocket-nose" d="M475 330 Q500 270 525 330Z" />
          <circle className="rocket-window" cx="500" cy="350" r="10" />
          <path className="rocket-fin" d="M475 420 L450 470 L475 460Z" />
          <path className="rocket-fin" d="M525 420 L550 470 L525 460Z" />
          <path className="rocket-flame" d="M486 475 Q500 530 514 475Z" />
          <path className="rocket-steam" d="M455 460 Q420 445 438 420 M545 460 Q580 445 562 420" />
        </g>
        <path className="launch-pad" d="M400 535 H600 L630 575 H370Z" />
        <path className="launch-tower" d="M430 535 V295 M570 535 V295 M430 320 H570 M430 380 H570 M430 440 H570" />
        <g className="launch-probe" aria-hidden="true">
          <circle cx="170" cy="180" r="6" />
          <path d="M170 180 L195 180 M180 170 V190" />
        </g>
      </svg>

      <header className="launch-topbar">
        <div className="launch-rank">
          <strong>{rankForStars(totalStars)}</strong>
          <span>{totalStars} ★</span>
        </div>
        <h1 id="launch-site-title">MARGINS</h1>
        <div className="launch-status">
          <span>STREAK {dailyStreak}</span>
          <button
            className="launch-icon-button"
            type="button"
            aria-label={muted ? "Turn sound on" : "Mute sound"}
            onClick={() => setMuted(toggleSoundMuted())}
          >
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
        </div>
      </header>

      <div className="launch-stamp">Nothing in space is free.</div>

      <div className="launch-destinations" aria-label="Mission destinations">
        {gameData.destinations.map((destination) => {
          const scenario = scenarioForDestination(destination.id);
          if (!scenario) return null;
          const stars = starsForDestination(destination.id, missionStars);
          const unlocked =
            destination.id === "moon" ||
            (destination.id === "mars" && starsForDestination("moon", missionStars) >= 1) ||
            (destination.id === "europa" && totalStars >= 3);
          const selected = selectedDestination.id === destination.id;
          const position = destinationPositions[destination.id];
          return (
            <button
              className={`launch-destination${selected ? " selected" : ""}${unlocked ? "" : " locked"}`}
              key={destination.id}
              type="button"
              disabled={!unlocked}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              aria-label={`${destination.name}, ${stars} stars, ${unlocked ? "unlocked" : "locked"}`}
              onClick={() => selectDestination(destination.id)}
            >
              <span className="launch-pin" />
              <strong>{destination.name}</strong>
              <span>{"★".repeat(Math.min(3, stars))}{"☆".repeat(Math.max(0, 3 - stars))}</span>
              <small>{unlocked ? `${loadBestScoreForScenario(scenario.id)} BEST` : "LOCKED"}</small>
            </button>
          );
        })}
      </div>

      <div className="launch-actions">
        <button
          className="launch-primary button"
          type="button"
          onClick={() => {
            playSound("click");
            onDifficultyChange(firstMission ? "cadet" : difficulty);
            if (firstMission) onStartQuickMission();
            else onStartPrepMission();
          }}
        >
          {firstMission ? "QUICK MISSION (60 SEC)" : "PREP MISSION"}
        </button>
        <div className="launch-secondary">
          <button className="button button-muted" type="button" onClick={onStartDaily}>
            DAILY MISSION <span>{resetCountdown}</span>
          </button>
          <a className="button button-muted" href="/patch-wall">PATCH WALL</a>
        </div>
      </div>
    </section>
  );
}
