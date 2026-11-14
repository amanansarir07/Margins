interface BatteryProps {
  value: number;
  max: number;
}

export function Battery({ value, max }: BatteryProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="kit-instrument">
      <div className="battery-shell" aria-label={`Power ${value} of ${max}`}>
        <span className="battery-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <strong>Power {value} / {max} W</strong>
    </div>
  );
}
