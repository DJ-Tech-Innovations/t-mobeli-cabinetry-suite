import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PurchaseOrderDialog, type PurchaseOrderFormData, type PurchaseOrderPreset } from "@/components/PurchaseOrderDialog";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { PurchaseOrderDocument } from "@/components/print/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  store, formatCurrency, getStockStatus, isOpenPurchaseOrder, purchaseOrderTotal, todayISO,
  type PurchaseOrder, type PurchaseOrderStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Ban, Building2, CheckCircle2, ChevronDown, CircleDollarSign, Clock, PackageCheck, Pencil, Plus,
  Printer, RefreshCw, Search, ShoppingCart, ThumbsUp, Trash2, Truck, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_META: Record<PurchaseOrderStatus, { label: string; className: string; dot: string; icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", icon: Clock },
  approved: { label: "Approved", className: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500", icon: ThumbsUp },
  ordered: { label: "Ordered", className: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500", icon: Truck },
  received: { label: "Received", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", icon: PackageCheck },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 ring-slate-400/20", dot: "bg-slate-400", icon: Ban },
};

const FILTERS: ("all" | PurchaseOrderStatus)[] = ["all", "pending", "approved", "ordered", "received", "cancelled"];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

type Confirm = { kind: "receive" | "cancel" | "delete"; order: PurchaseOrder } | null;

const PurchaseOrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState(store.getPurchaseOrders());
  const [, setMaterialsVersion] = useState(0);
  const [filter, setFilter] = useState<"all" | PurchaseOrderStatus>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(orders[0] ? [orders[0].id] : []));
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [preset, setPreset] = useState<PurchaseOrderPreset | undefined>();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const today = todayISO();
  const materials = store.getMaterials();
  const refresh = () => {
    setOrders(store.getPurchaseOrders());
    setMaterialsVersion(v => v + 1);
  };

  // Materials already on an open order don't need another restock suggestion
  const onOrder = new Set(orders.filter(isOpenPurchaseOrder).flatMap(o => o.items.map(i => i.materialId)));
  const lowStock = materials.filter(m => getStockStatus(m) !== "in-stock");
  const toRestock = lowStock.filter(m => !onOrder.has(m.id));

  const rows = orders.map(o => ({ order: o, total: purchaseOrderTotal(o), supplier: store.getSupplier(o.supplierId) }));
  const active = rows.filter(r => r.order.status !== "cancelled");
  const pendingRows = rows.filter(r => isOpenPurchaseOrder(r.order));
  const receivedRows = rows.filter(r => r.order.status === "received");
  const sum = (list: typeof rows) => list.reduce((s, r) => s + r.total, 0);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "all" ? rows.length : rows.filter(r => r.order.status === f).length;
    return acc;
  }, {} as Record<(typeof FILTERS)[number], number>);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(r =>
    (filter === "all" || r.order.status === filter) &&
    (!q || r.order.number.toLowerCase().includes(q) || (r.supplier?.name ?? "").toLowerCase().includes(q) ||
      r.order.items.some(i => (store.getMaterial(i.materialId)?.name ?? "").toLowerCase().includes(q))),
  );

  const openForm = (order: PurchaseOrder | null, withPreset?: PurchaseOrderPreset) => {
    setEditing(order);
    setPreset(withPreset);
    setFormKey(k => k + 1);
    setFormOpen(true);
  };

  const openRestock = () => {
    if (toRestock.length === 0) {
      toast.info(lowStock.length ? "All low-stock materials are already on open orders" : "All materials are well stocked");
      return;
    }
    // Default to the supplier that provides most of the low-stock items
    const tally = new Map<string, number>();
    toRestock.forEach(m => {
      if (store.getSupplier(m.supplierId)?.status === "active") tally.set(m.supplierId, (tally.get(m.supplierId) ?? 0) + 1);
    });
    const supplierId = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    openForm(null, {
      supplierId,
      items: toRestock.map(m => ({ materialId: m.id, quantity: Math.max(1, m.lowStockThreshold * 2 - m.stock), unitPrice: m.unitPrice })),
      notes: "Restock for materials below threshold",
    });
  };

  // /purchase-orders?restock=1 (linked from the Materials page) opens the restock form
  useEffect(() => {
    if (searchParams.get("restock")) {
      openRestock();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = (data: PurchaseOrderFormData) => {
    if (editing) {
      store.updatePurchaseOrder(editing.id, data);
      toast.success(`${editing.number} updated`);
    } else {
      const po = store.addPurchaseOrder(data);
      setExpanded(prev => new Set(prev).add(po.id));
      toast.success(`${po.number} created`, { description: `${formatCurrency(purchaseOrderTotal(po))} · awaiting approval` });
    }
    refresh();
    setFormOpen(false);
  };

  const setStatus = (order: PurchaseOrder, status: PurchaseOrderStatus, message: string) => {
    store.updatePurchaseOrder(order.id, { status });
    toast.success(`${order.number} ${message}`);
    refresh();
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const { kind, order } = confirm;
    if (kind === "receive") {
      store.receivePurchaseOrder(order.id);
      toast.success(`${order.number} received`, { description: `Stock updated for ${order.items.length} material${order.items.length === 1 ? "" : "s"}` });
    } else if (kind === "cancel") {
      store.updatePurchaseOrder(order.id, { status: "cancelled" });
      toast.success(`${order.number} cancelled`);
    } else {
      store.deletePurchaseOrder(order.id);
      toast.success(`${order.number} deleted`);
    }
    setConfirm(null);
    refresh();
  };

  const handlePrint = (id: string) => setPreviewId(id);
  const previewOrder = previewId ? store.getPurchaseOrder(previewId) : undefined;

  const stats = [
    { label: "Total Orders", value: String(rows.length), hint: `${receivedRows.length} received`, icon: ShoppingCart, color: "text-foreground", iconColor: "text-slate-400" },
    { label: "Total Value", value: formatCurrency(sum(active)), hint: "excluding cancelled", icon: CircleDollarSign, color: "text-foreground", iconColor: "text-slate-400" },
    { label: "Pending", value: formatCurrency(sum(pendingRows)), hint: `${pendingRows.length} open order${pendingRows.length === 1 ? "" : "s"}`, icon: Clock, color: pendingRows.length ? "text-amber-600" : "text-foreground", iconColor: "text-amber-500" },
    { label: "Received", value: formatCurrency(sum(receivedRows)), hint: `${receivedRows.length} order${receivedRows.length === 1 ? "" : "s"}`, icon: TrendingUp, color: "text-emerald-600", iconColor: "text-emerald-500" },
  ];

  const confirmOrder = confirm?.order;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <PageHeader
          title="Purchase Orders"
          description="Manage supplier purchase orders and track deliveries"
          actions={
            <>
              <Button
                variant="outline"
                onClick={openRestock}
                className={cn("bg-card", toRestock.length > 0 && "border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800")}
              >
                <RefreshCw className="mr-2 h-4 w-4" />Restock Low Stock ({toRestock.length})
              </Button>
              <Button onClick={() => openForm(null)}><Plus className="mr-2 h-4 w-4" />New Purchase Order</Button>
            </>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="label-caps">{s.label}</p>
                <s.icon className={cn("h-4 w-4", s.iconColor)} />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>

        {lowStock.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 lg:flex-row lg:items-center">
            <p className="flex shrink-0 items-center gap-2 text-sm font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {lowStock.length} material{lowStock.length === 1 ? " is" : "s are"} below restock threshold:
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(m => (
                <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  {m.name} ({m.stock}/{m.lowStockThreshold})
                  {onOrder.has(m.id) && <span className="flex items-center gap-0.5 text-violet-700"><Truck className="h-3 w-3" />on order</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
              {FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    filter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground shadow-card hover:text-foreground",
                  )}
                >
                  {f === "all" ? "All" : STATUS_META[f].label}
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === f ? "bg-white/20" : "bg-slate-100")}>{counts[f]}</span>
                </button>
              ))}
            </div>
            <div className="relative lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search PO, supplier, material..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card pl-9" />
            </div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title="No purchase orders yet" description="Create a purchase order to buy materials from your suppliers." actionLabel="New Purchase Order" onAction={() => openForm(null)} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-card">No purchase orders match your filters.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ order, total, supplier }) => {
            const meta = STATUS_META[order.status];
            const isOpen = expanded.has(order.id);
            const late = isOpenPurchaseOrder(order) && order.expectedDate !== "" && order.expectedDate < today;
            const StatusIcon = meta.icon;
            return (
              <div
                key={order.id}
                className={cn(
                  "overflow-hidden rounded-2xl bg-card shadow-card",
                  order.status === "cancelled" && "opacity-70",
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(order.id)) n.delete(order.id); else n.add(order.id); return n; })}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-slate-50"
                >
                  <span className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 sm:flex">
                    <ShoppingCart className="h-5 w-5" />
                    <span className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", meta.dot)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("font-semibold text-foreground", order.status === "cancelled" && "line-through")}>{order.number}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", meta.className)}>
                        <StatusIcon className="h-3 w-3" />{meta.label}
                      </span>
                      {late && <span className="text-xs font-medium text-red-600">Delivery late</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{supplier?.name ?? "Unknown supplier"}</span>
                      <span>· {order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                      <span>· Created {formatDate(order.createdAt)}</span>
                      {order.expectedDate && <span>· Expected {formatDate(order.expectedDate)}</span>}
                      {order.receivedAt && <span>· Received {formatDate(order.receivedAt)}</span>}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform print:hidden", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="px-5 py-2.5 text-left font-medium">Material</th>
                            <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                            {isOpenPurchaseOrder(order) && <th className="px-3 py-2.5 text-right font-medium print:hidden">Current Stock</th>}
                            <th className="px-3 py-2.5 text-right font-medium">Unit Price</th>
                            <th className="px-5 py-2.5 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items.map(item => {
                            const m = store.getMaterial(item.materialId);
                            return (
                              <tr key={item.id}>
                                <td className="px-5 py-2.5 text-foreground">{m?.name ?? "Unknown material"}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity} <span className="text-muted-foreground">{m?.unit}</span></td>
                                {isOpenPurchaseOrder(order) && (
                                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground print:hidden">
                                    {m ? <>{m.stock} → <span className="font-medium text-emerald-700">{m.stock + item.quantity}</span></> : "—"}
                                  </td>
                                )}
                                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border">
                            <td colSpan={isOpenPurchaseOrder(order) ? 4 : 3} className="px-3 py-3 text-right font-semibold">Total</td>
                            <td className="px-5 py-3 text-right text-base font-bold tabular-nums">{formatCurrency(total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {order.notes && <p className="px-5 pb-4 text-sm italic text-muted-foreground">Note: {order.notes}</p>}

                    <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 print:hidden">
                      {order.status === "pending" && (
                        <Button size="sm" onClick={() => setStatus(order, "approved", "approved")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve</Button>
                      )}
                      {order.status === "approved" && (
                        <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setStatus(order, "ordered", "marked as ordered")}>
                          <Truck className="mr-1.5 h-4 w-4" />Mark as Ordered
                        </Button>
                      )}
                      {isOpenPurchaseOrder(order) && (
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setConfirm({ kind: "receive", order })}>
                          <PackageCheck className="mr-1.5 h-4 w-4" />Receive
                        </Button>
                      )}
                      {order.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => openForm(order)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handlePrint(order.id)}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
                      {isOpenPurchaseOrder(order) && (
                        <Button size="sm" variant="outline" className="border-red-200 text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => setConfirm({ kind: "cancel", order })}>
                          <Ban className="mr-1.5 h-4 w-4" />Cancel
                        </Button>
                      )}
                      {(order.status === "pending" || order.status === "cancelled") && (
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => setConfirm({ kind: "delete", order })}>
                          <Trash2 className="mr-1.5 h-4 w-4" />Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewOrder && (
        <PrintPreviewDialog
          open
          onOpenChange={o => !o && setPreviewId(null)}
          title={`Purchase Order ${previewOrder.number}`}
          documentName={`${previewOrder.number} - ${store.getSupplier(previewOrder.supplierId)?.name ?? "Supplier"}`}
        >
          <PurchaseOrderDocument order={previewOrder} />
        </PrintPreviewDialog>
      )}

      <PurchaseOrderDialog key={`po-${formKey}`} open={formOpen} onOpenChange={setFormOpen} order={editing} preset={preset} onSave={handleSave} />

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "receive" ? `Receive ${confirmOrder?.number}?` : confirm?.kind === "cancel" ? "Cancel purchase order?" : "Delete purchase order?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {confirm?.kind === "receive" && confirmOrder ? (
                  <>
                    <p>These quantities will be added to material stock:</p>
                    <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                      {confirmOrder.items.map(item => {
                        const m = store.getMaterial(item.materialId);
                        return (
                          <li key={item.id} className="flex justify-between gap-3 px-3 py-2 text-foreground">
                            <span>{m?.name ?? "Unknown material (skipped)"}</span>
                            {m && <span className="tabular-nums">{m.stock} → <span className="font-semibold text-emerald-700">{m.stock + item.quantity}</span> {m.unit}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : confirm?.kind === "cancel" ? (
                  <p>{confirmOrder?.number} will be marked as cancelled. It stays in the list for your records and no stock is changed.</p>
                ) : (
                  <p>{confirmOrder?.number} will be permanently removed. This can't be undone.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirm?.kind === "receive" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {confirm?.kind === "receive" ? "Receive & Update Stock" : confirm?.kind === "cancel" ? "Cancel Order" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseOrdersPage;
