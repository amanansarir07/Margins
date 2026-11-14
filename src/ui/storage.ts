import type { Design } from "../engine/types";

const LAST_DESIGN_KEY = "margins:last-design";
const BEST_SCORE_KEY = "margins:best-score";
const MISSION_STARS_KEY = "margins:mission-stars";
const PATCH_WALL_KEY = "margins:patch-wall";

export interface SavedMissionPatch {
  id: string;
  scenarioId: string;
  missionName: string;
  svg: string;
  stars: number;
  score: number;
  createdAt: string;
}

function isDesign(value: unknown): value is Design {
  if (typeof value !== "object" || value === null) return false;
  const design = value as Partial<Design>;
  return (
    typeof design.scenarioId === "string" &&
    typeof design.spacecraftBusId === "string" &&
    typeof design.powerId === "string" &&
    typeof design.commsId === "string" &&
    typeof design.onboardComputerId === "string" &&
    typeof design.attitudeControlId === "string" &&
    Array.isArray(design.instrumentIds) &&
    design.instrumentIds.every((id) => typeof id === "string") &&
    typeof design.launchVehicleId === "string" &&
    typeof design.orbitId === "string"
  );
}

export function loadLastDesign(): Design | null {
  try {
    const raw = localStorage.getItem(LAST_DESIGN_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isDesign(value) ? value : null;
  } catch (error) {
    console.warn("Could not load the last mission design.", error);
    return null;
  }
}

export function saveLastDesign(design: Design) {
  try {
    localStorage.setItem(LAST_DESIGN_KEY, JSON.stringify(design));
  } catch (error) {
    console.warn("Could not save the last mission design.", error);
  }
}

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const score = raw === null ? 0 : Number(raw);
    return Number.isFinite(score) ? score : 0;
  } catch (error) {
    console.warn("Could not load the best mission score.", error);
    return 0;
  }
}

export function saveBestScore(score: number) {
  try {
    if (score > loadBestScore()) {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    }
  } catch (error) {
    console.warn("Could not save the best mission score.", error);
  }
}

export function loadMissionStars(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MISSION_STARS_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, stars]) => typeof key === "string" && typeof stars === "number",
      ),
    );
  } catch (error) {
    console.warn("Could not load mission stars.", error);
    return {};
  }
}

export function saveMissionStars(scenarioId: string, stars: number) {
  try {
    const current = loadMissionStars();
    current[scenarioId] = Math.max(current[scenarioId] ?? 0, stars);
    localStorage.setItem(MISSION_STARS_KEY, JSON.stringify(current));
  } catch (error) {
    console.warn("Could not save mission stars.", error);
  }
}

export function loadMissionPatches(): SavedMissionPatch[] {
  try {
    const raw = localStorage.getItem(PATCH_WALL_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((patch): patch is SavedMissionPatch => {
      if (typeof patch !== "object" || patch === null) return false;
      const candidate = patch as Partial<SavedMissionPatch>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.scenarioId === "string" &&
        typeof candidate.missionName === "string" &&
        typeof candidate.svg === "string" &&
        typeof candidate.stars === "number" &&
        typeof candidate.score === "number" &&
        typeof candidate.createdAt === "string"
      );
    });
  } catch (error) {
    console.warn("Could not load the patch wall.", error);
    return [];
  }
}

export function saveMissionPatch(patch: SavedMissionPatch) {
  try {
    const patches = loadMissionPatches().filter((item) => item.id !== patch.id);
    patches.unshift(patch);
    localStorage.setItem(PATCH_WALL_KEY, JSON.stringify(patches.slice(0, 30)));
  } catch (error) {
    console.warn("Could not save the mission patch.", error);
  }
}
