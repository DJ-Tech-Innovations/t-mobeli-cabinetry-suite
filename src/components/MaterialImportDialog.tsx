import { useMemo, useRef, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, Loader2, Plus, RefreshCw, Tags, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  IMPORT_COLUMNS,
  ImportFileError,
  applyImport,
  downloadTemplate,
  getRowAction,
  nameKey,
  readImportFile,
  type ImportRow,
  type RowAction,
} from "@/lib/materialImport";

const actionBadge: Record<RowAction, { label: string; className: string }> = {
  create: { label: "New", className: "bg-emerald-50 text-emerald-700" },
  update: { label: "Update", className: "bg-blue-50 text-blue-700" },
  skip: { label: "Skip", className: "bg-slate-100 text-slate-600" },
  error: { label: "Error", className: "bg-red-50 text-red-700" },
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

interface MaterialImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function MaterialImportDialog({ open, onOpenChange, onImported }: MaterialImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);

  const reset = () => {
    setFileName("");
    setRows(null);
    setError("");
    setLoading(false);
    setDragging(false);
    setUpdateExisting(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setRows(await readImportFile(file));
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof ImportFileError ? e.message : "Couldn't read this file.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const summary = useMemo(() => {
    const counts: Record<RowAction, number> = { create: 0, update: 0, skip: 0, error: 0 };
    const newCategories = new Map<string, string>();
    let existing = 0;
    for (const row of rows ?? []) {
      const action = getRowAction(row, updateExisting);
      counts[action]++;
      if (row.existingMaterialId && row.errors.length === 0) existing++;
      if ((action === "create" || action === "update") && !row.categoryId) {
        const key = nameKey(row.categoryName);
        if (!newCategories.has(key)) newCategories.set(key, row.categoryName);
      }
    }
    return { counts, existing, newCategories: [...newCategories.values()] };
  }, [rows, updateExisting]);

  const toImport = summary.counts.create + summary.counts.update;

  const handleImport = () => {
    if (!rows) return;
    const result = applyImport(rows, updateExisting);
    const parts = [`${result.created} added`, `${result.updated} updated`];
    if (result.categoriesCreated.length > 0) parts.push(plural(result.categoriesCreated.length, "new category", "new categories"));
    toast.success(`Import complete: ${parts.join(", ")}`);
    onImported();
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Materials</DialogTitle>
          <DialogDescription>
            {rows
              ? `Review ${plural(rows.length, "row")} from ${fileName} before importing.`
              : "Add or update materials in bulk from a CSV or Excel file."}
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <>
            <div className="space-y-5 py-2">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Start from the template</p>
                    <p className="text-xs text-muted-foreground">The Excel template includes an Instructions sheet explaining every column.</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" className="bg-card" onClick={() => downloadTemplate("xlsx")}>
                    <Download className="mr-2 h-4 w-4" />Excel template
                  </Button>
                  <Button variant="outline" size="sm" className="bg-card" onClick={() => downloadTemplate("csv")}>
                    <Download className="mr-2 h-4 w-4" />CSV
                  </Button>
                </div>
              </div>

              <label
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-slate-50",
                )}
              >
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={e => handleFile(e.target.files?.[0])} />
                {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-slate-400" />}
                <p className="mt-3 text-sm font-medium text-foreground">{loading ? "Reading file…" : "Drop your file here or click to browse"}</p>
                <p className="mt-1 text-xs text-muted-foreground">.xlsx, .xls or .csv</p>
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Columns</p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[560px] text-sm">
                    <tbody>
                      {IMPORT_COLUMNS.map(c => (
                        <tr key={c.field} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 align-top font-medium text-foreground">
                            {c.header}
                            {c.required && <span className="ml-0.5 text-red-500">*</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{c.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "New materials", value: summary.counts.create, icon: Plus, className: "bg-emerald-50 text-emerald-600" },
                  { label: "Updates", value: summary.counts.update, icon: RefreshCw, className: "bg-blue-50 text-blue-600" },
                  { label: "New categories", value: summary.newCategories.length, icon: Tags, className: "bg-violet-50 text-violet-600" },
                  { label: "Skipped", value: summary.counts.skip + summary.counts.error, icon: AlertCircle, className: "bg-red-50 text-red-600" },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", stat.className)}>
                      <stat.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-lg font-bold leading-tight tabular-nums text-foreground">{stat.value}</span>
                      <span className="block text-xs text-muted-foreground">{stat.label}</span>
                    </span>
                  </div>
                ))}
              </div>

              {summary.newCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <span>Categories to create:</span>
                  {summary.newCategories.map(name => (
                    <span key={name} className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{name}</span>
                  ))}
                </div>
              )}

              {summary.existing > 0 && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={updateExisting} onCheckedChange={v => setUpdateExisting(v === true)} />
                  Update {plural(summary.existing, "existing material")} with a matching name
                </label>
              )}

              {summary.counts.error > 0 && (
                <p className="text-sm text-red-600">
                  {plural(summary.counts.error, "row has", "rows have")} errors and will be skipped. Fix them in your file and upload it again to include them.
                </p>
              )}

              <div className="max-h-[45vh] overflow-auto rounded-xl border border-border">
                <table className="w-full min-w-[820px] text-sm [&_th]:whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const action = getRowAction(row, updateExisting);
                      return (
                        <tr key={row.rowNumber} className={cn("border-b border-border align-top last:border-0", action === "error" && "bg-red-50/40")}>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", actionBadge[action].className)}>{actionBadge[action].label}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{row.name || "—"}</td>
                          <td className="px-3 py-2">
                            <span className="whitespace-nowrap">{row.categoryName || "—"}</span>
                            {row.categoryName && !row.categoryId && (
                              <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">new</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{row.unit || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{row.unitPrice !== undefined ? formatCurrency(row.unitPrice) : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.stock ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.supplierName || "—"}</td>
                          <td className="px-3 py-2 text-xs">
                            {row.errors.map(msg => <p key={msg} className="text-red-600">{msg}</p>)}
                            {row.warnings.map(msg => <p key={msg} className="text-amber-600">{msg}</p>)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="secondary" onClick={() => { setRows(null); setFileName(""); }}>Choose another file</Button>
              <Button onClick={handleImport} disabled={toImport === 0}>
                <Upload className="mr-2 h-4 w-4" />Import {plural(toImport, "material")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
