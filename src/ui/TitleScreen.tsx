import { gameData } from "../engine/loadData";
import { playSound } from "../audio/sound";
import { vibrate } from "../audio/haptics";

interface TitleScreenProps {
  missionStars: Record<string, number>;
  onSelectScenario: (scenarioId: string) => void;
  onStartSandbox: () => void;
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
  onSelectScenario,
  onStartSandbox,
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
          <span>Patch wall ready</span>
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
                {"★".repeat(stars)}
                {"☆".repeat(3 - stars)}
              </span>
              <small>{unlocked ? "UNLOCKED" : "LOCKED"}</small>
            </button>
          );
        })}
      </div>
      <footer className="mission-select-footer">
        <p>Moon: 1 star unlocks Mars. 3 total stars unlock Europa.</p>
        <button className="button button-muted" type="button" onClick={onStartSandbox}>
          Open sandbox
        </button>
      </footer>
    </section>
  );
}
