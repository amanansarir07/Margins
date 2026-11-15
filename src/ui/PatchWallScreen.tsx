import { useMemo } from "react";
import { gameData } from "../engine/loadData";
import { loadMissionPatches, loadMissionStars } from "./storage";

function rankForStars(stars: number) {
  if (stars >= 10) return "Flight Director";
  if (stars >= 6) return "Engineer";
  return "Cadet";
}

export function PatchWallScreen() {
  const patches = useMemo(loadMissionPatches, []);
  const stars = useMemo(loadMissionStars, []);
  const totalStars = Object.values(stars).reduce(
    (total, value) => total + value,
    0,
  );

  return (
    <main className="patch-wall-page">
      <header className="patch-wall-header">
        <div>
          <p className="eyebrow">Margins / patch wall</p>
          <h1>Mission patches</h1>
        </div>
        <div className="patch-wall-rank">
          <strong>{totalStars} stars</strong>
          <span>{rankForStars(totalStars)}</span>
        </div>
      </header>
      <div className="patch-wall-actions">
        <a className="button button-muted" href="/">
          RETURN TO MISSION SELECT
        </a>
      </div>
      {patches.length === 0 ? (
        <section className="patch-empty">
          <h2>No patches saved.</h2>
          <p>Finish a mission to add its patch here.</p>
        </section>
      ) : (
        <section className="patch-grid" aria-label="Earned mission patches">
          {patches.map((patch) => (
            <article className="patch-card" key={patch.id}>
              <div
                className="patch-svg"
                dangerouslySetInnerHTML={{ __html: patch.svg }}
              />
              <h2>{patch.missionName}</h2>
              <p>
                {gameData.destinations.find(
                  (destination) =>
                    destination.id ===
                    gameData.scenarios.find(
                      (scenario) => scenario.id === patch.scenarioId,
                    )?.destinationId,
                )?.name ?? patch.scenarioId}
              </p>
              <strong>{patch.stars} stars · {patch.score}/1000</strong>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
