// Derived business analytics for the dashboard. Pure reads over the in-memory store.
import {
  store, computeQuotationTotals, computeInvoiceTotals, getStockStatus, isOpenPurchaseOrder, purchaseOrderTotal, todayISO,
  type Quotation, type StockStatus,
} from "./data";

export type Period = "6m" | "12m" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "6m", label: "6 months" },
  { id: "12m", label: "12 months" },
  { id: "all", label: "All time" },
];

const sum = <T,>(list: T[], pick: (item: T) => number) => Math.round(list.reduce((s, i) => s + pick(i), 0) * 100) / 100;

const monthKey = (iso: string) => iso.slice(0, 7);

const addMonths = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (key: string, style: "short" | "long" = "short") =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-PH", { month: "short", year: style === "short" ? "2-digit" : "numeric" });

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86_400_000);

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export const AGING_BUCKETS: { id: AgingBucket; label: string }[] = [
  { id: "current", label: "Not yet due" },
  { id: "1-30", label: "1–30 days late" },
  { id: "31-60", label: "31–60 days late" },
  { id: "61-90", label: "61–90 days late" },
  { id: "90+", label: "90+ days late" },
];

const agingBucket = (daysLate: number): AgingBucket =>
  daysLate <= 0 ? "current" : daysLate <= 30 ? "1-30" : daysLate <= 60 ? "31-60" : daysLate <= 90 ? "61-90" : "90+";

export interface AttentionItem {
  id: string;
  tone: "critical" | "warning" | "info";
  title: string;
  detail: string;
  to: string;
}

export function buildDashboard(period: Period, today = todayISO()) {
  const quotations = store.getQuotations();
  const invoices = store.getInvoices();
  const purchaseOrders = store.getPurchaseOrders();
  const materials = store.getMaterials();

  const issued = invoices.filter(i => i.status !== "draft" && i.status !== "cancelled");
  const payments = invoices.filter(i => i.status !== "cancelled").flatMap(i => i.payments);
  const received = purchaseOrders.filter(p => p.status === "received" && p.receivedAt);

  // The window ends at the latest month with activity, so sparse or historical data still charts.
  const activityMonths = [
    ...quotations.map(q => q.createdAt),
    ...issued.map(i => i.issueDate),
    ...payments.map(p => p.date),
    ...received.map(p => p.receivedAt as string),
  ]
    .filter(d => d && d <= today)
    .map(monthKey)
    .sort();
  const end = activityMonths[activityMonths.length - 1] ?? monthKey(today);
  const earliest = activityMonths[0] ?? end;
  const start = period === "all" ? earliest : addMonths(end, period === "6m" ? -5 : -11);
  const months: string[] = [];
  for (let k = start; k <= end; k = addMonths(k, 1)) months.push(k);
  const inRange = (iso?: string) => !!iso && monthKey(iso) >= start && monthKey(iso) <= end;

  // Cash flow by month
  const cashFlow = months.map(key => ({
    key,
    label: monthLabel(key),
    billed: sum(issued.filter(i => monthKey(i.issueDate) === key), i => computeInvoiceTotals(i).total),
    collected: sum(payments.filter(p => monthKey(p.date) === key), p => p.amount),
    purchases: sum(received.filter(p => monthKey(p.receivedAt as string) === key), purchaseOrderTotal),
  }));
  const billed = sum(cashFlow, m => m.billed);
  const collected = sum(cashFlow, m => m.collected);
  const purchases = sum(cashFlow, m => m.purchases);
  const invoicesInPeriod = issued.filter(i => inRange(i.issueDate)).length;

  // Receivables — as of today
  const openInvoices = issued
    .map(inv => ({ inv, totals: computeInvoiceTotals(inv) }))
    .filter(r => r.totals.balance > 0);
  const outstanding = sum(openInvoices, r => r.totals.balance);
  const overdueInvoices = openInvoices.filter(r => r.inv.dueDate < today);
  const overdueAmount = sum(overdueInvoices, r => r.totals.balance);
  const aging = AGING_BUCKETS.map(b => {
    const rows = openInvoices.filter(r => agingBucket(daysBetween(r.inv.dueDate, today)) === b.id);
    return { ...b, count: rows.length, amount: sum(rows, r => r.totals.balance) };
  });

  // Quotation funnel — quotations created in the period
  const quoteValue = (q: Quotation) => computeQuotationTotals(q).total;
  const periodQuotes = quotations.filter(q => inRange(q.createdAt));
  const sent = periodQuotes.filter(q => q.status !== "draft");
  const approved = periodQuotes.filter(q => q.status === "approved");
  const rejected = periodQuotes.filter(q => q.status === "rejected");
  const funnel = [
    { stage: "Created", count: periodQuotes.length, value: sum(periodQuotes, quoteValue) },
    { stage: "Sent to client", count: sent.length, value: sum(sent, quoteValue) },
    { stage: "Approved", count: approved.length, value: sum(approved, quoteValue) },
  ];
  const decided = approved.length + rejected.length;
  const winRate = decided > 0 ? approved.length / decided : null;

  // Open pipeline — as of today
  const openQuotes = quotations.filter(q => q.status === "draft" || q.status === "sent");
  const pipelineValue = sum(openQuotes, quoteValue);

  // Top materials by quoted value in the period
  const byMaterial = new Map<string, { value: number; quantity: number }>();
  periodQuotes.forEach(q => q.items.forEach(item => {
    const entry = byMaterial.get(item.materialId) ?? { value: 0, quantity: 0 };
    entry.value += item.totalPrice;
    entry.quantity += item.quantity;
    byMaterial.set(item.materialId, entry);
  }));
  const topMaterials = [...byMaterial.entries()]
    .map(([id, e]) => {
      const m = store.getMaterial(id);
      return { id, name: m?.name ?? "Unknown material", unit: m?.unit ?? "", ...e };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Inventory — as of today
  const onOrder = new Set(purchaseOrders.filter(isOpenPurchaseOrder).flatMap(p => p.items.map(i => i.materialId)));
  const stockCounts: Record<StockStatus, number> = { "in-stock": 0, low: 0, out: 0 };
  materials.forEach(m => { stockCounts[getStockStatus(m)]++; });
  const inventoryValue = sum(materials, m => m.stock * m.unitPrice);
  const inventoryByCategory = store.getCategories()
    .map(c => ({ id: c.id, name: c.name, value: sum(materials.filter(m => m.category === c.id), m => m.stock * m.unitPrice) }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const lowStock = materials
    .filter(m => getStockStatus(m) !== "in-stock")
    .map(m => ({ id: m.id, name: m.name, stock: m.stock, threshold: m.lowStockThreshold, unit: m.unit, onOrder: onOrder.has(m.id) }));

  // Agent performance in the period
  const agents = store.getAgents()
    .map(a => {
      const qs = periodQuotes.filter(q => q.assignedAgentId === a.id);
      const won = qs.filter(q => q.status === "approved");
      const lost = qs.filter(q => q.status === "rejected").length;
      const approvedValue = sum(won, quoteValue);
      return {
        id: a.id,
        name: a.name,
        quotes: qs.length,
        approvedValue,
        winRate: won.length + lost > 0 ? won.length / (won.length + lost) : null,
        commission: Math.round(approvedValue * a.commissionPercent) / 100,
      };
    })
    .sort((a, b) => b.approvedValue - a.approvedValue || b.quotes - a.quotes);

  // Needs attention — as of today
  const attention: AttentionItem[] = [];
  if (overdueInvoices.length) {
    attention.push({ id: "overdue", tone: "critical", title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`, detail: `${formatPeso(overdueAmount)} past due`, to: "/invoices" });
  }
  const latePOs = purchaseOrders.filter(p => isOpenPurchaseOrder(p) && p.expectedDate && p.expectedDate < today);
  if (latePOs.length) {
    attention.push({ id: "late-po", tone: "warning", title: `${latePOs.length} late deliver${latePOs.length === 1 ? "y" : "ies"}`, detail: latePOs.map(p => p.number).join(", "), to: "/purchase-orders" });
  }
  const unordered = lowStock.filter(m => !m.onOrder);
  if (unordered.length) {
    attention.push({ id: "restock", tone: "warning", title: `${unordered.length} material${unordered.length === 1 ? "" : "s"} to restock`, detail: unordered.map(m => m.name).join(", "), to: "/purchase-orders?restock=1" });
  }
  const awaiting = quotations.filter(q => q.status === "sent");
  if (awaiting.length) {
    attention.push({ id: "awaiting", tone: "info", title: `${awaiting.length} quotation${awaiting.length === 1 ? "" : "s"} awaiting decision`, detail: `${formatPeso(sum(awaiting, quoteValue))} in play`, to: "/quotations" });
  }
  const pendingPOs = purchaseOrders.filter(p => p.status === "pending");
  if (pendingPOs.length) {
    attention.push({ id: "po-approval", tone: "info", title: `${pendingPOs.length} purchase order${pendingPOs.length === 1 ? "" : "s"} to approve`, detail: formatPeso(sum(pendingPOs, purchaseOrderTotal)), to: "/purchase-orders" });
  }

  return {
    range: { start, end, months: months.length, label: start === end ? monthLabel(start, "long") : `${monthLabel(start, "long")} – ${monthLabel(end, "long")}` },
    kpis: {
      billed, collected, purchases, invoicesInPeriod,
      collectionRate: billed > 0 ? collected / billed : null,
      outstanding, overdueAmount, overdueCount: overdueInvoices.length,
      pipelineValue, pipelineCount: openQuotes.length, winRate, decided,
    },
    cashFlow,
    aging,
    funnel,
    topMaterials,
    inventory: { stockCounts, value: inventoryValue, byCategory: inventoryByCategory, lowStock, total: materials.length },
    agents,
    attention,
    counts: {
      customers: store.getCustomers().length,
      activeProjects: store.getProjects().filter(p => p.status === "active").length,
      projects: store.getProjects().length,
      employees: store.getEmployees().length,
      templates: store.getTemplates().length,
    },
  };
}

export type DashboardData = ReturnType<typeof buildDashboard>;

const pesoFormat = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const formatPeso = (n: number) => pesoFormat.format(n);

const compactFormat = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 });
export const formatCompact = (n: number) => compactFormat.format(n);

export const formatPercent = (ratio: number | null) => (ratio === null ? "—" : `${Math.round(ratio * 100)}%`);
