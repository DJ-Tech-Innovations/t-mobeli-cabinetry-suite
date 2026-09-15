import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InvoiceFormDialog, InvoiceTotals, RecordPaymentDialog, type InvoiceFormData } from "@/components/InvoiceDialogs";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { InvoiceDocument } from "@/components/print/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  store, formatCurrency, computeInvoiceTotals, getInvoiceStatus, todayISO, PAYMENT_METHODS,
  type Invoice, type InvoiceStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Ban, CheckCircle2, ChevronDown, CircleDollarSign, Clock, CreditCard, FileEdit, Pencil, Plus,
  Printer, Receipt, Search, Send, Trash2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_META: Record<InvoiceStatus, { label: string; className: string; icon: typeof Send }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 ring-slate-500/20", icon: FileEdit },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: Send },
  partial: { label: "Partial", className: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: Clock },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2 },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 ring-red-600/20", icon: AlertCircle },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 ring-slate-400/20", icon: Ban },
};

const FILTERS: ("all" | InvoiceStatus)[] = ["all", "draft", "sent", "partial", "paid", "overdue", "cancelled"];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

type Confirm = { kind: "cancel" | "delete"; invoice: Invoice } | null;

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState(store.getInvoices());
  const [filter, setFilter] = useState<"all" | InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(invoices[0] ? [invoices[0].id] : []));
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [payKey, setPayKey] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const today = todayISO();
  const refresh = () => setInvoices(store.getInvoices());

  const rows = invoices.map(inv => ({
    inv,
    status: getInvoiceStatus(inv, today),
    totals: computeInvoiceTotals(inv),
    customer: store.getCustomer(inv.customerId),
    project: inv.projectId ? store.getProject(inv.projectId) : undefined,
  }));

  const billable = rows.filter(r => r.status !== "draft" && r.status !== "cancelled");
  const totalBilled = billable.reduce((s, r) => s + r.totals.total, 0);
  const totalCollected = billable.reduce((s, r) => s + r.totals.paid, 0);
  const outstanding = billable.reduce((s, r) => s + r.totals.balance, 0);
  const overdueRows = rows.filter(r => r.status === "overdue");

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "all" ? rows.length : rows.filter(r => r.status === f).length;
    return acc;
  }, {} as Record<(typeof FILTERS)[number], number>);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(r =>
    (filter === "all" || r.status === filter) &&
    (!q || [r.inv.number, r.customer?.name ?? "", r.project?.name ?? ""].some(v => v.toLowerCase().includes(q))),
  );

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const openForm = (inv: Invoice | null) => {
    setEditing(inv);
    setFormKey(k => k + 1);
    setFormOpen(true);
  };

  const handleSave = (data: InvoiceFormData) => {
    if (editing) {
      store.updateInvoice(editing.id, data);
      toast.success(`${editing.number} updated`);
    } else {
      const inv = store.addInvoice(data);
      setExpanded(prev => new Set(prev).add(inv.id));
      toast.success(`${inv.number} ${data.status === "sent" ? "created and marked as sent" : "saved as draft"}`);
    }
    refresh();
    setFormOpen(false);
  };

  const openPayment = (inv: Invoice) => {
    setPaying(inv);
    setPayKey(k => k + 1);
  };

  const handlePrint = (id: string) => setPreviewId(id);
  const previewInvoice = previewId ? store.getInvoice(previewId) : undefined;

  const handleConfirm = () => {
    if (!confirm) return;
    const { kind, invoice } = confirm;
    if (kind === "cancel") {
      store.updateInvoice(invoice.id, { status: "cancelled" });
      toast.success(`${invoice.number} cancelled`);
    } else {
      store.deleteInvoice(invoice.id);
      toast.success(`${invoice.number} deleted`);
    }
    setConfirm(null);
    refresh();
  };

  const stats = [
    { label: "Total Billed", value: totalBilled, color: "text-foreground", hint: `${billable.length} issued invoice${billable.length === 1 ? "" : "s"}` },
    { label: "Total Collected", value: totalCollected, color: "text-emerald-600", hint: totalBilled > 0 ? `${Math.round((totalCollected / totalBilled) * 100)}% of billed` : "No payments yet" },
    { label: "Outstanding", value: outstanding, color: outstanding > 0 ? "text-red-600" : "text-foreground", hint: overdueRows.length ? `${overdueRows.length} overdue` : "Nothing overdue" },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <PageHeader
          title="Invoices"
          description="Track billing, payments, and outstanding balances"
          actions={<Button onClick={() => openForm(null)}><Plus className="mr-2 h-4 w-4" />New Invoice</Button>}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl bg-card p-5 shadow-card">
              <p className="label-caps">{s.label}</p>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", s.color)}>{formatCurrency(s.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>

        {invoices.length > 0 && (
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
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === f ? "bg-white/20" : "bg-slate-100", f === "overdue" && counts.overdue > 0 && filter !== f && "bg-red-100 text-red-700")}>
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoice, customer, project..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card pl-9" />
            </div>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={<Receipt className="h-6 w-6" />} title="No invoices yet" description="Create an invoice to start tracking billing and payments." actionLabel="New Invoice" onAction={() => openForm(null)} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-card">No invoices match your filters.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ inv, status, totals, customer, project }) => {
            const meta = STATUS_META[status];
            const isOpen = expanded.has(inv.id);
            const payable = ["sent", "partial", "overdue"].includes(status);
            const StatusIcon = meta.icon;
            return (
              <div
                key={inv.id}
                className={cn(
                  "overflow-hidden rounded-2xl bg-card shadow-card",
                  status === "cancelled" && "opacity-70",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(inv.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-slate-50"
                >
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("font-semibold text-foreground", status === "cancelled" && "line-through")}>{inv.number}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", meta.className)}>
                        <StatusIcon className="h-3 w-3" />{meta.label}
                      </span>
                      {payable && <span className="text-xs font-medium text-red-600">Balance: {formatCurrency(totals.balance)}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {customer?.name ?? "Unknown customer"}{project && ` · ${project.name}`} · Due {formatDate(inv.dueDate)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums text-foreground">{formatCurrency(totals.total)}</span>
                    {totals.paid > 0 && status !== "paid" && <span className="block text-xs tabular-nums text-emerald-600">{formatCurrency(totals.paid)} paid</span>}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform print:hidden", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="px-5 py-2.5 text-left font-medium">Description</th>
                            <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                            <th className="px-3 py-2.5 text-right font-medium">Unit Price</th>
                            <th className="px-5 py-2.5 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {inv.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-5 py-2.5 text-foreground">{item.description}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 gap-6 px-5 py-4 md:grid-cols-[1fr_280px]">
                      <div className="space-y-3 text-sm">
                        <p className="text-xs text-muted-foreground">Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}</p>
                        {inv.payments.length > 0 && (
                          <div>
                            <p className="label-caps mb-2">Payments</p>
                            <ul className="divide-y divide-border rounded-lg border border-border">
                              {inv.payments.map(p => (
                                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                  <span className="flex items-center gap-2">
                                    <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                                    <span>{formatDate(p.date)} · {PAYMENT_METHODS.find(m => m.id === p.method)?.label}</span>
                                    {p.reference && <span className="text-xs text-muted-foreground">Ref {p.reference}</span>}
                                  </span>
                                  <span className="font-medium tabular-nums text-emerald-700">{formatCurrency(p.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {inv.notes && <p className="italic text-muted-foreground">Note: {inv.notes}</p>}
                      </div>
                      <InvoiceTotals totals={totals} discountPercent={inv.discountPercent} vatPercent={inv.vatPercent} showBalance={status !== "draft" && status !== "cancelled"} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 print:hidden">
                      {payable && (
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => openPayment(inv)}>
                          <CreditCard className="mr-1.5 h-4 w-4" />Record Payment
                        </Button>
                      )}
                      {status === "draft" && (
                        <Button size="sm" onClick={() => { store.updateInvoice(inv.id, { status: "sent" }); refresh(); toast.success(`${inv.number} marked as sent`); }}>
                          <Send className="mr-1.5 h-4 w-4" />Mark as Sent
                        </Button>
                      )}
                      {status !== "cancelled" && status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => openForm(inv)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handlePrint(inv.id)}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
                      {status === "draft" ? (
                        <Button size="sm" variant="outline" className="border-red-200 text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => setConfirm({ kind: "delete", invoice: inv })}>
                          <Trash2 className="mr-1.5 h-4 w-4" />Delete
                        </Button>
                      ) : payable && totals.paid === 0 && (
                        <Button size="sm" variant="outline" className="border-red-200 text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => setConfirm({ kind: "cancel", invoice: inv })}>
                          <Ban className="mr-1.5 h-4 w-4" />Cancel
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

      {previewInvoice && (
        <PrintPreviewDialog
          open
          onOpenChange={o => !o && setPreviewId(null)}
          title={`Invoice ${previewInvoice.number}`}
          documentName={`${previewInvoice.number} - ${store.getCustomer(previewInvoice.customerId)?.name ?? "Customer"}`}
        >
          <InvoiceDocument invoice={previewInvoice} />
        </PrintPreviewDialog>
      )}

      <InvoiceFormDialog key={`form-${formKey}`} open={formOpen} onOpenChange={setFormOpen} invoice={editing} onSave={handleSave} />

      <RecordPaymentDialog
        key={`pay-${payKey}`}
        open={!!paying}
        onOpenChange={o => !o && setPaying(null)}
        invoice={paying}
        onSave={payment => {
          if (!paying) return;
          const updated = store.recordPayment(paying.id, payment);
          const balance = updated ? computeInvoiceTotals(updated).balance : 0;
          toast.success(`Payment of ${formatCurrency(payment.amount)} recorded`, {
            description: balance > 0 ? `Remaining balance ${formatCurrency(balance)}` : `${paying.number} is fully paid`,
          });
          setPaying(null);
          refresh();
        }}
      />

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "delete" ? "Delete draft invoice?" : "Cancel invoice?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "delete"
                ? `${confirm.invoice.number} will be permanently removed. This can't be undone.`
                : `${confirm?.invoice.number} will be marked as cancelled and excluded from billing totals. It stays in the list for your records.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {confirm?.kind === "delete" ? "Delete" : "Cancel Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoicesPage;
