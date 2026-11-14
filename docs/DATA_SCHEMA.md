# Data Schema

All files are JSON arrays or objects with the fields below. Field names are stable; values are intentionally omitted until the data is researched and balanced. Every record includes `source` (`"NASA-based"` or `"Game model"`) and `sourceNote` (a short explanation or citation).

## Common fields

- `id`: string identifier.
- `name`: human-readable string.
- `source`: `"NASA-based"` or `"Game model"`.
- `sourceNote`: string explaining the source.

## destinations.json

- `id`, `name`, `description`
- `distanceFromEarth`: number, km
- `oneWaySignalTime`: number, minutes
- `typicalTripTime`: number, days
- `surfaceGravity`: number, m/s²
- `sunlightComparedToEarth`: number, ratio
- `propellantFactor`: number, game-model multiplier
- `downlinkDistanceFactor`: number, game-model multiplier

## scenarios.json

- `id`, `destinationId`, `objective`
- `requiredInstruments`: array of instrument IDs
- `requiredInstrumentAnyOf`: array of instrument IDs
- `limits`: object with `massKg` (kg), `powerW` (W), `budgetM` ($M), `dataMbitPerDay` (Mbit/day), `communicationsMbitPerDay` (Mbit/day), `timeDays` (days)
- `events`: array of event IDs

## instruments.json

- `id`, `name`, `purpose`
- `massKg`: number, kg
- `powerW`: number, W
- `dataMbitPerDay`: number, Mbit/day
- `costM`: number, $M
- `sciencePoints`: number

## spacecraft_bus.json

- `id`, `name`
- `massKg`: number, kg
- `powerW`: number, W
- `costM`: number, $M
- `dataCapacityMbitPerDay`: number, Mbit/day

## power.json

- `id`, `name`
- `massKg`: number, kg
- `powerW`: number, W
- `costM`: number, $M
- `destinationIds`: array of destination IDs
- `kind`: `"solar"` or `"nuclear"`

## comms.json

- `id`, `name`
- `massKg`: number, kg
- `powerW`: number, W
- `dataMbitPerDay`: number, Mbit/day
- `costM`: number, $M
- `antennaFactor`: number, game-model multiplier

## onboard_computer.json

- `id`, `name`
- `massKg`: number, kg
- `powerW`: number, W
- `costM`: number, $M
- `dataProcessingMbitPerDay`: number, Mbit/day

## attitude_control.json

- `id`, `name`
- `massKg`: number, kg
- `powerW`: number, W
- `costM`: number, $M
- `pointingAccuracy`: number, arcseconds

## launch_vehicles.json

- `id`, `name`
- `capacityByDestination`: object mapping destination IDs to capacity in kg
- `supportedOrbits`: array of orbit IDs
- `costM`: number, $M

## orbits.json

- `id`, `name`, `destinationId`, `description`
- `insertionMassKg`: number, kg
- `timeDays`: number, days
- `costM`: number, $M

## events_game.json

- `id`, `name`, `description`
- `probability`: number, ratio
- `effects`: object with resource changes
- `outcomes`: array of outcome descriptions

## events_donki.json

- `id`, `eventType`, `startTime`, `endTime`
- `sourceId`: string
- `effects`: object with game-model effects
- `sourceUrl`: string

## mission_references.json

- `id`, `missionName`, `agency`, `destinationId`
- `launchDate`: string
- `massKg`: number, kg
- `missionDurationDays`: number, days
- `sourceUrl`: string
