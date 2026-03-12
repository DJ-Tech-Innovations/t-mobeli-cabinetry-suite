interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <p className="label-caps mb-2">{label}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
