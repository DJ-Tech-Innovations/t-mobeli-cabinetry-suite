import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  store, formatCurrency, computeInvoiceTotals, computeQuotationTotals, todayISO, addDaysISO, PAYMENT_METHODS,
  type Invoice, type InvoiceLineItem, type InvoicePayment, type PaymentMethod,
} from "@/lib/data";
import { FileDown, Plus, Send, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const NONE = "none";
const uid = () => `line-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type InvoiceFormData = Omit<Invoice, "id" | "number" | "payments" | "createdAt">;

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Invoice to edit, or null to create */
  invoice: Invoice | null;
  onSave: (data: InvoiceFormData) => void;
}

export function InvoiceFormDialog({ open, onOpenChange, invoice, onSave }: InvoiceFormDialogProps) {
  const customers = store.getCustomers();
  const today = todayISO();

  const [form, setForm] = useState<InvoiceFormData>(() =>
    invoice
      ? {
          customerId: invoice.customerId, projectId: invoice.projectId, issueDate: invoice.issueDate, dueDate: invoice.dueDate,
          items: invoice.items.map(i => ({ ...i })), discountPercent: invoice.discountPercent, vatPercent: invoice.vatPercent,
          notes: invoice.notes, status: invoice.status,
        }
      : {
          customerId: customers[0]?.id ?? "", projectId: "", issueDate: today, dueDate: addDaysISO(today, 30),
          items: [{ id: uid(), description: "", quantity: 1, unitPrice: 0 }], discountPercent: 0, vatPercent: 12,
          notes: "Payment due within 30 days.", status: "draft",
        },
  );

  const projects = form.customerId ? store.getProjectsByCustomer(form.customerId) : [];
  const quotations = (form.projectId ? store.getQuotationsByProject(form.projectId) : projects.flatMap(p => store.getQuotationsByProject(p.id)))
    .filter(q => q.status !== "rejected")
    .sort((a, b) => Number(b.status === "approved") - Number(a.status === "approved"));

  const totals = computeInvoiceTotals({ ...form, payments: invoice?.payments ?? [] });

  const updateItem = (id: string, patch: Partial<InvoiceLineItem>) =>
    setForm(f => ({ ...f, items: f.items.map(i => (i.id === id ? { ...i, ...patch } : i)) }));

  const importQuotation = (quotationId: string) => {
    const q = store.getQuotation(quotationId);
    if (!q) return;
    const { total } = computeQuotationTotals(q);
    setForm(f => ({
      ...f,
      projectId: f.projectId || q.projectId,
      // Replace a single blank starter row instead of appending after it
      items: [
        ...f.items.filter(i => i.description.trim() || i.unitPrice > 0),
        { id: uid(), description: `${q.description} - Labor & Materials`, quantity: 1, unitPrice: Math.round(total * 100) / 100 },
      ],
    }));
    toast.success(`Imported ${q.id.toUpperCase()} (${formatCurrency(total)})`);
  };

  const submit = (status: Invoice["status"]) => {
    if (!form.customerId) { toast.error("Select a customer"); return; }
    if (!form.issueDate || !form.dueDate) { toast.error("Issue and due dates are required"); return; }
    if (form.dueDate < form.issueDate) { toast.error("Due date can't be before the issue date"); return; }
    const items = form.items.map(i => ({ ...i, description: i.description.trim() }));
    if (items.length === 0) { toast.error("Add at least one line item"); return; }
    if (items.some(i => !i.description)) { toast.error("Every line item needs a description"); return; }
    if (items.some(i => !(i.quantity > 0) || i.unitPrice < 0)) { toast.error("Quantities must be above 0 and prices can't be negative"); return; }
    if ([form.discountPercent, form.vatPercent].some(n => !(n >= 0 && n <= 100))) { toast.error("Discount and VAT must be between 0 and 100%"); return; }
    if (invoice && totals.total < totals.paid) {
      toast.error(`Total can't be lower than the ${formatCurrency(totals.paid)} already paid`);
      return;
    }
    onSave({ ...form, items, notes: form.notes.trim(), status });
  };

  const locked = invoice && invoice.status !== "draft";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{invoice ? `Edit Invoice — ${invoice.number}` : "New Invoice"}</DialogTitle>
          <DialogDescription>
            {invoice ? "Update billing details. Recorded payments are kept." : "Bill a customer. Import an approved quotation or enter line items manually."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v, projectId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={form.projectId || NONE} onValueChange={v => setForm(f => ({ ...f, projectId: v === NONE ? "" : v }))} disabled={!form.customerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issue Date *</Label>
              <Input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <div className="flex gap-2">
                <Input type="date" value={form.dueDate} min={form.issueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                <Select value="" onValueChange={v => form.issueDate && setForm(f => ({ ...f, dueDate: addDaysISO(f.issueDate, Number(v)) }))}>
                  <SelectTrigger className="w-28 shrink-0"><SelectValue placeholder="Terms" /></SelectTrigger>
                  <SelectContent>
                    {[0, 7, 15, 30, 45, 60].map(d => <SelectItem key={d} value={String(d)}>{d === 0 ? "On receipt" : `Net ${d}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="label-caps">Line Items</p>
              <div className="flex flex-wrap gap-2">
                {quotations.length > 0 && (
                  <Select value="" onValueChange={importQuotation}>
                    <SelectTrigger className="h-9 w-auto gap-2 text-sm">
                      <FileDown className="h-4 w-4" /><SelectValue placeholder="Import quotation" />
                    </SelectTrigger>
                    <SelectContent>
                      {quotations.map(q => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.id.toUpperCase()} · {q.description} · {formatCurrency(computeQuotationTotals(q).total)} ({q.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { id: uid(), description: "", quantity: 1, unitPrice: 0 }] }))}>
                  <Plus className="mr-1.5 h-4 w-4" />Add Line
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
                    <th className="w-32 px-2 py-2 text-right font-medium">Unit Price</th>
                    <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                    <th className="w-10"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {form.items.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No line items.</td></tr>
                  ) : form.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">
                        <Input value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="e.g. Installation & Finishing" className="h-9" />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="number" min={0} step="any" value={item.quantity} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} className="h-9 text-right tabular-nums" />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, { unitPrice: Number(e.target.value) })} className="h-9 text-right tabular-nums" />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      <td className="pr-1">
                        <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => setForm(f => ({ ...f, items: f.items.filter(i => i.id !== item.id) }))} aria-label="Remove line">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Discount (%)</Label>
                  <Input type="number" min={0} max={100} value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>VAT (%)</Label>
                  <Input type="number" min={0} max={100} value={form.vatPercent} onChange={e => setForm(f => ({ ...f, vatPercent: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, bank details..." />
              </div>
            </div>
            <InvoiceTotals totals={totals} discountPercent={form.discountPercent} vatPercent={form.vatPercent} showBalance={!!invoice && totals.paid > 0} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          {locked ? (
            <Button onClick={() => submit(invoice.status)}><Save className="mr-2 h-4 w-4" />Save Changes</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => submit("draft")}><Save className="mr-2 h-4 w-4" />Save as Draft</Button>
              <Button onClick={() => submit("sent")}><Send className="mr-2 h-4 w-4" />{invoice ? "Save & Send" : "Create & Send"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InvoiceTotals({
  totals, discountPercent, vatPercent, showBalance,
}: {
  totals: ReturnType<typeof computeInvoiceTotals>;
  discountPercent: number;
  vatPercent: number;
  showBalance: boolean;
}) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd></div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-emerald-700"><dt>Discount ({discountPercent}%)</dt><dd className="tabular-nums">-{formatCurrency(totals.discount)}</dd></div>
      )}
      <div className="flex justify-between"><dt className="text-muted-foreground">VAT ({vatPercent}%)</dt><dd className="tabular-nums">{formatCurrency(totals.vat)}</dd></div>
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCurrency(totals.total)}</dd></div>
      {showBalance && (
        <>
          <div className="flex justify-between text-emerald-700"><dt>Paid</dt><dd className="tabular-nums">-{formatCurrency(totals.paid)}</dd></div>
          <div className={`flex justify-between rounded-md px-2 py-1 font-semibold ${totals.balance > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            <dt>Balance</dt><dd className="tabular-nums">{formatCurrency(totals.balance)}</dd>
          </div>
        </>
      )}
    </dl>
  );
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSave: (payment: Omit<InvoicePayment, "id">) => void;
}

export function RecordPaymentDialog({ open, onOpenChange, invoice, onSave }: RecordPaymentDialogProps) {
  const totals = invoice ? computeInvoiceTotals(invoice) : null;
  const [amount, setAmount] = useState(totals?.balance ?? 0);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("bank-transfer");
  const [reference, setReference] = useState("");

  if (!invoice || !totals) return null;

  const submit = () => {
    const value = Math.round(amount * 100) / 100;
    if (!(value > 0)) { toast.error("Enter an amount greater than 0"); return; }
    if (value > totals.balance) { toast.error(`Amount can't exceed the ${formatCurrency(totals.balance)} balance`); return; }
    if (!date) { toast.error("Payment date is required"); return; }
    onSave({ amount: value, date, method, reference: reference.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Record Payment</DialogTitle>
          <DialogDescription>{invoice.number} · {store.getCustomer(invoice.customerId)?.name}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
          <div><p className="text-muted-foreground">Total</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{formatCurrency(totals.total)}</p></div>
          <div><p className="text-muted-foreground">Paid</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700">{formatCurrency(totals.paid)}</p></div>
          <div><p className="text-muted-foreground">Balance</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-red-600">{formatCurrency(totals.balance)}</p></div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount (₱) *</Label>
            <div className="flex gap-2">
              <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} className="tabular-nums" />
              <Button type="button" variant="outline" onClick={() => setAmount(Math.round((totals.balance / 2) * 100) / 100)}>50%</Button>
              <Button type="button" variant="outline" onClick={() => setAmount(totals.balance)}>Full</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reference</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="OR no., transaction ID, check no." />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-emerald-600 text-white hover:bg-emerald-700">Record {formatCurrency(amount > 0 ? amount : 0)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
