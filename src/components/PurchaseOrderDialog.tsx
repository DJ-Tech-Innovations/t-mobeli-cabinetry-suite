import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { store, formatCurrency, purchaseOrderTotal, todayISO, type PurchaseOrder, type PurchaseOrderItem } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

const uid = () => `poline-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type PurchaseOrderFormData = Pick<PurchaseOrder, "supplierId" | "expectedDate" | "items" | "notes">;

export interface PurchaseOrderPreset {
  supplierId: string;
  items: Omit<PurchaseOrderItem, "id">[];
  notes?: string;
}

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Order to edit, or null to create */
  order: PurchaseOrder | null;
  /** Initial values for a new order (e.g. restock suggestions) */
  preset?: PurchaseOrderPreset;
  onSave: (data: PurchaseOrderFormData) => void;
}

export function PurchaseOrderDialog({ open, onOpenChange, order, preset, onSave }: PurchaseOrderDialogProps) {
  const materials = store.getMaterials();

  const [form, setForm] = useState<PurchaseOrderFormData>(() => {
    if (order) return { supplierId: order.supplierId, expectedDate: order.expectedDate, items: order.items.map(i => ({ ...i })), notes: order.notes };
    if (preset) return { supplierId: preset.supplierId, expectedDate: "", items: preset.items.map(i => ({ ...i, id: uid() })), notes: preset.notes ?? "" };
    return { supplierId: "", expectedDate: "", items: [{ id: uid(), materialId: "", quantity: 1, unitPrice: 0 }], notes: "" };
  });

  // Active suppliers, plus the current one even if it was deactivated
  const suppliers = store.getSuppliers().filter(s => s.status === "active" || s.id === form.supplierId);
  // Materials from the chosen supplier are listed first
  const sortedMaterials = [...materials].sort(
    (a, b) => Number(b.supplierId === form.supplierId) - Number(a.supplierId === form.supplierId) || a.name.localeCompare(b.name),
  );

  const total = purchaseOrderTotal(form);

  const updateItem = (id: string, patch: Partial<PurchaseOrderItem>) =>
    setForm(f => ({ ...f, items: f.items.map(i => (i.id === id ? { ...i, ...patch } : i)) }));

  const submit = () => {
    if (!form.supplierId) { toast.error("Select a supplier"); return; }
    if (form.items.length === 0) { toast.error("Add at least one item"); return; }
    if (form.items.some(i => !i.materialId)) { toast.error("Select a material for every item"); return; }
    if (new Set(form.items.map(i => i.materialId)).size !== form.items.length) { toast.error("Each material can only appear once — combine the quantities"); return; }
    if (form.items.some(i => !(i.quantity > 0))) { toast.error("Quantities must be greater than 0"); return; }
    if (form.items.some(i => !(i.unitPrice >= 0))) { toast.error("Unit prices can't be negative"); return; }
    if (!order && form.expectedDate && form.expectedDate < todayISO()) { toast.error("Expected delivery date can't be in the past"); return; }
    onSave({ ...form, notes: form.notes.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{order ? `Edit ${order.number}` : "New Purchase Order"}</DialogTitle>
          {preset && !order && <DialogDescription>Pre-filled with materials below their restock threshold. Adjust quantities before creating.</DialogDescription>}
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.status === "inactive" ? " (inactive)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expected Delivery Date</Label>
              <Input type="date" value={form.expectedDate} min={order ? undefined : todayISO()} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Material</th>
                    <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
                    <th className="w-28 px-2 py-2 text-right font-medium">Unit Price</th>
                    <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                    <th className="w-10"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {form.items.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No items. Click Add Item.</td></tr>
                  ) : form.items.map(item => {
                    const material = materials.find(m => m.id === item.materialId);
                    return (
                      <tr key={item.id}>
                        <td className="px-2 py-1.5">
                          <Select
                            value={item.materialId}
                            onValueChange={v => updateItem(item.id, { materialId: v, unitPrice: materials.find(m => m.id === v)?.unitPrice ?? item.unitPrice })}
                          >
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select material" /></SelectTrigger>
                            <SelectContent>
                              {sortedMaterials.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                  <span className="ml-1 text-xs text-muted-foreground">· {m.stock} {m.unit} in stock</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1.5">
                          <Input type="number" min={0} step="any" value={item.quantity} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} className="h-9 text-right tabular-nums" aria-label="Quantity" />
                        </td>
                        <td className="px-1 py-1.5">
                          <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, { unitPrice: Number(e.target.value) })} className="h-9 text-right tabular-nums" aria-label="Unit price" />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                          {formatCurrency(item.quantity * item.unitPrice)}
                          {material && <span className="block text-[11px] font-normal text-muted-foreground">{material.unit}</span>}
                        </td>
                        <td className="pr-1">
                          <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => setForm(f => ({ ...f, items: f.items.filter(i => i.id !== item.id) }))} aria-label="Remove item">
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { id: uid(), materialId: "", quantity: 1, unitPrice: 0 }] }))}>
                <Plus className="mr-1.5 h-4 w-4" />Add Item
              </Button>
              <p className={cn("text-sm", total > 0 ? "text-foreground" : "text-muted-foreground")}>
                Total: <span className="text-base font-bold tabular-nums">{formatCurrency(total)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{order ? "Save Changes" : "Create Purchase Order"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
