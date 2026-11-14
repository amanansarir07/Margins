import destinationsJson from "../../data/destinations.json";
import scenariosJson from "../../data/scenarios.json";
import instrumentsJson from "../../data/instruments.json";
import spacecraftBusJson from "../../data/spacecraft_bus.json";
import powerJson from "../../data/power.json";
import commsJson from "../../data/comms.json";
import onboardComputerJson from "../../data/onboard_computer.json";
import attitudeControlJson from "../../data/attitude_control.json";
import launchVehiclesJson from "../../data/launch_vehicles.json";
import orbitsJson from "../../data/orbits.json";
import eventsGameJson from "../../data/events_game.json";
import eventsDonkiJson from "../../data/events_donki.json";
import missionReferencesJson from "../../data/mission_references.json";
import mitigationsJson from "../../data/mitigations.json";
import type {
  AttitudeControlRecord,
  CommsRecord,
  DestinationRecord,
  DonkiEventRecord,
  GameEventRecord,
  InstrumentRecord,
  LaunchVehicleRecord,
  MissionReferenceRecord,
  MitigationRecord,
  OnboardComputerRecord,
  OrbitRecord,
  PowerRecord,
  ScenarioRecord,
  SpacecraftBusRecord,
} from "./types";

const requiredRecordFields = ["id", "name", "source", "sourceNote"];

function validateRecords<T>(fileName: string, value: unknown): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${fileName}: expected a JSON array.`);
  }

  value.forEach((record, index) => {
    if (typeof record !== "object" || record === null) {
      throw new Error(`Invalid ${fileName}[${index}]: expected an object.`);
    }

    for (const field of requiredRecordFields) {
      if (!(field in record)) {
        throw new Error(`Invalid ${fileName}[${index}]: missing "${field}".`);
      }
    }

    const source = (record as { source: unknown }).source;
    if (source !== "NASA-based" && source !== "Game model") {
      throw new Error(
        `Invalid ${fileName}[${index}].source: expected "NASA-based" or "Game model".`,
      );
    }
  });

  return value as T[];
}

export const gameData = {
  destinations: validateRecords<DestinationRecord>(
    "destinations.json",
    destinationsJson,
  ),
  scenarios: validateRecords<ScenarioRecord>("scenarios.json", scenariosJson),
  instruments: validateRecords<InstrumentRecord>(
    "instruments.json",
    instrumentsJson,
  ),
  spacecraftBus: validateRecords<SpacecraftBusRecord>(
    "spacecraft_bus.json",
    spacecraftBusJson,
  ),
  power: validateRecords<PowerRecord>("power.json", powerJson),
  comms: validateRecords<CommsRecord>("comms.json", commsJson),
  onboardComputer: validateRecords<OnboardComputerRecord>(
    "onboard_computer.json",
    onboardComputerJson,
  ),
  attitudeControl: validateRecords<AttitudeControlRecord>(
    "attitude_control.json",
    attitudeControlJson,
  ),
  launchVehicles: validateRecords<LaunchVehicleRecord>(
    "launch_vehicles.json",
    launchVehiclesJson,
  ),
  orbits: validateRecords<OrbitRecord>("orbits.json", orbitsJson),
  eventsGame: validateRecords<GameEventRecord>(
    "events_game.json",
    eventsGameJson,
  ),
  eventsDonki: validateRecords<DonkiEventRecord>(
    "events_donki.json",
    eventsDonkiJson,
  ),
  missionReferences: validateRecords<MissionReferenceRecord>(
    "mission_references.json",
    missionReferencesJson,
  ),
  mitigations: validateRecords<MitigationRecord>(
    "mitigations.json",
    mitigationsJson,
  ),
} as const;
