type ProgressBarProps = {
  color?: string;
  label?: string;
  value: number;
};

export function ProgressBar({
  color = "var(--accent)",
  label,
  value,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, 100));

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped)}
      className="progress-track"
      role="progressbar"
    >
      <div
        className="progress-fill"
        style={{ background: color, width: `${clamped}%` }}
      />
    </div>
  );
}
