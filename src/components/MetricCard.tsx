import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, suffix, trend, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-heading font-bold",
            trend === "up" && "text-profit",
            trend === "down" && "text-loss",
            trend === "neutral" && "text-foreground"
          )}
        >
          {value}
        </span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
