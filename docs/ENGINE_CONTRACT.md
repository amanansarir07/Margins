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

## Difficulty and sandbox

- **Cadet** is an onboarding mode. It permits simple-tier components, multiplies resource limits by 1.2, and exposes extra hints in the briefing.
- **Engineer** uses the normal limits, component tiers, event risk, and scoring.
- **Veteran** permits advanced components but tightens resource limits to 90% (and the budget to 75%), increases event risk by 1.5, and applies a 1.35 score multiplier capped at 1000.
- **Sandbox** removes the budget cap, science goal, and instrument requirement so players can explore. It keeps mass, power, data, time, launch compatibility, and scenario-specific power requirements.
- Mars and Europa values are provisional Game model values until the challenge plan supplies final numbers. Europa requires nuclear power; its simplified radiation events are Game model.

## Suggested fixes

`suggestFixes(design, scenario, seed)` tries adjacent component choices, larger or smaller power systems, a different antenna, dropping or swapping one instrument, and different launch vehicles or compatible orbits. Every candidate is evaluated with the same seed. A successful design returns no suggestions. A failed design returns up to three successful candidates sorted by cost; each includes the changed design, cost delta, mass impact, power-margin impact, evaluation, and a plain-English explanation. If no candidate succeeds, it returns the single highest-scoring closest improvement.

## Team mode

Pass-and-play team mode supports 2 to 4 players. Players take the roles planner, spacecraft engineer, science lead, and communications and resources. Each role has a private goal. The final score is affected by how well the team's goals are balanced, not only by the mission result.

## Launch windows

The launch-window model uses astronomy-engine. Any simplified launch-window behavior is labeled "Game model" in the UI and data.
