interface UsageGaugeProps {
  usedGb: string;
  percentage: number;
}

export default function UsageGauge({ usedGb, percentage }: UsageGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ animation: "gauge-fill 1s ease-out forwards" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">{usedGb}</p>
        <p className="text-xs text-muted-foreground">Storage Used</p>
      </div>
    </div>
  );
}
