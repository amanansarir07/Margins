interface SignalBarsProps {
  label: string;
  value: number;
  max: number;
}

export function SignalBars({ label, value, max }: SignalBarsProps) {
  const active = max > 0 ? Math.ceil(Math.max(0, Math.min(1, value / max)) * 5) : 0;
  return (
    <div className="kit-instrument" aria-label={`${label}: ${value} of ${max}`}>
      <div className="signal-bars">
        {[1, 2, 3, 4, 5].map((bar) => (
          <span className={bar <= active ? "signal-active" : ""} key={bar} style={{ height: `${bar * 15}%` }} />
        ))}
      </div>
      <strong>{label} {value} / {max}</strong>
    </div>
  );
}
