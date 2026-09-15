import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { FurnitureTemplateDialog, type TemplateFormData } from "@/components/FurnitureTemplateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { store, formatCurrency, getVariantCost, FURNITURE_CATEGORIES, type FurnitureCategory, type FurnitureTemplate } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Box, Hammer, LayoutGrid, Layers, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FurnitureCategoryBadge } from "@/components/FurnitureCategoryBadge";

const range = (values: number[], format: (n: number) => string = String) => {
  if (values.length === 0) return "—";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? format(min) : `${format(min)} – ${format(max)}`;
};

type ViewMode = "grid" | "list";
const VIEW_KEY = "tmobeli.furnitureBuilderView";

const loadViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

const FurnitureBuilderPage = () => {
  const [templates, setTemplates] = useState(store.getTemplates());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | FurnitureCategory>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<FurnitureTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FurnitureTemplate | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      // ignore storage errors
    }
  };

  const filtered = templates.filter(t => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    return matchSearch && (categoryFilter === "all" || t.category === categoryFilter);
  });

  const openDialog = (template: FurnitureTemplate | null) => {
    setEditing(template);
    setDialogKey(k => k + 1); // remount so the form starts from fresh state
    setDialogOpen(true);
  };

  const handleSave = (data: TemplateFormData) => {
    if (editing) {
      store.updateTemplate(editing.id, data);
      toast.success(`Template ${data.code} updated`);
    } else {
      store.addTemplate(data);
      toast.success(`Template ${data.code} created`);
    }
    setTemplates(store.getTemplates());
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    store.deleteTemplate(pendingDelete.id);
    toast.success(`Template ${pendingDelete.code} deleted`);
    setPendingDelete(null);
    setTemplates(store.getTemplates());
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Furniture Builder"
        description="Configure furniture types and their bill of materials by size variant."
        actions={<Button onClick={() => openDialog(null)}><Plus className="h-4 w-4 mr-2" />New Template</Button>}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<Hammer className="h-6 w-6" />}
          title="No furniture templates yet"
          description="Create a template with size variants and a bill of materials for each."
          actionLabel="New Template"
          onAction={() => openDialog(null)}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card pl-9" />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {[{ id: "all" as const, label: "All" }, ...FURNITURE_CATEGORIES].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id)}
                  aria-pressed={categoryFilter === c.id}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    categoryFilter === c.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground shadow-card hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="inline-flex self-start rounded-lg bg-card p-1 shadow-card lg:ml-auto lg:self-auto" role="group" aria-label="View mode">
              {([
                { id: "grid", label: "Grid view", icon: LayoutGrid },
                { id: "list", label: "List view", icon: List },
              ] as const).map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => changeViewMode(v.id)}
                  aria-pressed={viewMode === v.id}
                  title={v.label}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    viewMode === v.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <v.icon className="h-4 w-4" />
                  <span className="sr-only">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mb-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{templates.length}</span> total template{templates.length === 1 ? "" : "s"}
            <span className="mx-2">·</span>
            <span className="font-semibold text-foreground">{filtered.length}</span> shown
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-card">
              No templates match your filters.
            </div>
          ) : viewMode === "list" ? (
            <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
              <table className="w-full min-w-[860px] [&_th]:whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Template</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Variants</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Materials</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Material Cost</th>
                    <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const itemCounts = t.variants.map(v => v.items.length);
                    const costs = t.variants.map(v => getVariantCost(v));
                    return (
                      <tr
                        key={t.id}
                        onClick={() => openDialog(t)}
                        className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                              {t.image ? (
                                <img src={t.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Box className="h-5 w-5 text-slate-300" strokeWidth={1.5} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">{t.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <FurnitureCategoryBadge category={t.category} />
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex gap-1">
                            {t.variants.map(v => (
                              <span key={v.id} className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{v.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right text-sm tabular-nums text-muted-foreground whitespace-nowrap">{range(itemCounts)}</td>
                        <td className="px-6 py-3.5 text-right text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">{range(costs, formatCurrency)}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => { e.stopPropagation(); openDialog(t); }}
                              aria-label={`Edit ${t.code}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => { e.stopPropagation(); setPendingDelete(t); }}
                              aria-label={`Delete ${t.code}`}
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map(t => {
                const itemCounts = t.variants.map(v => v.items.length);
                const costs = t.variants.map(v => getVariantCost(v));
                return (
                  <div key={t.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-shadow hover:shadow-card-hover">
                    <div className="flex h-40 items-center justify-center bg-slate-100">
                      {t.image ? (
                        <img src={t.image} alt={t.name} className="h-full w-full object-cover" />
                      ) : (
                        <Box className="h-12 w-12 text-slate-300" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">{t.code}</span>
                        <FurnitureCategoryBadge category={t.category} />
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-foreground">{t.name}</h3>
                      {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        <Layers className="h-4 w-4 text-slate-400" />
                        <span className="mr-1">{t.variants.length} variant{t.variants.length === 1 ? "" : "s"}:</span>
                        {t.variants.map(v => (
                          <span key={v.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{v.name}</span>
                        ))}
                      </div>

                      <div className="mt-auto pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
                          <span className="text-muted-foreground">{range(itemCounts)} materials per variant</span>
                          <span className="whitespace-nowrap font-semibold tabular-nums text-foreground" title="Material cost per variant">{range(costs, formatCurrency)}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => openDialog(t)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit Template
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setPendingDelete(t)} aria-label={`Delete ${t.code}`} className="hover:bg-red-50">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <FurnitureTemplateDialog key={dialogKey} open={dialogOpen} onOpenChange={setDialogOpen} template={editing} onSave={handleSave} />

      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.code} — {pendingDelete?.name}" and all of its variants will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FurnitureBuilderPage;
