import { gameData } from "../engine/loadData";
import { playSound } from "../audio/sound";
import { vibrate } from "../audio/haptics";
import type { Difficulty } from "../engine/types";
import type { DailyMission } from "./daily";

interface TitleScreenProps {
  missionStars: Record<string, number>;
  difficulty: Difficulty;
  onSelectScenario: (scenarioId: string) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStartSandbox: () => void;
  dailyMission: DailyMission;
  dailyStreak: number;
  onStartDaily: () => void;
}

const pinPositions: Record<string, { x: number; y: number }> = {
  moon: { x: 290, y: 120 },
  mars: { x: 500, y: 220 },
  europa: { x: 700, y: 120 },
};

function starsForDestination(
  destinationId: string,
  missionStars: Record<string, number>,
) {
  const scenario = gameData.scenarios.find(
    (item) => item.destinationId === destinationId,
  );
  return scenario ? missionStars[scenario.id] ?? 0 : 0;
}

export function TitleScreen({
  missionStars,
  difficulty,
  onSelectScenario,
  onDifficultyChange,
  onStartSandbox,
  dailyMission,
  dailyStreak,
  onStartDaily,
}: TitleScreenProps) {
  const moonStars = starsForDestination("moon", missionStars);
  const totalStars = Object.values(missionStars).reduce(
    (total, stars) => total + stars,
    0,
  );

  return (
    <section className="mission-select" aria-labelledby="mission-select-title">
      <header className="mission-select-header">
        <div>
          <p className="eyebrow">Margins / mission select</p>
          <h1 id="mission-select-title">Choose a destination</h1>
        </div>
        <div className="mission-progress">
          <strong>{totalStars} stars</strong>
          <a href="/patch-wall">OPEN PATCH WALL</a>
        </div>
      </header>
      <div className="solar-map">
        <svg viewBox="0 0 820 320" role="img" aria-label="Solar system mission map">
          <path className="solar-route" d="M 115 160 C 270 20, 485 300, 700 160" />
          <circle className="solar-star" cx="115" cy="160" r="44" />
          <text className="solar-label" x="115" y="220">
            SUN
          </text>
          <circle className="orbit-dot" cx="290" cy="120" r="5" />
          <circle className="orbit-dot" cx="500" cy="220" r="5" />
          <circle className="orbit-dot" cx="700" cy="120" r="5" />
        </svg>
        {gameData.destinations.map((destination) => {
          const position = pinPositions[destination.id];
          const stars = starsForDestination(destination.id, missionStars);
          const unlocked =
            destination.id === "moon" ||
            (destination.id === "mars" && moonStars >= 1) ||
            (destination.id === "europa" && totalStars >= 3);
          return (
            <button
              className={`mission-pin mission-pin-${destination.id}${unlocked ? "" : " locked"}`}
              key={destination.id}
              style={{
                left: `${(position.x / 820) * 100}%`,
                top: `${(position.y / 320) * 100}%`,
              }}
              type="button"
              disabled={!unlocked}
              aria-label={`${destination.name}, ${stars} stars, ${unlocked ? "unlocked" : "locked"}`}
              onClick={() => {
                playSound("click");
                vibrate(12);
                onSelectScenario(
                  gameData.scenarios.find(
                    (scenario) => scenario.destinationId === destination.id,
                  )?.id ?? "moon-ice-mapping",
                );
              }}
            >
              <span className="mission-pin-dot" />
              <strong>{destination.name}</strong>
              <span>
                {"★".repeat(Math.min(3, stars))}
                {"☆".repeat(Math.max(0, 3 - stars))}
                {stars > 3 ? ` +${stars - 3}` : ""}
              </span>
              <small>{unlocked ? "UNLOCKED" : "LOCKED"}</small>
            </button>
          );
        })}
      </div>
      <footer className="mission-select-footer">
        <button className="button button-primary" type="button" onClick={onStartDaily}>
          DAILY MISSION · {dailyStreak} DAY STREAK
        </button>
        <div className="difficulty-picker" aria-label="Difficulty">
          {(["cadet", "engineer", "veteran"] as Difficulty[]).map((level) => (
            <button
              className={`button difficulty-button${difficulty === level ? " selected" : ""}`}
              key={level}
              type="button"
              onClick={() => onDifficultyChange(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <button className="button button-muted" type="button" onClick={onStartSandbox}>
          OPEN SANDBOX
        </button>
      </footer>
      <p className="daily-code">TODAY: {dailyMission.code}</p>
    </section>
  );
}
