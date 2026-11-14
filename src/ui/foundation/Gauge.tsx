import { useEffect, useRef, useState } from "react";
import { vibrate } from "../../audio/haptics";
import { playSound } from "../../audio/sound";

export type GaugeStatus = "healthy" | "warning" | "danger";

interface GaugeProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  status?: GaugeStatus;
}

export function Gauge({ label, value, max, unit = "", status = "healthy" }: GaugeProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [shaking, setShaking] = useState(false);
  const previousStatus = useRef(status);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDisplayValue(value));
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  useEffect(() => {
    if (status === "danger" && previousStatus.current !== "danger") {
      playSound("warning");
      vibrate(30);
      setShaking(true);
      const timeout = window.setTimeout(() => setShaking(false), 360);
      previousStatus.current = status;
      return () => window.clearTimeout(timeout);
    }
    previousStatus.current = status;
  }, [status]);

  const ratio = max > 0 ? Math.max(0, Math.min(1, displayValue / max)) : 0;
  const angle = -125 + ratio * 250;

  return (
    <div className={`kit-gauge kit-gauge-${status}${shaking ? " gauge-shake" : ""}`} aria-label={`${label}: ${value}${unit}`}>
      <svg viewBox="0 0 160 105" role="img" aria-hidden="true">
        <path className="gauge-arc gauge-arc-base" d="M 20 85 A 60 60 0 0 1 140 85" />
        <path className="gauge-arc gauge-arc-fill" d="M 20 85 A 60 60 0 0 1 140 85" pathLength="1" style={{ strokeDasharray: `${ratio} 1` }} />
        <line className="gauge-needle" x1="80" y1="85" x2="80" y2="30" style={{ transform: `rotate(${angle}deg)` }} />
        <circle className="gauge-hub" cx="80" cy="85" r="6" />
      </svg>
      <strong>{label}</strong>
      <span>{value} / {max} {unit}</span>
    </div>
  );
}
