import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="label-caps">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            {icon}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
