# Engine Contract

## Resource preview

`previewResources(design, scenario)` calculates the six resources: mass, power, budget, data, communications, and time. It returns each resource as `used`, `limit`, and `margin`, plus warnings that explain any tight or exceeded limit in plain English.

## Mission evaluation

`evaluate(design, scenario, seed)` runs a repeatable mission simulation. It returns pass/fail checks for mass, power, data, budget, time, and launch-vehicle compatibility. Compatibility checks both spacecraft mass and the selected orbit. It also returns margins, science points, reliability, events with their outcomes, a score out of 1000 with a breakdown, and plain-English reasons for success or failure.

`getThreatBriefing(scenario, seed)` uses the scenario event list and a seeded generator to choose the hazards for that mission. It returns each hazard's type, month window, severity, consequence, resource, and warning lead time before the player builds. `evaluate` uses exactly that same list; it never creates a hidden event later.

`assessThreats(design, scenario, seed)` adds a `survives`, `marginal`, or `fails` status and one resource-based reason for every briefing hazard. The same design, scenario, and seed always produce the same briefing and statuses.

The evaluator uses deterministic seeded selection only. A decision is supplied as `MissionOptions.decisions`, keyed by hazard id. The same design, seed, and decision map always produce the same result.

## Simplified engine rules

- Dry mass is the sum of the selected bus, power system, communications, computer, attitude control, and instruments. Propellant is `dry mass x destination propellant factor x orbit modifier`; propellant costs 0.1 $M per kg.
- Solar power is multiplied by the destination sunlight factor. Nuclear power is not multiplied by sunlight. Power used is the sum of every selected component except the power source.
- Generated data is the sum of instrument data. Downlink is `200 x antenna factor x destination distance factor`. The returned-data fraction is capped at 100%; data above downlink is lost.
- Time used is transit time plus orbit time. The time limit is the smaller of the scenario time limit and 30 days per allowed program month plus transit.
- Science is the sum of instrument value multiplied by its scenario multiplier, pointing efficiency, and returned-data fraction. The advanced computer's processed-data multiplier is applied afterward.
- A design must include at least one instrument from `requiredInstrumentAnyOf` when that list is non-empty. A mission succeeds when all resource and launch checks pass, the science goal is met, and reliability remains at least 0.5.
- Hazards are selected once for the scenario and seed, then shown in the Threat Briefing. Margins determine whether each selected hazard is survived, marginal, or failed. There are no hidden hazard rolls.
- Radiation monitors add warning lead time. Radiation-hardened computers protect against radiation bursts. Battery margin adds stored power margin. Redundant computers reduce instrument-fault losses. Each mitigation adds mass, power, and/or cost.
- Solar-flare decisions are deterministic: safe mode protects instruments but loses two science days; keeping observations has no added loss when the hazard is survived and costs reliability when the design is weak.
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

## Replay modifiers and contracts

Daily missions use the UTC date as a deterministic seed. They select one enabled scenario, one twist, and one scenario contract. The share code is derived from the same date and seed, so it is repeatable without a backend.

Twists are passed through `MissionOptions`. Budget, communications, launcher, and hazard-window modifiers affect both the briefing and evaluation. Contracts are evaluated after resource calculation and can add one bonus star when their stated condition passes.

## Mission objectives

Each scenario has selectable objective records in `data/objectives.json`. The selected
objective changes the description, science goal, instrument requirements, critical
resources, visible hazard list, and optional budget or time limits. The same objective
is passed through briefing, preview, evaluation, flight, and debrief. Objective hazard
lists are deterministic for the mission seed and never differ between briefing and flight.
