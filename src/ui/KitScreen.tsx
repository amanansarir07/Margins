import { useState } from "react";
import { vibrate } from "../audio/haptics";
import {
  isSoundMuted,
  playSound,
  toggleSoundMuted,
  type SoundName,
} from "../audio/sound";
import { BalanceScale } from "./foundation/BalanceScale";
import { Battery } from "./foundation/Battery";
import { Button } from "./foundation/Button";
import { FuelGauge } from "./foundation/FuelGauge";
import { Gauge } from "./foundation/Gauge";
import { SignalBars } from "./foundation/SignalBars";
import { Stamp } from "./foundation/Stamp";

const sounds: SoundName[] = ["click", "snap", "warning", "launch", "success", "fail"];

export function KitScreen() {
  const [muted, setMuted] = useState(isSoundMuted);
  const [gaugeValue, setGaugeValue] = useState(112);

  return (
    <main className="kit-page">
      <header className="kit-header">
        <div>
          <p className="kit-kicker">Margins / component kit</p>
          <h1>Design foundation</h1>
        </div>
        <Button type="button" onClick={() => setMuted(toggleSoundMuted())}>
          Sound: {muted ? "off" : "on"}
        </Button>
      </header>
      <section className="kit-section">
        <h2>Controls</h2>
        <div className="kit-row">
          <Button type="button" onClick={() => setGaugeValue((current) => current === 112 ? 174 : 112)}>
            Move needle
          </Button>
          <Button type="button" onClick={() => vibrate(30)}>
            Test vibration
          </Button>
        </div>
        <div className="kit-row">
          {sounds.map((sound) => (
            <Button key={sound} type="button" onClick={() => playSound(sound)}>
              Play {sound}
            </Button>
          ))}
        </div>
      </section>
      <section className="kit-section kit-instrument-grid">
        <h2>Instruments</h2>
        <Gauge label="Mass" value={gaugeValue} max={180} unit="kg" status={gaugeValue > 160 ? "warning" : "healthy"} />
        <BalanceScale used={gaugeValue} limit={180} />
        <Battery value={42} max={220} />
        <FuelGauge value={312} max={400} />
        <SignalBars label="Comms" value={65} max={80} />
        <SignalBars label="Data" value={42} max={80} />
      </section>
      <section className="kit-section kit-stamp-row">
        <h2>Mission marks</h2>
        <Stamp>MISSION PASS</Stamp>
        <Stamp tone="fail">MISSION FAIL</Stamp>
      </section>
    </main>
  );
}
