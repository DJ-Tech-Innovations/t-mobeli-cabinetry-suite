import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BomLine } from "@/components/TemplatePickerDialog";
import { store, formatCurrency, FURNITURE_CATEGORIES } from "@/lib/data";
import {
  FURNITURE_TYPES, SHEET_H, SHEET_W, WASTE_FACTOR, fitsOnSheet, summarizeCutList, toBomLines,
  type Dimensions, type FurnitureType,
} from "@/lib/furnitureConfigurator";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, ChevronLeft, Info, WandSparkles } from "lucide-react";

const DIM_KEYS: (keyof Dimensions)[] = ["width", "height", "depth"];
const DEFAULT_LABELS: Record<keyof Dimensions, string> = { width: "Width", height: "Height", depth: "Depth" };

const toneStyles = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  slate: "border-slate-200 bg-slate-100 text-slate-800",
};

interface FurnitureConfiguratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (lines: BomLine[], source: string) => void;
}

export function FurnitureConfiguratorDialog({ open, onOpenChange, onApply }: FurnitureConfiguratorDialogProps) {
  const materials = store.getMaterials();
  const [type, setType] = useState<FurnitureType | null>(null);
  const [dims, setDims] = useState<Dimensions>({ width: 0, height: 0, depth: 0 });

  const choose = (t: FurnitureType) => {
    setType(t);
    setDims(t.defaults);
  };

  const result = type ? type.build(dims) : null;
  const summary = result ? summarizeCutList(result) : null;
  const lines = result && summary
    ? toBomLines(result, summary).map(line => ({ ...line, material: line.materialId ? materials.find(m => m.id === line.materialId) : undefined }))
    : [];
  const addable = lines.filter(l => l.material);
  const missing = lines.filter(l => !l.material);
  const cost = addable.reduce((sum, l) => sum + l.material!.unitPrice * l.qty, 0);
  const oversized = result ? result.parts.filter(p => !fitsOnSheet(p)) : [];

  const apply = () => {
    if (!type || addable.length === 0) return;
    onApply(
      addable.map(l => ({ materialId: l.material!.id, quantity: l.qty })),
      `${type.code} ${dims.width}×${dims.height}×${dims.depth}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl p-0", type ? "sm:max-w-6xl" : "sm:max-w-4xl")}>
        {!type || !result || !summary ? (
          <>
            <DialogHeader className="border-b border-border px-6 py-5 pr-12 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <WandSparkles className="h-5 w-5 text-primary" />Select Furniture Type
              </DialogTitle>
              <DialogDescription>Choose a furniture type — cut pieces and materials are calculated from the dimensions you pick.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {FURNITURE_CATEGORIES.map(cat => {
                const types = FURNITURE_TYPES.filter(t => t.category === cat.id);
                if (types.length === 0) return null;
                return (
                  <section key={cat.id}>
                    <h3 className="label-caps mb-3 flex items-center gap-2">
                      <span aria-hidden="true" className="text-base">{types[0].icon}</span>{cat.label}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {types.map(t => (
                        <button
                          key={t.code}
                          type="button"
                          onClick={() => choose(t)}
                          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-blue-50/40 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span aria-hidden="true" className="text-2xl leading-none">{t.icon}</span>
                          <span className="min-w-0">
                            <span className="block font-mono text-xs font-semibold text-primary">{t.code}</span>
                            <span className="mt-0.5 block text-sm font-semibold text-foreground">{t.name}</span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="flex justify-end border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="flex-row items-center gap-2 space-y-0 border-b border-border px-4 py-3 pr-12 text-left sm:px-6">
              <Button variant="ghost" size="icon" onClick={() => setType(null)} aria-label="Back to furniture types" className="h-8 w-8 shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 text-lg">
                <WandSparkles className="h-5 w-5 shrink-0 text-primary" />
                <span>Configure: {type.name}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">{type.code}</span>
              </DialogTitle>
              <DialogDescription className="sr-only">Set dimensions to generate the cut list and bill of materials.</DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:h-[66vh] md:grid-cols-[340px_1fr] md:overflow-hidden">
              {/* Dimensions + BOM */}
              <div className="space-y-6 border-b border-border p-6 md:overflow-y-auto md:border-b-0 md:border-r">
                <div className="space-y-4">
                  <p className="label-caps">Dimensions</p>
                  {DIM_KEYS.map(key => {
                    const options = type.options[key].includes(dims[key])
                      ? type.options[key]
                      : [...type.options[key], dims[key]].sort((a, b) => a - b);
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label>{type.labels?.[key] ?? DEFAULT_LABELS[key]} (mm)</Label>
                        <Select value={String(dims[key])} onValueChange={v => setDims(d => ({ ...d, [key]: Number(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {options.map(o => <SelectItem key={o} value={String(o)}>{o} mm</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Sheet calculation uses a <strong>{Math.round(WASTE_FACTOR * 100)}% waste factor</strong> and standard {SHEET_W}×{SHEET_H}mm sheet size.
                    </span>
                  </div>
                </div>

                <div>
                  <p className="label-caps mb-2">Will add to BOM ({addable.length} item{addable.length === 1 ? "" : "s"})</p>
                  <ul className="space-y-1.5">
                    {addable.map(l => (
                      <li key={l.material!.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-inset ring-slate-100">
                        <span className="truncate text-foreground">{l.material!.name}</span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {l.qty} {l.material!.unit} · <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(l.material!.unitPrice * l.qty)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {missing.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5" />Not in your Materials list — won't be added:</p>
                      <p className="mt-0.5">{missing.map(l => `${l.label} (${l.qty} ${l.unit})`).join(", ")}</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border px-1 pt-3 text-sm">
                    <span className="font-medium text-muted-foreground">Est. Material Cost</span>
                    <span className="font-bold tabular-nums text-foreground">{formatCurrency(cost)}</span>
                  </div>
                </div>
              </div>

              {/* Cut list */}
              <div className="space-y-4 p-6 md:overflow-y-auto">
                <p className="label-caps">Cut list — {summary.pieces} pieces</p>

                {oversized.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Some parts are larger than a {SHEET_W}×{SHEET_H}mm sheet and will need joining: {oversized.map(p => `${p.name} (${p.width}×${p.height})`).join(", ")}.</span>
                  </div>
                )}

                {summary.boards.map(board => (
                  <div key={board.key} className="overflow-hidden rounded-xl border border-border">
                    <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-sm", toneStyles[board.tone])}>
                      <span className="font-semibold">{board.label}</span>
                      <span className="text-xs font-medium tabular-nums">
                        {board.sheets} sheet{board.sheets === 1 ? "" : "s"} · {board.area.toFixed(2)} m² raw
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-muted-foreground">
                            <th className="px-4 py-2 text-left font-medium">Part</th>
                            <th className="px-4 py-2 text-right font-medium">W (mm)</th>
                            <th className="px-4 py-2 text-right font-medium">H (mm)</th>
                            <th className="px-4 py-2 text-right font-medium">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {board.parts.map(p => (
                            <tr key={`${p.name}-${p.width}-${p.height}`}>
                              <td className="px-4 py-2 text-foreground">{p.name}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{p.width}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{p.height}</td>
                              <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">{p.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="border-b border-border bg-slate-50 px-4 py-2.5 text-sm font-semibold text-foreground">Hardware</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">Item</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 text-right font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.hardware.map(h => (
                        <tr key={h.name}>
                          <td className="px-4 py-2 text-foreground">
                            {h.name}
                            {!h.materialId && <span className="ml-2 text-xs text-amber-700">(not in materials)</span>}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">{h.qty}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{h.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setType(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />Back
              </Button>
              <Button onClick={apply} disabled={addable.length === 0}>
                <WandSparkles className="mr-2 h-4 w-4" />Add {addable.length} Item{addable.length === 1 ? "" : "s"} to BOM
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
