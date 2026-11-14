import moonData from "../../data/designspace_moon-ice-mapping.json";
import marsData from "../../data/designspace_mars-minerals.json";
import europaData from "../../data/designspace_europa-ocean.json";
import type { Design, EvaluationResult, ScenarioRecord } from "../engine/types";
import type { AxisName } from "./storage";

type Percentiles = Record<"p0" | "p25" | "p50" | "p75" | "p90" | "p95" | "p100", number>;
type DesignSample = [number, number, number, string, string];
type DesignSpaceReport = {
  percentiles: Record<"cost" | "science" | "minMargin" | "resilience" | "schedule", Percentiles>;
  successfulDesigns: DesignSample[];
};

const reports: Record<string, DesignSpaceReport> = {
  "moon-ice-mapping": moonData as DesignSpaceReport,
  "mars-minerals": marsData as DesignSpaceReport,
  "europa-ocean": europaData as DesignSpaceReport,
};

const axisLabels: Record<AxisName, string> = {
  science: "Science",
  cost: "Cost",
  margin: "Margin",
  resilience: "Resilience",
  schedule: "Schedule",
};

const componentLabels: Record<string, string> = {
  spacecraftBusId: "spacecraft bus",
  powerId: "power system",
  commsId: "communications",
  onboardComputerId: "computer",
  attitudeControlId: "attitude control",
  instrumentIds: "instruments",
  launchVehicleId: "launch vehicle",
  orbitId: "orbit",
};

const componentKeys = [
  "spacecraftBusId",
  "powerId",
  "commsId",
  "onboardComputerId",
  "attitudeControlId",
  "instrumentIds",
  "launchVehicleId",
  "orbitId",
] as const;

function percentile(value: number, table: Percentiles): number {
  const steps: Array<[number, number]> = [
    [0, table.p0],
    [25, table.p25],
    [50, table.p50],
    [75, table.p75],
    [90, table.p90],
    [95, table.p95],
    [100, table.p100],
  ];
  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1];
    const current = steps[index];
    if (value <= current[1]) {
      const span = current[1] - previous[1];
      const portion = span === 0 ? 0 : (value - previous[1]) / span;
      return Math.round(previous[0] + portion * (current[0] - previous[0]));
    }
  }
  return 100;
}

function designSignature(design: Design): string[] {
  return [
    design.spacecraftBusId,
    design.powerId,
    design.commsId,
    design.onboardComputerId,
    design.attitudeControlId,
    [...design.instrumentIds].sort().join("+"),
    design.launchVehicleId,
    design.orbitId,
  ];
}

function frontier(samples: DesignSample[]) {
  const sorted = [...samples].sort((left, right) => left[0] - right[0]);
  const result: DesignSample[] = [];
  let bestScience = -Infinity;
  for (const sample of sorted) {
    if (sample[1] > bestScience) {
      result.push(sample);
      bestScience = sample[1];
    }
  }
  return result;
}

export function getAxisValues(result: EvaluationResult) {
  return {
    science: result.sciencePoints,
    cost: result.resources.budget.used,
    margin: Math.min(
      ...Object.values(result.resources).map((resource) =>
        resource.limit > 0 ? resource.margin / resource.limit : 0,
      ),
    ),
    resilience: result.reliability,
    schedule:
      result.resources.time.limit > 0
        ? result.resources.time.margin / result.resources.time.limit
        : 0,
  } satisfies Record<AxisName, number>;
}

export function DesignSpaceChart({
  scenario,
  design,
  result,
  patchSvg,
  onHint,
}: {
  scenario: ScenarioRecord;
  design: Design;
  result: EvaluationResult;
  patchSvg: string;
  onHint: (hint: string) => void;
}) {
  const report = reports[scenario.id];
  if (!report) return <p>Design-space data is unavailable.</p>;
  const samples = report.successfulDesigns;
  const points = frontier(samples);
  const values = getAxisValues(result);
  const costValues = samples.map((sample) => sample[0]);
  const scienceValues = samples.map((sample) => sample[1]);
  const minCost = Math.min(values.cost, ...costValues);
  const maxCost = Math.max(values.cost, ...costValues);
  const minScience = Math.min(values.science, ...scienceValues);
  const maxScience = Math.max(values.science, ...scienceValues);
  const mapX = (value: number) => 48 + ((value - minCost) / Math.max(maxCost - minCost, 1)) * 644;
  const mapY = (value: number) => 238 - ((value - minScience) / Math.max(maxScience - minScience, 1)) * 198;
  const frontierGap = points
    .filter((point) => point[0] < values.cost && point[1] >= values.science)
    .sort((left, right) => right[0] - left[0])[0];
  const playerSignature = designSignature(design);
  const frontierSignature = frontierGap?.[4].split("|") ?? [];
  const description = frontierGap
    ? `Scatter chart of ${samples.length} successful simulated designs. Your design costs $${values.cost.toFixed(1)}M and returns ${values.science} science points. Same science possible for $${(values.cost - frontierGap[0]).toFixed(1)}M less.`
    : `Scatter chart of ${samples.length} successful simulated designs. Your design costs ${values.cost.toFixed(1)} million dollars and returns ${values.science} science points. No cheaper frontier design reaches the same science.`;

  const revealHint = () => {
    if (!frontierGap) {
      onHint("No cheaper frontier design reaches the same science.");
      return;
    }
    const difference = componentKeys.findIndex(
      (key, index) => playerSignature[index] !== frontierSignature[index],
    );
    if (difference < 0) {
      onHint("The frontier design matches every shown component.");
      return;
    }
    const key = componentKeys[difference];
    onHint(`Change the ${componentLabels[key]}: the frontier uses ${frontierSignature[difference]}.`);
  };

  return (
    <div className="design-space-chart">
      <svg
        className="scatter-chart"
        viewBox="0 0 720 280"
        role="img"
        tabIndex={0}
        aria-label={description}
      >
        <line x1="48" x2="48" y1="30" y2="238" stroke="#14213D" strokeWidth="3" />
        <line x1="48" x2="692" y1="238" y2="238" stroke="#14213D" strokeWidth="3" />
        <text x="370" y="270" textAnchor="middle">COST ($M)</text>
        <text transform="translate(14 140) rotate(-90)" textAnchor="middle">SCIENCE</text>
        {samples.map((sample, index) => (
          <circle
            key={`${sample[4]}-${index}`}
            cx={mapX(sample[0])}
            cy={mapY(sample[1])}
            r="2.5"
            fill="#2B5BD7"
            opacity="0.35"
          />
        ))}
        <polyline
          points={points.map((point) => `${mapX(point[0])},${mapY(point[1])}`).join(" ")}
          fill="none"
          stroke="#E63B2E"
          strokeWidth="3"
        />
        <image
          href={`data:image/svg+xml,${encodeURIComponent(patchSvg)}`}
          x={mapX(values.cost) - 16}
          y={mapY(values.science) - 16}
          width="32"
          height="32"
          aria-label="Your mission patch marks your design"
        />
      </svg>
      <p className="chart-description">{description}</p>
      <ButtonHint onClick={revealHint} />
    </div>
  );
}

function ButtonHint({ onClick }: { onClick: () => void }) {
  return (
    <button className="button button-muted chart-hint-button" type="button" onClick={onClick}>
      HINT
    </button>
  );
}

export function DesignSpaceAxes({
  scenario,
  result,
}: {
  scenario: ScenarioRecord;
  result: EvaluationResult;
}) {
  const report = reports[scenario.id];
  if (!report) return null;
  const values = getAxisValues(result);
  const definitions: Array<[AxisName, keyof typeof report.percentiles]> = [
    ["science", "science"],
    ["cost", "cost"],
    ["margin", "minMargin"],
    ["resilience", "resilience"],
    ["schedule", "schedule"],
  ];
  return (
    <div className="axis-grid">
      {definitions.map(([axis, percentileKey]) => (
        <div className="axis-card" key={axis}>
          <strong>{axisLabels[axis]}</strong>
          <span>
            {values[axis].toFixed(axis === "science" ? 0 : 1)}
            {axis === "cost" ? " $M" : axis === "science" ? " points" : ""}
          </span>
          <small>{percentile(values[axis], report.percentiles[percentileKey])}th percentile</small>
        </div>
      ))}
      <span className="axis-footnote">vs 20,000 simulated designs (not real players)</span>
    </div>
  );
}
