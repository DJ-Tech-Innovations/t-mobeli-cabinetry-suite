import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  store, formatCurrency, getVariantCost, FURNITURE_CATEGORIES,
  type FurnitureCategory, type FurnitureTemplate, type FurnitureVariant,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChevronDown, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type TemplateFormData = Omit<FurnitureTemplate, "id" | "createdAt">;

interface FurnitureTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Template to edit, or null to create a new one. */
  template: FurnitureTemplate | null;
  onSave: (data: TemplateFormData) => void;
}

export function FurnitureTemplateDialog({ open, onOpenChange, template, onSave }: FurnitureTemplateDialogProps) {
  const materials = store.getMaterials();

  const newItem = () => ({ id: uid("item"), materialId: materials[0]?.id ?? "", quantity: 1 });
  const newVariant = (): FurnitureVariant => ({ id: uid("variant"), name: "", width: 600, height: 720, depth: 560, items: [newItem()] });

  const [form, setForm] = useState<TemplateFormData>(() =>
    template
      ? { code: template.code, name: template.name, category: template.category, description: template.description, image: template.image, variants: structuredClone(template.variants) }
      : { code: "", name: "", category: "base-unit", description: "", image: "", variants: [newVariant()] },
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(form.variants[0] ? [form.variants[0].id] : []));
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const toggleExpanded = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const updateVariant = (id: string, patch: Partial<FurnitureVariant>) =>
    setForm(f => ({ ...f, variants: f.variants.map(v => (v.id === id ? { ...v, ...patch } : v)) }));

  const addVariant = () => {
    const v = newVariant();
    setForm(f => ({ ...f, variants: [...f.variants, v] }));
    setExpanded(prev => new Set(prev).add(v.id));
  };

  const removeVariant = (id: string) => setForm(f => ({ ...f, variants: f.variants.filter(v => v.id !== id) }));

  const handleImage = (file?: File) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { toast.error("Please upload a PNG, JPG, or WEBP image"); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error("Image must be 5MB or smaller"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code) { toast.error("Furniture code is required"); return; }
    if (store.getTemplates().some(t => t.id !== template?.id && t.code === code)) { toast.error(`Code ${code} is already used by another template`); return; }
    if (!name) { toast.error("Furniture name is required"); return; }
    if (form.variants.length === 0) { toast.error("Add at least one size variant"); return; }

    const names = new Set<string>();
    for (const [index, v] of form.variants.entries()) {
      const label = v.name.trim() || `Variant ${index + 1}`;
      if (!v.name.trim()) { toast.error(`${label}: variant name is required`); setExpanded(prev => new Set(prev).add(v.id)); return; }
      if (names.has(v.name.trim().toLowerCase())) { toast.error(`Variant name "${v.name.trim()}" is used more than once`); return; }
      names.add(v.name.trim().toLowerCase());
      if ([v.width, v.height, v.depth].some(n => !Number.isFinite(n) || n < 0)) { toast.error(`${label}: dimensions must be zero or more`); return; }
      if (v.items.length === 0) { toast.error(`${label}: add at least one material`); setExpanded(prev => new Set(prev).add(v.id)); return; }
      if (v.items.some(i => !i.materialId)) { toast.error(`${label}: select a material for every row`); setExpanded(prev => new Set(prev).add(v.id)); return; }
      if (v.items.some(i => !(i.quantity > 0))) { toast.error(`${label}: quantities must be greater than 0`); setExpanded(prev => new Set(prev).add(v.id)); return; }
    }

    onSave({
      ...form,
      code,
      name,
      description: form.description.trim(),
      variants: form.variants.map(v => ({ ...v, name: v.name.trim() })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{template ? `Edit Template — ${template.code}` : "New Furniture Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Image */}
          <div className="space-y-1.5">
            <Label>Template Image</Label>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={e => { handleImage(e.target.files?.[0]); e.target.value = ""; }}
            />
            {form.image ? (
              <div className="group relative overflow-hidden rounded-xl border border-border bg-slate-50">
                <img src={form.image} alt="Template preview" className="mx-auto h-48 w-full object-contain" />
                <div className="absolute right-2 top-2 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileInput.current?.click()} className="shadow">Change</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setForm(f => ({ ...f, image: "" }))} className="shadow">
                    <X className="mr-1 h-4 w-4" />Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleImage(e.dataTransfer.files?.[0]); }}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  dragOver ? "border-primary bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <ImagePlus className="h-8 w-8 text-slate-400" />
                <span className="mt-2 text-sm text-slate-600">Click to upload or drag an image here</span>
                <span className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP — max 5MB</span>
              </button>
            )}
          </div>

          {/* Basics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Furniture Code *</Label>
              <Input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. BU-1D2S"
                className="font-mono uppercase placeholder:normal-case placeholder:font-sans"
              />
              <p className="text-xs text-muted-foreground">Short identifier used in quotations (will be uppercased)</p>
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as FurnitureCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FURNITURE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Furniture Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Base Unit — 1 Drawer 2 Swing Doors" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this furniture type..." />
          </div>

          {/* Variants */}
          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Size Variants</p>
                <p className="text-xs text-muted-foreground">Add Small / Medium / Large (or any custom names) — each with its own dimensions and BOM.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant} className="shrink-0">
                <Plus className="mr-1.5 h-4 w-4" />Add Variant
              </Button>
            </div>

            {form.variants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-muted-foreground">
                No variants yet. Click <span className="font-medium text-foreground">Add Variant</span> to start.
              </div>
            ) : (
              <div className="space-y-3">
                {form.variants.map((v, index) => {
                  const isOpen = expanded.has(v.id);
                  const cost = getVariantCost(v);
                  return (
                    <div key={v.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3 bg-slate-50 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(v.id)}
                          aria-expanded={isOpen}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", !isOpen && "-rotate-90")} />
                          <span className="truncate text-sm font-semibold text-foreground">{v.name.trim() || `Variant ${index + 1}`}</span>
                          <span className="ml-auto hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:inline">
                            {v.width} × {v.height} × {v.depth} mm
                          </span>
                          <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline sm:w-20 sm:text-right">
                            {v.items.length} material{v.items.length === 1 ? "" : "s"}
                          </span>
                          <span className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums text-foreground sm:ml-0 sm:w-28 sm:text-right">
                            {formatCurrency(cost)}
                          </span>
                        </button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(v.id)} aria-label={`Remove ${v.name || `variant ${index + 1}`}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {isOpen && (
                        <div className="space-y-4 p-4">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                              <Label className="text-xs">Variant Name *</Label>
                              <Input value={v.name} onChange={e => updateVariant(v.id, { name: e.target.value })} placeholder="Small / Medium / Large" />
                            </div>
                            {([["width", "Width"], ["height", "Height"], ["depth", "Depth"]] as const).map(([dim, label]) => (
                              <div key={dim} className="space-y-1.5">
                                <Label className="text-xs">{label} (mm)</Label>
                                <Input type="number" min={0} value={v[dim]} onChange={e => updateVariant(v.id, { [dim]: Number(e.target.value) })} />
                              </div>
                            ))}
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="label-caps">Bill of Materials</p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => updateVariant(v.id, { items: [...v.items, newItem()] })}
                                disabled={materials.length === 0}
                              >
                                <Plus className="mr-1.5 h-4 w-4" />Add Material
                              </Button>
                            </div>

                            {materials.length === 0 ? (
                              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Add materials on the Materials page before building a BOM.</p>
                            ) : v.items.length === 0 ? (
                              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground">No materials in this variant yet.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <div className="min-w-[520px]">
                                  <div className="grid grid-cols-[1fr_5rem_6.5rem_2.25rem] gap-2 px-1 pb-1.5 text-xs text-muted-foreground">
                                    <span>Material</span>
                                    <span className="text-center">Qty</span>
                                    <span className="text-right">Line Total</span>
                                    <span />
                                  </div>
                                  <div className="space-y-2">
                                    {v.items.map(item => {
                                      const material = materials.find(m => m.id === item.materialId);
                                      return (
                                        <div key={item.id} className="grid grid-cols-[1fr_5rem_6.5rem_2.25rem] items-center gap-2">
                                          <Select
                                            value={item.materialId}
                                            onValueChange={materialId => updateVariant(v.id, { items: v.items.map(i => (i.id === item.id ? { ...i, materialId } : i)) })}
                                          >
                                            <SelectTrigger className={cn("h-9 text-sm", !material && "text-destructive")}>
                                              <SelectValue placeholder="Material no longer exists — select one" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {materials.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name} — {formatCurrency(m.unitPrice)}/{m.unit}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            type="number"
                                            min={0}
                                            step="any"
                                            value={item.quantity}
                                            onChange={e => updateVariant(v.id, { items: v.items.map(i => (i.id === item.id ? { ...i, quantity: Number(e.target.value) } : i)) })}
                                            className="h-9 text-center tabular-nums"
                                          />
                                          <span className="text-right text-sm tabular-nums text-muted-foreground">
                                            {formatCurrency((material?.unitPrice ?? 0) * item.quantity)}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => updateVariant(v.id, { items: v.items.filter(i => i.id !== item.id) })}
                                            aria-label="Remove material"
                                            className="px-2"
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3 text-sm">
                              <span className="text-muted-foreground">Materials subtotal:</span>
                              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(cost)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{template ? "Save Changes" : "Create Template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
