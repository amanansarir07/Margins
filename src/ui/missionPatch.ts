import type { Design, EvaluationResult, ScenarioRecord } from "../engine/types";

const palette = {
  ink: "#14213D",
  yellow: "#FFC20E",
  red: "#E63B2E",
  mint: "#2EC4A6",
  grey: "#C9D1D9",
  blue: "#2B5BD7",
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

export function missionName(
  design: Design,
  scenario: ScenarioRecord,
  instrumentNames: string[],
) {
  const instrument = instrumentNames[0] ?? "Science";
  const secondInstrument = design.instrumentIds.length > 1 ? " Array" : "";
  return `${scenario.name.split(" ")[0]} ${instrument}${secondInstrument}`;
}

export function createMissionPatch(
  design: Design,
  scenario: ScenarioRecord,
  result: EvaluationResult,
  instrumentNames: string[],
  stars: number,
) {
  const name = missionName(design, scenario, instrumentNames);
  const scoreRing = Math.max(0, Math.min(1, result.score / 1000));
  const circumference = 2 * Math.PI * 72;
  const instruments = instrumentNames
    .map((instrument, index) => {
      const x = 170 + index * 75;
      return `<g><circle cx="${x}" cy="205" r="22" fill="${palette.yellow}" stroke="${palette.ink}" stroke-width="5"/><path d="M${x - 11} 205h22M${x} 194v22" stroke="${palette.ink}" stroke-width="4"/><text x="${x}" y="245" text-anchor="middle" font-size="12" font-weight="700">${escapeXml(instrument.slice(0, 5).toUpperCase())}</text></g>`;
    })
    .join("");
  const componentLine = [
    design.spacecraftBusId,
    design.powerId,
    design.commsId,
    design.onboardComputerId,
    design.attitudeControlId,
    design.launchVehicleId,
    design.orbitId,
  ]
    .map((component) => escapeXml(component.replaceAll("-", " ").slice(0, 12).toUpperCase()))
    .join(" · ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="640" height="420" rx="28" fill="${palette.grey}"/>
  <path d="M40 325h560" stroke="${palette.ink}" stroke-width="6"/>
  <circle cx="320" cy="210" r="165" fill="${result.success ? palette.mint : palette.red}" stroke="${palette.ink}" stroke-width="8"/>
  <circle cx="320" cy="210" r="140" fill="${palette.grey}" stroke="${palette.ink}" stroke-width="4"/>
  <circle cx="500" cy="112" r="72" fill="none" stroke="${palette.ink}" stroke-width="12"/>
  <circle cx="500" cy="112" r="72" fill="none" stroke="${palette.yellow}" stroke-width="12" stroke-dasharray="${circumference * scoreRing} ${circumference}" transform="rotate(-90 500 112)"/>
  <text x="500" y="106" text-anchor="middle" font-family="Atkinson Hyperlegible" font-size="25" font-weight="700" fill="${palette.ink}">${result.score}</text>
  <text x="500" y="130" text-anchor="middle" font-family="Atkinson Hyperlegible" font-size="12" font-weight="700" fill="${palette.ink}">SCORE</text>
  <circle cx="320" cy="150" r="38" fill="${palette.yellow}" stroke="${palette.ink}" stroke-width="5"/>
  <path d="M320 125v50M295 150h50" stroke="${palette.ink}" stroke-width="6"/>
  <text x="320" y="80" text-anchor="middle" font-family="Bowlby One SC" font-size="30" fill="${palette.ink}">${escapeXml(scenario.destinationId.toUpperCase())}</text>
  <text x="320" y="292" text-anchor="middle" font-family="Bowlby One SC" font-size="25" fill="${palette.ink}">${escapeXml(name.toUpperCase())}</text>
  ${instruments}
  <text x="320" y="365" text-anchor="middle" font-family="Atkinson Hyperlegible" font-size="20" font-weight="700" fill="${palette.ink}">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</text>
  <text x="320" y="394" text-anchor="middle" font-family="Atkinson Hyperlegible" font-size="10" font-weight="700" fill="${palette.ink}">${componentLine}</text>
  </svg>`;
}

export async function saveSvgAsImage(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 840;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Patch image canvas is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error("Patch image could not be encoded."));
      }, "image/png");
    });
    const downloadUrl = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}
