import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FurnitureCategoryBadge } from "@/components/FurnitureCategoryBadge";
import { store, formatCurrency, FURNITURE_CATEGORIES, type FurnitureCategory } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Layers, Minus, Plus, Ruler, Search } from "lucide-react";

export interface BomLine {
  materialId: string;
  quantity: number;
}

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `source` is a short human label, e.g. "BU-1D2S Small ×2". */
  onApply: (lines: BomLine[], source: string) => void;
}

export function TemplatePickerDialog({ open, onOpenChange, onApply }: TemplatePickerDialogProps) {
  const templates = store.getTemplates();
  const materials = store.getMaterials();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | FurnitureCategory>("all");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [variantId, setVariantId] = useState(templates[0]?.variants[0]?.id ?? "");
  const [units, setUnits] = useState(1);

  const q = search.trim().toLowerCase();
  const filtered = templates.filter(t =>
    (category === "all" || t.category === category) &&
    (!q || t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)),
  );

  const template = templates.find(t => t.id === templateId);
  const variant = template?.variants.find(v => v.id === variantId) ?? template?.variants[0];

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    setVariantId(templates.find(t => t.id === id)?.variants[0]?.id ?? "");
  };

  const rows = (variant?.items ?? []).map(item => {
    const material = materials.find(m => m.id === item.materialId);
    const qty = item.quantity * units;
    return { item, material, qty, total: material ? material.unitPrice * qty : 0 };
  });
  const valid = rows.filter(r => r.material && r.qty > 0);
  const total = valid.reduce((sum, r) => sum + r.total, 0);

  const apply = () => {
    if (!template || !variant || valid.length === 0) return;
    onApply(
      valid.map(r => ({ materialId: r.material!.id, quantity: r.qty })),
      `${template.code} ${variant.name}${units > 1 ? ` ×${units}` : ""}`,
    );
  };

  const setUnitsSafe = (n: number) => setUnits(Math.max(1, Math.min(999, Math.floor(Number.isFinite(n) ? n : 1))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle className="text-xl">Apply Furniture Template to BOM</DialogTitle>
          <DialogDescription>
            Pick a template type and size — the bill of materials is filled in automatically. You can adjust quantities after adding.
          </DialogDescription>
        </DialogHeader>

        {templates.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">No furniture templates yet.</p>
            <Link to="/furniture-builder" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
              Create one in Furniture Builder →
            </Link>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:h-[62vh] md:grid-cols-[300px_1fr] md:overflow-hidden">
            {/* Template list */}
            <div className="flex min-h-0 flex-col border-b border-border bg-slate-50/70 md:border-b-0 md:border-r">
              <div className="space-y-3 border-b border-border p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search code or name..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card pl-9" />
                </div>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {[{ id: "all" as const, label: "All" }, ...FURNITURE_CATEGORIES].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      aria-pressed={category === c.id}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        category === c.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="max-h-60 flex-1 overflow-y-auto md:max-h-none">
                {filtered.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">No templates match.</li>
                ) : filtered.map(t => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectTemplate(t.id)}
                      className={cn(
                        "w-full border-b border-l-4 border-b-border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:bg-blue-50",
                        t.id === templateId ? "border-l-primary bg-blue-50/80" : "border-l-transparent hover:bg-white",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">{t.code}</span>
                        <FurnitureCategoryBadge category={t.category} />
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground">{t.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Layers className="h-3 w-3" />{t.variants.map(v => v.name).join(", ") || "No variants"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Details */}
            <div className="min-h-0 md:overflow-y-auto">
              {!template ? (
                <p className="px-6 py-16 text-center text-sm text-muted-foreground">Select a template.</p>
              ) : (
                <>
                  <div className="space-y-4 border-b border-border p-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-semibold text-foreground">{template.code}</span>
                        <FurnitureCategoryBadge category={template.category} />
                      </div>
                      <p className="mt-1 font-semibold text-foreground">{template.name}</p>
                      {template.description && <p className="mt-0.5 text-sm text-muted-foreground">{template.description}</p>}
                    </div>

                    {template.variants.length === 0 ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This template has no size variants yet.</p>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                          <p className="mb-2 text-sm font-medium text-foreground">Size / Variant</p>
                          <div className="flex flex-wrap gap-2">
                            {template.variants.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setVariantId(v.id)}
                                aria-pressed={variant?.id === v.id}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  variant?.id === v.id ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card hover:border-slate-300",
                                )}
                              >
                                <span className="font-semibold">{v.name}</span>
                                <span className={cn("ml-1.5 text-xs tabular-nums", variant?.id === v.id ? "text-blue-100" : "text-muted-foreground")}>
                                  {v.width}×{v.height}×{v.depth}mm
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <p className="mb-2 text-sm font-medium text-foreground">No. of Units</p>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" onClick={() => setUnitsSafe(units - 1)} disabled={units <= 1} aria-label="Decrease units">
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input type="number" min={1} value={units} onChange={e => setUnitsSafe(Number(e.target.value))} className="w-16 text-center tabular-nums" aria-label="Number of units" />
                            <Button type="button" variant="outline" size="icon" onClick={() => setUnitsSafe(units + 1)} aria-label="Increase units">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {variant && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Ruler className="h-4 w-4 text-slate-400" />
                        Width: <span className="font-semibold text-foreground">{variant.width}mm</span> ·
                        Height: <span className="font-semibold text-foreground">{variant.height}mm</span> ·
                        Depth: <span className="font-semibold text-foreground">{variant.depth}mm</span>
                      </p>
                    )}
                  </div>

                  {variant && (
                    <div className="p-6">
                      <p className="label-caps mb-3">Bill of Materials Preview</p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground">
                              <th className="py-2 pr-3 text-left font-medium">Material</th>
                              <th className="px-3 py-2 text-left font-medium">Unit</th>
                              <th className="px-3 py-2 text-right font-medium">Per Unit</th>
                              {units > 1 && <th className="px-3 py-2 text-right font-medium">Qty</th>}
                              <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                              <th className="py-2 pl-3 text-right font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {rows.map(r => (
                              <tr key={r.item.id} className={cn(!r.material && "bg-amber-50/60")}>
                                <td className="py-2.5 pr-3 text-foreground">
                                  {r.material ? r.material.name : (
                                    <span className="flex items-center gap-1.5 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Missing material — skipped</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{r.material?.unit ?? "—"}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{r.item.quantity}</td>
                                {units > 1 && <td className="px-3 py-2.5 text-right font-medium tabular-nums">{r.qty}</td>}
                                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.material ? formatCurrency(r.material.unitPrice) : "—"}</td>
                                <td className="py-2.5 pl-3 text-right font-semibold tabular-nums text-foreground">{formatCurrency(r.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-4 border-t border-border pt-3">
                        <span className="text-sm text-muted-foreground">Materials Cost Total</span>
                        <span className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={valid.length === 0}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Apply {valid.length} Item{valid.length === 1 ? "" : "s"} to BOM
            <span className="ml-2 font-normal opacity-80">({formatCurrency(total)})</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
