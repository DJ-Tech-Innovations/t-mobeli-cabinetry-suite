import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, formatCurrency, computeQuotationTotals, type Quotation, type BOMItem } from "@/lib/data";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const QuotationBuilder = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const projects = store.getProjects();
  const materials = store.getMaterials();

  const existing = !isNew ? store.getQuotation(id) : null;

  const [projectId, setProjectId] = useState(existing?.projectId || searchParams.get('projectId') || projects[0]?.id || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [items, setItems] = useState<BOMItem[]>(existing?.items || []);
  const [opexPercent, setOpexPercent] = useState(existing?.opexPercent ?? 15);
  const [discountPercent, setDiscountPercent] = useState(existing?.discountPercent ?? 0);
  const [marginPercent, setMarginPercent] = useState(existing?.marginPercent ?? 25);
  const [status, setStatus] = useState<Quotation['status']>(existing?.status || 'draft');

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || "");
  const [quantity, setQuantity] = useState(1);

  const quotationForCalc: Quotation = {
    id: existing?.id || 'new',
    projectId,
    description,
    items,
    opexPercent,
    discountPercent,
    marginPercent,
    status,
    createdAt: existing?.createdAt || '',
  };

  const totals = useMemo(() => computeQuotationTotals(quotationForCalc), [items, opexPercent, discountPercent, marginPercent]);

  const handleAddItem = () => {
    const mat = store.getMaterial(selectedMaterialId);
    if (!mat) return;
    const newItem: BOMItem = {
      id: `bom-${Date.now()}`,
      materialId: mat.id,
      quantity,
      unitPrice: mat.unitPrice,
      totalPrice: mat.unitPrice * quantity,
    };
    setItems([...items, newItem]);
    setAddItemOpen(false);
    setQuantity(1);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const handleSave = () => {
    if (!description.trim()) { toast.error("Quotation description is required"); return; }
    if (!projectId) { toast.error("Select a project"); return; }

    const data = { projectId, description, items, opexPercent, discountPercent, marginPercent, status };

    if (isNew) {
      const q = store.addQuotation(data);
      toast.success(`Quotation ${q.id.toUpperCase()} saved`);
      navigate(`/quotations/${q.id}`, { replace: true });
    } else {
      store.updateQuotation(id, data);
      toast.success(`Quotation ${id!.toUpperCase()} updated`);
    }
  };

  const project = store.getProject(projectId);
  const customer = project ? store.getCustomer(project.customerId) : null;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/quotations')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Quotations
      </button>

      <PageHeader
        title={isNew ? "New Quotation" : `Quotation ${id!.toUpperCase()}`}
        description={project?.name}
        actions={
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />{isNew ? "Save Quotation" : "Update Quotation"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h2 className="text-[length:var(--font-size-h2)] font-semibold">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Project *</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as Quotation['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Kitchen Upper & Lower Cabinets" />
            </div>
          </div>

          {/* Bill of Materials */}
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-[length:var(--font-size-h2)] font-semibold">Bill of Materials</h2>
              <Button size="sm" onClick={() => setAddItemOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No items added yet. Click "Add Item" to start building the BOM.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Material</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Qty</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Unit Price</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Total</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {items.map(item => {
                      const mat = store.getMaterial(item.materialId);
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-3.5 text-sm text-foreground">{mat?.name || 'Unknown'}</td>
                          <td className="px-6 py-3.5 text-sm text-right tabular-nums text-foreground">{item.quantity}</td>
                          <td className="px-6 py-3.5 text-sm text-right tabular-nums text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-6 py-3.5 text-sm text-right font-medium tabular-nums text-foreground">{formatCurrency(item.totalPrice)}</td>
                          <td className="px-3 py-3.5">
                            <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>

          {/* Costing */}
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h2 className="text-[length:var(--font-size-h2)] font-semibold">Costing Configuration</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>OPEX (%)</Label>
                <Input type="number" value={opexPercent} onChange={e => setOpexPercent(Number(e.target.value))} min={0} max={100} />
              </div>
              <div>
                <Label>Discount (%)</Label>
                <Input type="number" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} min={0} max={100} />
              </div>
              <div>
                <Label>Margin (%)</Label>
                <Input type="number" value={marginPercent} onChange={e => setMarginPercent(Number(e.target.value))} min={0} max={100} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          {customer && (
            <div className="bg-card rounded-2xl shadow-card p-6">
              <p className="label-caps mb-3">Customer</p>
              <p className="text-sm font-medium text-foreground">{customer.name}</p>
              <p className="text-xs text-muted-foreground">{customer.contactPerson}</p>
              <p className="text-xs text-muted-foreground mt-1">{customer.phone}</p>
            </div>
          )}

          {/* Cost Summary */}
          <div className="bg-card rounded-2xl shadow-card p-6 sticky top-8">
            <p className="label-caps mb-4">Cost Summary</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">OPEX ({opexPercent}%)</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(totals.opex)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Cost + OPEX</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(totals.costWithOpex)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({discountPercent}%)</span>
                <span className="font-medium tabular-nums text-destructive">-{formatCurrency(totals.discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After Discount</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(totals.afterDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin ({marginPercent}%)</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(totals.margin)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <motion.span
                  key={totals.total}
                  initial={{ backgroundColor: "hsl(35 85% 55% / 0.1)" }}
                  animate={{ backgroundColor: "hsl(35 85% 55% / 0)" }}
                  transition={{ duration: 0.8 }}
                  className="text-lg font-bold tabular-nums text-foreground px-2 rounded"
                >
                  {formatCurrency(totals.total)}
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Add Material to BOM</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Material</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {formatCurrency(m.unitPrice)}/{m.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
            </div>
            {selectedMaterialId && (
              <div className="bg-muted rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="tabular-nums font-medium text-foreground">{formatCurrency(store.getMaterial(selectedMaterialId)?.unitPrice || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Line Total</span>
                  <span className="tabular-nums font-semibold text-foreground">{formatCurrency((store.getMaterial(selectedMaterialId)?.unitPrice || 0) * quantity)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationBuilder;
