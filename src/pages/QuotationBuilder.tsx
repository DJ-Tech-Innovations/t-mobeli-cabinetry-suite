import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { TemplatePickerDialog, type BomLine } from "@/components/TemplatePickerDialog";
import { FurnitureConfiguratorDialog } from "@/components/FurnitureConfiguratorDialog";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { QuotationDocument, type QuotationCopy } from "@/components/print/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, formatCurrency, computeQuotationTotals, type Quotation, type BOMItem } from "@/lib/data";
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, XCircle, Printer, LayoutTemplate, WandSparkles, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const NO_AGENT = "none";
const newBomId = () => `bom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const QuotationBuilder = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const projects = store.getProjects();
  const materials = store.getMaterials();
  const agents = store.getAgents();

  const existing = !isNew ? store.getQuotation(id) : null;

  const [projectId, setProjectId] = useState(existing?.projectId || searchParams.get('projectId') || projects[0]?.id || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [items, setItems] = useState<BOMItem[]>(existing?.items || []);
  const [opexPercent, setOpexPercent] = useState(existing?.opexPercent ?? 15);
  const [discountPercent, setDiscountPercent] = useState(existing?.discountPercent ?? 0);
  const [marginPercent, setMarginPercent] = useState(existing?.marginPercent ?? 25);
  const [status, setStatus] = useState<Quotation['status']>(existing?.status || 'draft');
  const [assignedAgentId, setAssignedAgentId] = useState(existing?.assignedAgentId || '');

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || "");
  const [quantity, setQuantity] = useState(1);

  // Dialogs remount on each open so they start fresh
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [configKey, setConfigKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printCopy, setPrintCopy] = useState<QuotationCopy>("client");

  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const locked = isApproved || isRejected;

  const draftQuotation: Quotation = {
    id: existing?.id || 'new',
    projectId,
    description,
    items,
    opexPercent,
    discountPercent,
    marginPercent,
    status,
    assignedAgentId: assignedAgentId || undefined,
    createdAt: existing?.createdAt || '',
  };
  const totals = computeQuotationTotals(draftQuotation);

  const project = store.getProject(projectId);
  const customer = project ? store.getCustomer(project.customerId) : null;
  const agent = assignedAgentId ? store.getEmployee(assignedAgentId) : undefined;

  /** Adds lines to the BOM, merging into existing rows for the same material. */
  const addLines = (lines: BomLine[], source: string) => {
    const valid = lines.filter(l => l.quantity > 0 && store.getMaterial(l.materialId));
    if (valid.length === 0) { toast.error("Nothing to add — the selected materials no longer exist"); return false; }

    const existingIds = new Set(items.map(i => i.materialId));
    const merged = valid.filter(l => existingIds.has(l.materialId)).length;

    setItems(prev => {
      const next = prev.map(i => ({ ...i }));
      for (const line of valid) {
        const mat = store.getMaterial(line.materialId)!;
        const row = next.find(i => i.materialId === line.materialId);
        if (row) {
          row.quantity += line.quantity;
          row.totalPrice = row.unitPrice * row.quantity;
        } else {
          next.push({ id: newBomId(), materialId: mat.id, quantity: line.quantity, unitPrice: mat.unitPrice, totalPrice: mat.unitPrice * line.quantity });
        }
      }
      return next;
    });

    toast.success(
      `Added ${valid.length} item${valid.length === 1 ? "" : "s"} from ${source}`,
      merged > 0 ? { description: `${merged} merged into existing BOM rows` } : undefined,
    );
    return true;
  };

  const handleAddItem = () => {
    const mat = store.getMaterial(selectedMaterialId);
    if (!mat) { toast.error("Select a material"); return; }
    if (!(quantity > 0)) { toast.error("Quantity must be greater than 0"); return; }
    if (addLines([{ materialId: mat.id, quantity }], mat.name)) {
      setAddItemOpen(false);
      setQuantity(1);
    }
  };

  const updateQuantity = (itemId: string, qty: number) =>
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, quantity: qty, totalPrice: i.unitPrice * qty } : i)));

  const removeItem = (itemId: string) => setItems(prev => prev.filter(i => i.id !== itemId));

  const openTemplate = () => { setTemplateKey(k => k + 1); setTemplateOpen(true); };
  const openConfigurator = () => { setConfigKey(k => k + 1); setConfigOpen(true); };

  const handleSave = () => {
    if (!projectId) { toast.error("Select a project"); return; }
    if (!description.trim()) { toast.error("Quotation description is required"); return; }
    if (items.some(i => !(i.quantity > 0))) { toast.error("Every BOM item needs a quantity greater than 0"); return; }

    const data = { projectId, description: description.trim(), items, opexPercent, discountPercent, marginPercent, status, assignedAgentId: assignedAgentId || undefined };

    if (isNew) {
      const q = store.addQuotation(data);
      toast.success(`Quotation ${q.id.toUpperCase()} saved`);
      navigate(`/quotations/${q.id}`, { replace: true });
    } else {
      store.updateQuotation(id, data);
      toast.success(`Quotation ${id!.toUpperCase()} updated`);
    }
  };

  const handleApprove = () => {
    if (!id) return;
    store.approveQuotation(id);
    setStatus('approved');
    toast.success("Quotation approved and linked to project!");
  };

  const handleReject = () => {
    if (!id) return;
    store.rejectQuotation(id);
    setStatus('rejected');
    toast.error("Quotation rejected.");
  };

  const summaryRows: { label: string; value: string; divider?: boolean; negative?: boolean }[] = [
    { label: `Subtotal (${items.length} item${items.length === 1 ? "" : "s"})`, value: formatCurrency(totals.subtotal) },
    { label: `OPEX (${opexPercent}%)`, value: formatCurrency(totals.opex) },
    { label: "Cost + OPEX", value: formatCurrency(totals.costWithOpex), divider: true },
    { label: `Discount (${discountPercent}%)`, value: `-${formatCurrency(totals.discount)}`, negative: true },
    { label: "After Discount", value: formatCurrency(totals.afterDiscount) },
    { label: `Margin (${marginPercent}%)`, value: formatCurrency(totals.margin) },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <button onClick={() => navigate('/quotations')} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to Quotations
      </button>

      <PageHeader
        title={isNew ? "New Quotation" : `Quotation ${id!.toUpperCase()}`}
        description={project?.name}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            {!isNew && status === 'sent' && (
              <>
                <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleReject}>
                  <XCircle className="mr-2 h-4 w-4" />Reject
                </Button>
                <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleApprove}>
                  <CheckCircle className="mr-2 h-4 w-4" />Approve
                </Button>
              </>
            )}
            <Button variant="outline" className="bg-card" onClick={() => setPreviewOpen(true)}>
              <Printer className="mr-2 h-4 w-4" />Print
            </Button>
            {!locked && (
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />{isNew ? "Save Quotation" : "Update Quotation"}
              </Button>
            )}
          </div>
        }
      />

      {locked && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl px-6 py-4 ${
          isApproved ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-red-200 bg-red-50 text-red-800'
        }`}>
          {isApproved ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <div>
            <p className="text-sm font-semibold">{isApproved ? 'Quotation Approved' : 'Quotation Rejected'}</p>
            <p className="text-xs opacity-80">
              {isApproved
                ? `This quotation has been approved and linked to the project. Value: ${formatCurrency(totals.total)}`
                : 'This quotation has been rejected.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Main form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground">Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Project *</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={locked}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as Quotation['status'])} disabled={locked}>
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
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Kitchen Upper & Lower Cabinets" disabled={locked} />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Agent</Label>
              <Select value={assignedAgentId || NO_AGENT} onValueChange={v => setAssignedAgentId(v === NO_AGENT ? "" : v)} disabled={locked}>
                <SelectTrigger><SelectValue placeholder="Select agent (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AGENT}>No agent</SelectItem>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.commissionPercent}%)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bill of Materials */}
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <h2 className="whitespace-nowrap text-lg font-semibold text-foreground">Bill of Materials</h2>
              {!locked && (
                <div className="flex flex-wrap gap-2 print:hidden">
                  <Button size="sm" variant="outline" onClick={openTemplate}>
                    <LayoutTemplate className="mr-2 h-4 w-4" />From Template
                  </Button>
                  <Button size="sm" variant="outline" onClick={openConfigurator}>
                    <WandSparkles className="mr-2 h-4 w-4" />Configure
                  </Button>
                  <Button size="sm" onClick={() => setAddItemOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Add Item
                  </Button>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <PackageOpen className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium text-foreground">No items added yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Use <span className="font-medium text-foreground">From Template</span> for a saved furniture type,{" "}
                  <span className="font-medium text-foreground">Configure</span> to calculate a cut list from dimensions, or{" "}
                  <span className="font-medium text-foreground">Add Item</span> for a single material.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/60">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                      {!locked && <th className="w-12 print:hidden"><span className="sr-only">Remove</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {items.map(item => {
                        const mat = store.getMaterial(item.materialId);
                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                          >
                            <td className="px-6 py-3 text-sm text-foreground">
                              {mat?.name || 'Unknown material'}
                              {mat && <span className="ml-1.5 text-xs text-muted-foreground">/ {mat.unit}</span>}
                            </td>
                            <td className="px-4 py-2 text-right text-sm tabular-nums text-foreground">
                              {locked ? item.quantity : (
                                <>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={item.quantity}
                                    onChange={e => updateQuantity(item.id, Number(e.target.value))}
                                    className="ml-auto h-8 w-20 text-right tabular-nums print:hidden"
                                    aria-label={`Quantity of ${mat?.name ?? "item"}`}
                                  />
                                  <span className="hidden print:inline">{item.quantity}</span>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-6 py-3 text-right text-sm font-medium tabular-nums text-foreground">{formatCurrency(item.totalPrice)}</td>
                            {!locked && (
                              <td className="px-3 py-3 print:hidden">
                                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} aria-label={`Remove ${mat?.name ?? "item"}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Costing */}
          <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground">Costing Configuration</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>OPEX (%)</Label>
                <Input type="number" value={opexPercent} onChange={e => setOpexPercent(Number(e.target.value))} min={0} max={100} disabled={locked} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount (%)</Label>
                <Input type="number" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} min={0} max={100} disabled={locked} />
              </div>
              <div className="space-y-1.5">
                <Label>Margin (%)</Label>
                <Input type="number" value={marginPercent} onChange={e => setMarginPercent(Number(e.target.value))} min={0} max={100} disabled={locked} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {customer && (
            <div className="rounded-2xl bg-card p-6 shadow-card">
              <p className="label-caps mb-3">Customer</p>
              <p className="text-sm font-semibold text-foreground">{customer.name}</p>
              <p className="text-xs text-muted-foreground">{customer.contactPerson}</p>
              <p className="mt-1 text-xs text-muted-foreground">{customer.phone}</p>
            </div>
          )}

          {agent && (
            <div className="rounded-2xl bg-card p-6 shadow-card">
              <p className="label-caps mb-3">Assigned Agent</p>
              <p className="text-sm font-semibold text-foreground">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.position}</p>
              <p className="mt-1 text-xs font-medium text-primary">
                Commission: {agent.commissionPercent}% ({formatCurrency((totals.total * agent.commissionPercent) / 100)})
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-card p-6 shadow-card">
            <p className="label-caps mb-4">Cost Summary</p>
            <div className="space-y-3">
              {summaryRows.map(row => (
                <div key={row.label} className={`flex justify-between text-sm ${row.divider ? "border-t border-border pt-3" : ""}`}>
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={`font-medium tabular-nums ${row.negative ? "text-destructive" : "text-foreground"}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <motion.span
                  key={totals.total}
                  initial={{ backgroundColor: "hsl(221 83% 53% / 0.12)" }}
                  animate={{ backgroundColor: "hsl(221 83% 53% / 0)" }}
                  transition={{ duration: 0.8 }}
                  className="rounded px-2 text-xl font-bold tabular-nums text-foreground"
                >
                  {formatCurrency(totals.total)}
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TemplatePickerDialog
        key={`template-${templateKey}`}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onApply={(lines, source) => { if (addLines(lines, source)) setTemplateOpen(false); }}
      />

      <FurnitureConfiguratorDialog
        key={`config-${configKey}`}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onApply={(lines, source) => { if (addLines(lines, source)) setConfigOpen(false); }}
      />

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={isNew ? "New Quotation" : `Quotation ${id!.toUpperCase()}`}
        documentName={`${isNew ? "Quotation (draft)" : id!.toUpperCase()}${customer ? ` - ${customer.name}` : ""}${printCopy === "internal" ? " (internal)" : ""}`}
        toolbar={
          <div className="inline-flex h-9 items-center rounded-md border border-border p-0.5" role="group" aria-label="Copy type">
            {([["client", "Client copy"], ["internal", "Internal copy"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPrintCopy(value)}
                aria-pressed={printCopy === value}
                className={`h-full rounded px-2.5 text-xs font-medium transition-colors ${printCopy === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <QuotationDocument quotation={draftQuotation} copy={printCopy} unsaved={isNew} />
      </PrintPreviewDialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Material to BOM</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
            </div>
            {selectedMaterialId && (
              <div className="rounded-xl bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="font-medium tabular-nums text-foreground">{formatCurrency(store.getMaterial(selectedMaterialId)?.unitPrice || 0)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Line Total</span>
                  <span className="font-semibold tabular-nums text-foreground">{formatCurrency((store.getMaterial(selectedMaterialId)?.unitPrice || 0) * quantity)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationBuilder;
