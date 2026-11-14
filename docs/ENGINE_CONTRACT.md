# Engine Contract

## Resource preview

`previewResources(design, scenario)` calculates the six resources: mass, power, budget, data, communications, and time. It returns each resource as `used`, `limit`, and `margin`, plus warnings that explain any tight or exceeded limit in plain English.

## Mission evaluation

`evaluate(design, scenario, seed)` runs a repeatable mission simulation. It returns pass/fail checks for mass, power, data, budget, time, and launch-vehicle compatibility. Compatibility checks both spacecraft mass and the selected orbit. It also returns margins, science points, reliability, events with their outcomes, a score out of 1000 with a breakdown, and plain-English reasons for success or failure.

The evaluator uses a seeded random generator so the same design, scenario, and seed produce the same result.

## Simplified engine rules

- Dry mass is the sum of the selected bus, power system, communications, computer, attitude control, and instruments. Propellant is `dry mass x destination propellant factor x orbit modifier`; propellant costs 0.1 $M per kg.
- Solar power is multiplied by the destination sunlight factor. Nuclear power is not multiplied by sunlight. Power used is the sum of every selected component except the power source.
- Generated data is the sum of instrument data. Downlink is `200 x antenna factor x destination distance factor`. The returned-data fraction is capped at 100%; data above downlink is lost.
- Time used is transit time plus orbit time. The time limit is the smaller of the scenario time limit and 30 days per allowed program month plus transit.
- Science is the sum of instrument value multiplied by its scenario multiplier, pointing efficiency, and returned-data fraction. The advanced computer's processed-data multiplier is applied afterward.
- A design must include at least one instrument from `requiredInstrumentAnyOf` when that list is non-empty. A mission succeeds when all resource and launch checks pass, the science goal is met, and reliability remains at least 0.5.
- Events are blocked when every critical-resource margin is at least 25%. Otherwise the seeded roll is adjusted by the weakest critical margin. This makes tight margins increase risk without making events purely random.
- The score awards 600 points for six checks, 200 for resource margins, 100 for science, and 100 for reliability.

## Suggested fixes

`suggestFixes(design, scenario, seed)` tries small design changes and returns the cheapest changes that would fix a failed mission. Suggestions must preserve the player's objective where possible and explain the trade-off.

## Team mode

Pass-and-play team mode supports 2 to 4 players. Players take the roles planner, spacecraft engineer, science lead, and communications and resources. Each role has a private goal. The final score is affected by how well the team's goals are balanced, not only by the mission result.

## Launch windows

The launch-window model uses astronomy-engine. Any simplified launch-window behavior is labeled "Game model" in the UI and data.
