import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { store, formatCurrency } from "@/lib/data";
import { buildDashboard, formatCompact, formatPercent, PERIODS, type AgingBucket, type AttentionItem, type Period } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  AlertCircle, AlertOctagon, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ChevronRight, Clock, FolderKanban,
  Hammer, Info, Table2, Users, UserCheck, Warehouse,
} from "lucide-react";

/*
 * Chart colors (validated with the dataviz palette script against the white card surface):
 * categorical slots 1–3 for cash-flow series; one-hue ordinal ramp for funnel stages;
 * reserved status colors (always paired with icon + label) for aging and stock health.
 */
const SERIES = { billed: "#2a78d6", collected: "#eb6834", purchases: "#1baf7a" } as const;
const FUNNEL_RAMP = ["#86b6ef", "#3987e5", "#184f95"];
const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" } as const;
const CHROME = { grid: "#e1e0d9", axis: "#c3c2b7", muted: "#898781" };

const AGING_STYLE: Record<AgingBucket, { color: string; icon: typeof Clock }> = {
  current: { color: STATUS.good, icon: CheckCircle2 },
  "1-30": { color: STATUS.warning, icon: Clock },
  "31-60": { color: STATUS.serious, icon: AlertTriangle },
  "61-90": { color: STATUS.critical, icon: AlertOctagon },
  "90+": { color: STATUS.critical, icon: AlertOctagon },
};

const SERIES_META = [
  { key: "billed", label: "Billed", color: SERIES.billed },
  { key: "collected", label: "Collected", color: SERIES.collected },
  { key: "purchases", label: "Purchases received", color: SERIES.purchases },
] as const;

function Card({ title, subtitle, badge, actions, children, className }: {
  title: string; subtitle?: string; badge?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl bg-card shadow-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">{title}{badge}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="flex-1 px-5 pb-5 pt-4">{children}</div>
    </section>
  );
}

const NowBadge = () => (
  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500" title="Point-in-time figure, as of today">Now</span>
);

function KpiTile({ label, value, hint, now, tone }: { label: string; value: string; hint: ReactNode; now?: boolean; tone?: "critical" }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps">{label}</p>
        {now && <NowBadge />}
      </div>
      <p className={cn("mt-2 text-[1.75rem] font-bold leading-tight tracking-tight", tone === "critical" ? "text-red-700" : "text-foreground")}>{value}</p>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function CashFlowTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[180px] rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {SERIES_META.map(s => {
        const entry = payload.find(p => p.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{formatCurrency(Number(entry?.value ?? 0))}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal bar row with the value always visible (no tooltip-only values). */
function BarRow({ label, value, max, color, display, sub, icon }: {
  label: ReactNode; value: number; max: number; color: string; display: string; sub?: string; icon?: ReactNode;
}) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <li className="group rounded-md px-1.5 py-1 transition-colors hover:bg-slate-50" title={`${typeof label === "string" ? label : ""} ${display}`}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
          {icon}
          <span className="min-w-0 break-words">{label}</span>
          {sub && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">· {sub}</span>}
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-foreground">{display}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </li>
  );
}

const ATTENTION_STYLE: Record<AttentionItem["tone"], { icon: typeof Info; className: string }> = {
  critical: { icon: AlertCircle, className: "bg-red-50 text-red-700" },
  warning: { icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
  info: { icon: Info, className: "bg-blue-50 text-blue-700" },
};

const Dashboard = () => {
  const [period, setPeriod] = useState<Period>("all");
  const [cashView, setCashView] = useState<"chart" | "table">("chart");
  const data = buildDashboard(period);
  const { kpis } = data;
  const activities = store.getRecentActivities(6);

  const hasCashFlow = data.cashFlow.some(m => m.billed || m.collected || m.purchases);
  const funnelMax = Math.max(...data.funnel.map(f => f.value), 0);
  const agingMax = Math.max(...data.aging.map(a => a.amount), 0);
  const categoryMax = Math.max(...data.inventory.byCategory.map(c => c.value), 0);
  const materialMax = Math.max(...data.topMaterials.map(m => m.value), 0);
  const stock = data.inventory.stockCounts;
  const stockSegments = [
    { key: "in-stock", label: "Well stocked", count: stock["in-stock"], color: STATUS.good, icon: CheckCircle2 },
    { key: "low", label: "Low", count: stock.low, color: STATUS.warning, icon: AlertTriangle },
    { key: "out", label: "Out", count: stock.out, color: STATUS.critical, icon: AlertOctagon },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Dashboard"
        description={`Business performance · ${data.range.label}`}
        actions={
          <div className="inline-flex rounded-lg bg-card p-1 shadow-card" role="group" aria-label="Reporting period">
            {PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  period === p.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {period !== "all" && (
        <p className="-mt-3 mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          The period ends at the latest month with recorded activity. Figures marked <NowBadge /> are as of today and ignore the period.
        </p>
      )}

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Billed" value={formatCurrency(kpis.billed)} hint={`${kpis.invoicesInPeriod} invoice${kpis.invoicesInPeriod === 1 ? "" : "s"} issued`} />
        <KpiTile
          label="Collected"
          value={formatCurrency(kpis.collected)}
          hint={kpis.collectionRate === null ? "Nothing billed yet" : (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, kpis.collectionRate * 100)}%`, backgroundColor: SERIES.collected }} />
              </span>
              {formatPercent(kpis.collectionRate)} of billed
            </span>
          )}
        />
        <KpiTile
          label="Outstanding"
          now
          value={formatCurrency(kpis.outstanding)}
          tone={kpis.overdueAmount > 0 ? "critical" : undefined}
          hint={kpis.overdueAmount > 0 ? (
            <span className="flex items-center gap-1 font-medium text-red-700">
              <AlertCircle className="h-3.5 w-3.5" />{formatCurrency(kpis.overdueAmount)} overdue · {kpis.overdueCount} invoice{kpis.overdueCount === 1 ? "" : "s"}
            </span>
          ) : "Nothing overdue"}
        />
        <KpiTile
          label="Open Pipeline"
          now
          value={formatCurrency(kpis.pipelineValue)}
          hint={`${kpis.pipelineCount} open quotation${kpis.pipelineCount === 1 ? "" : "s"} · win rate ${kpis.decided ? formatPercent(kpis.winRate) : "— (no decisions yet)"}`}
        />
      </div>

      {/* Secondary counts */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border shadow-card sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Customers", value: data.counts.customers, icon: Users, to: "/customers" },
          { label: "Active projects", value: `${data.counts.activeProjects} / ${data.counts.projects}`, icon: FolderKanban, to: "/projects" },
          { label: "Employees", value: data.counts.employees, icon: UserCheck, to: "/employees" },
          { label: "Furniture templates", value: data.counts.templates, icon: Hammer, to: "/furniture-builder" },
          { label: "Inventory value", value: formatCompact(data.inventory.value), icon: Warehouse, to: "/materials" },
        ].map(s => (
          <Link key={s.label} to={s.to} className="group flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-slate-50 [&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1">
            <s.icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" />
            <span className="min-w-0">
              <span className="block truncate text-xs text-muted-foreground">{s.label}</span>
              <span className="block text-base font-semibold text-foreground">{s.value}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {/* Cash flow */}
        <Card
          className="lg:col-span-2"
          title="Cash flow"
          subtitle="Invoices billed, payments collected, and supplier purchases received per month"
          actions={
            <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Cash flow view">
              {([["chart", BarChart3, "Chart"], ["table", Table2, "Table"]] as const).map(([view, Icon, label]) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setCashView(view)}
                  aria-pressed={cashView === view}
                  className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs font-medium", cashView === view ? "bg-slate-100 text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          }
        >
          <div className="mb-3 grid grid-cols-3 gap-3">
            {SERIES_META.map(s => (
              <div key={s.key} className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">{formatCompact(kpis[s.key])}</p>
              </div>
            ))}
          </div>

          {!hasCashFlow ? (
            <p className="flex h-[260px] items-center justify-center rounded-xl bg-slate-50 text-sm text-muted-foreground">No billing, payments, or received purchases in this period.</p>
          ) : cashView === "chart" ? (
            <div className="h-[260px]" role="img" aria-label={`Cash flow chart, ${data.range.label}. Switch to table view for exact values.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cashFlow} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHROME.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHROME.axis }} tick={{ fill: CHROME.muted, fontSize: 11 }} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: CHROME.muted, fontSize: 11 }} tickFormatter={v => formatCompact(Number(v))} width={64} />
                  <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(15, 23, 42, 0.04)" }} />
                  {SERIES_META.map(s => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="max-h-[260px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Month</th>
                    {SERIES_META.map(s => <th key={s.key} className="px-3 py-2 text-right font-medium">{s.label}</th>)}
                    <th className="px-3 py-2 text-right font-medium">Net cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.cashFlow.map(m => {
                    const net = m.collected - m.purchases;
                    return (
                      <tr key={m.key}>
                        <td className="px-3 py-2 text-foreground">{m.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.billed)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.collected)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.purchases)}</td>
                        <td className={cn("px-3 py-2 text-right font-medium tabular-nums", net < 0 ? "text-red-700" : "text-foreground")}>{formatCurrency(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Needs attention */}
        <Card title="Needs attention" badge={<NowBadge />}>
          {data.attention.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground">No overdue invoices, late deliveries, or restocks.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.attention.map(item => {
                const style = ATTENTION_STYLE[item.tone];
                return (
                  <li key={item.id}>
                    <Link to={item.to} className="group flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-slate-300 hover:bg-slate-50">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", style.className)}>
                        <style.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground" title={item.detail}>{item.detail}</span>
                      </span>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Quotation funnel */}
        <Card title="Quotation funnel" subtitle="Quotations created in the period, by furthest stage reached">
          {data.funnel[0].count === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No quotations created in this period.</p>
          ) : (
            <>
              <ol className="space-y-3">
                {data.funnel.map((f, i) => {
                  const prev = data.funnel[i - 1];
                  return (
                    <li key={f.stage}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-slate-700">{f.stage}</span>
                        <span className="font-semibold text-foreground">
                          {f.count}<span className="ml-1.5 text-xs font-normal text-muted-foreground">{formatCompact(f.value)}</span>
                        </span>
                      </div>
                      <div className="h-6 rounded-md bg-slate-100">
                        <div
                          className="h-full rounded-md transition-[width] duration-500"
                          style={{ width: `${funnelMax > 0 ? Math.max(f.value > 0 ? 2 : 0, (f.value / funnelMax) * 100) : 0}%`, backgroundColor: FUNNEL_RAMP[i] }}
                          title={`${f.stage}: ${f.count} · ${formatCurrency(f.value)}`}
                        />
                      </div>
                      {prev && prev.count > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{formatPercent(f.count / prev.count)} of {prev.stage.toLowerCase()}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Win rate <span className="text-xs">(approved ÷ decided)</span></span>
                <span className="whitespace-nowrap font-semibold text-foreground">{kpis.decided ? formatPercent(kpis.winRate) : "No decisions yet"}</span>
              </div>
            </>
          )}
        </Card>

        {/* Receivables aging */}
        <Card title="Receivables aging" badge={<NowBadge />} subtitle={`${formatCurrency(kpis.outstanding)} unpaid across open invoices`}>
          {kpis.outstanding === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No unpaid invoice balances.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.aging.map(bucket => {
                const s = AGING_STYLE[bucket.id];
                return (
                  <BarRow
                    key={bucket.id}
                    label={bucket.label}
                    icon={<s.icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />}
                    value={bucket.amount}
                    max={agingMax}
                    color={s.color}
                    display={formatCurrency(bucket.amount)}
                    sub={bucket.count ? `${bucket.count} inv` : undefined}
                  />
                );
              })}
            </ul>
          )}
          <Link to="/invoices" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View invoices <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        {/* Inventory health */}
        <Card title="Inventory health" badge={<NowBadge />} subtitle={`${data.inventory.total} materials · ${formatCurrency(data.inventory.value)} on hand`}>
          {data.inventory.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No materials yet.</p>
          ) : (
            <>
              <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={stockSegments.map(s => `${s.label}: ${s.count}`).join(", ")}>
                {stockSegments.filter(s => s.count > 0).map(s => (
                  <div key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: s.count, backgroundColor: s.color }} title={`${s.label}: ${s.count}`} />
                ))}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {stockSegments.map(s => (
                  <li key={s.key} className="flex items-center gap-1 text-slate-600">
                    <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />{s.label}
                    <span className="font-semibold text-foreground">{s.count}</span>
                  </li>
                ))}
              </ul>

              <p className="label-caps mb-1.5 mt-5">Stock value by category</p>
              <ul className="space-y-1">
                {data.inventory.byCategory.map(c => (
                  <BarRow key={c.id} label={c.name} value={c.value} max={categoryMax} color={SERIES.billed} display={formatCompact(c.value)} />
                ))}
              </ul>

              {data.inventory.lowStock.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />Below threshold</p>
                  <ul className="space-y-1 text-xs">
                    {data.inventory.lowStock.map(m => (
                      <li key={m.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-700">{m.name}</span>
                        <span className="shrink-0 tabular-nums text-slate-600">
                          {m.stock}/{m.threshold} {m.unit}
                          {m.onOrder && <span className="ml-1.5 font-medium text-violet-700">on order</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Top materials */}
        <Card title="Top materials quoted" subtitle="By quoted value in the period">
          {data.topMaterials.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No quoted materials in this period.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topMaterials.map(m => (
                <BarRow
                  key={m.id}
                  label={m.name}
                  value={m.value}
                  max={materialMax}
                  color={SERIES.billed}
                  display={formatCurrency(m.value)}
                  sub={`${m.quantity} ${m.unit}`}
                />
              ))}
            </ul>
          )}
        </Card>

        {/* Agent performance */}
        <Card title="Agent performance" subtitle="Quotations assigned in the period">
          {data.agents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No active sales agents.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">Agent</th>
                    <th className="px-2 py-2 text-right font-medium">Quotes</th>
                    <th className="px-2 py-2 text-right font-medium">Won</th>
                    <th className="px-2 py-2 text-right font-medium">Win</th>
                    <th className="px-2 py-2 text-right font-medium">Comm.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.agents.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-2 py-2.5">
                        <Link to={`/employees/${a.id}`} className="flex items-center gap-2 font-medium text-foreground hover:text-primary">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                            {a.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </span>
                          <span className="truncate">{a.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{a.quotes}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{formatCompact(a.approvedValue)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{formatPercent(a.winRate)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{formatCompact(a.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card title="Recent activity">
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-4">
              {activities.map(a => {
                const user = a.userId ? store.getUser(a.userId) : null;
                return (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-card" />
                    <p className="text-sm text-foreground">{a.details}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="capitalize">{a.action}</span> · {user?.name || "System"} · {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
