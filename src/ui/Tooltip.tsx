interface TooltipProps {
  label: string;
}

export function Tooltip({ label }: TooltipProps) {
  return (
    <button
      className="tooltip"
      type="button"
      title={label}
      aria-label={label}
    >
      ?
    </button>
  );
}
