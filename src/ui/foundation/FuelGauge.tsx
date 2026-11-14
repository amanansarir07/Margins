interface FuelGaugeProps {
  value: number;
  max: number;
}

export function FuelGauge({ value, max }: FuelGaugeProps) {
  return (
    <Gauge
      label="Budget"
      value={value}
      max={max}
      unit="$M"
      status={value > max ? "danger" : value > max * 0.85 ? "warning" : "healthy"}
    />
  );
}
