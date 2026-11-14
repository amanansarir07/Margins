# Engine Contract

## Resource preview

`previewResources(design, scenario)` calculates the six resources: mass, power, budget, data, communications, and time. It returns each resource as `used`, `limit`, and `margin`, plus warnings that explain any tight or exceeded limit in plain English.

## Mission evaluation

`evaluate(design, scenario, seed)` runs a repeatable mission simulation. It returns pass/fail checks for mass, power, data, budget, time, and launch-vehicle compatibility. Compatibility checks both spacecraft mass and the selected orbit. It also returns margins, science points, reliability, events with their outcomes, a score out of 1000 with a breakdown, and plain-English reasons for success or failure.

The evaluator uses a seeded random generator so the same design, scenario, and seed produce the same result.

## Suggested fixes

`suggestFixes(design, scenario, seed)` tries small design changes and returns the cheapest changes that would fix a failed mission. Suggestions must preserve the player's objective where possible and explain the trade-off.

## Team mode

Pass-and-play team mode supports 2 to 4 players. Players take the roles planner, spacecraft engineer, science lead, and communications and resources. Each role has a private goal. The final score is affected by how well the team's goals are balanced, not only by the mission result.

## Launch windows

The launch-window model uses astronomy-engine. Any simplified launch-window behavior is labeled "Game model" in the UI and data.
