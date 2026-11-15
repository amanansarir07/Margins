interface BalanceScaleProps {
  used: number;
  limit: number;
  unit?: string;
}

export function BalanceScale({ used, limit, unit = "kg" }: BalanceScaleProps) {
  const tilt = limit > 0 ? Math.max(-12, Math.min(12, ((used / limit) - 0.5) * 24)) : 12;
  return (
    <div className="kit-instrument">
      <div className="scale-beam" style={{ transform: `rotate(${tilt}deg)` }}>
        <span className="scale-pan scale-pan-left">{used} {unit}</span>
        <span className="scale-pan scale-pan-right">{limit} {unit}</span>
      </div>
      <div className="scale-pivot" />
      <strong>Mass balance</strong>
    </div>
  );
}
