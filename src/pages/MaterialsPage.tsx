import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { CategoryBadge, CategoryManager } from "@/components/CategoryManager";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, formatCurrency, getStockStatus, getStockPercent, type Material, type StockStatus } from "@/lib/data";
import { cn } from "@/lib/utils";
import { MaterialImportDialog } from "@/components/MaterialImportDialog";
import { Plus, Search, Package, Trash2, Pencil, CheckCircle2, AlertTriangle, TrendingDown, X, Tags, Upload } from "lucide-react";
import { toast } from "sonner";

const stockBarColor: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

type StockFilter = "all" | StockStatus;

const emptyForm = { name: "", category: "", unit: "", unitPrice: 0, stock: 0, lowStockThreshold: 10, supplierId: "", description: "" };

const MaterialsPage = () => {
  const [materials, setMaterials] = useState(store.getMaterials());
  const [categories, setCategories] = useState(store.getCategories());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const suppliers = store.getSuppliers();
  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? "";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm);

  const counts = materials.reduce(
    (acc, m) => { acc[getStockStatus(m)]++; return acc; },
    { "in-stock": 0, low: 0, out: 0 } as Record<StockStatus, number>,
  );

  const filtered = materials.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || supplierName(m.supplierId).toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || m.category === categoryFilter;
    const matchStock = stockFilter === "all" || getStockStatus(m) === stockFilter;
    return matchSearch && matchCat && matchStock;
  });

  const toggleStockFilter = (value: StockStatus) => setStockFilter(prev => (prev === value ? "all" : value));

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({ name: m.name, category: m.category, unit: m.unit, unitPrice: m.unitPrice, stock: m.stock, lowStockThreshold: m.lowStockThreshold, supplierId: m.supplierId, description: m.description });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Material name is required"); return; }
    if (!form.category) { toast.error("Category is required"); return; }
    if (!form.unit.trim()) { toast.error("Unit is required"); return; }
    if (form.unitPrice < 0 || form.stock < 0 || form.lowStockThreshold < 0) { toast.error("Values cannot be negative"); return; }
    if (editing) {
      store.updateMaterial(editing.id, form);
      toast.success("Material updated");
    } else {
      store.addMaterial(form);
      toast.success("Material added");
    }
    setMaterials(store.getMaterials());
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const templateCount = store.countTemplatesUsingMaterial(id);
    if (templateCount > 0) {
      toast.error(`This material is used in ${templateCount} furniture template${templateCount === 1 ? "" : "s"}. Remove it from their BOMs first.`);
      return;
    }
    store.deleteMaterial(id);
    setMaterials(store.getMaterials());
    toast.success("Material deleted");
  };

  const statCards: { status: StockStatus; label: string; value: number; icon: typeof Package; iconBox: string; valueColor: string; ring: string; clickable: boolean }[] = [
    { status: "in-stock", label: "Well Stocked", value: counts["in-stock"], icon: CheckCircle2, iconBox: "bg-emerald-50 text-emerald-600", valueColor: "text-foreground", ring: "ring-emerald-500", clickable: false },
    { status: "low", label: "Low Stock", value: counts.low, icon: AlertTriangle, iconBox: "bg-amber-50 text-amber-600", valueColor: "text-amber-600", ring: "ring-amber-500", clickable: true },
    { status: "out", label: "Out of Stock", value: counts.out, icon: TrendingDown, iconBox: "bg-red-50 text-red-600", valueColor: "text-red-600", ring: "ring-red-500", clickable: true },
  ];

  const needsRestock = counts.low + counts.out;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Materials & Inventory"
        description="Manage materials, stock levels, and pricing"
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="bg-card">
              <Tags className="h-4 w-4 mr-2" />Categories
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="bg-card">
              <Upload className="h-4 w-4 mr-2" />Import
            </Button>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Material</Button>
          </>
        }
      />

      {materials.length === 0 ? (
        <EmptyState icon={<Package className="h-6 w-6" />} title="No materials yet" description="Add materials to use in quotation BOMs." actionLabel="Add Material" onAction={openNew} />
      ) : (
        <>
          {/* Stock summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statCards.map(card => {
              const active = stockFilter === card.status;
              const content = (
                <>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", card.iconBox)}>
                    <card.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className={cn("block text-2xl font-bold tabular-nums", card.value > 0 ? card.valueColor : "text-foreground")}>{card.value}</span>
                    <span className="block text-sm text-muted-foreground">
                      {card.label}{card.clickable && <span className="hidden xl:inline"> — click to filter</span>}
                    </span>
                  </span>
                </>
              );
              const className = cn(
                "flex items-center gap-4 rounded-2xl bg-card p-5 shadow-card transition-shadow",
                card.clickable && "hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active && `ring-2 ${card.ring}`,
              );
              return card.clickable ? (
                <button key={card.status} type="button" onClick={() => toggleStockFilter(card.status)} aria-pressed={active} className={className}>
                  {content}
                </button>
              ) : (
                <div key={card.status} className={className}>{content}</div>
              );
            })}
          </div>

          {/* Restock alert */}
          {needsRestock > 0 && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">
                    {needsRestock} {needsRestock === 1 ? "material needs" : "materials need"} restocking.
                  </span>{" "}
                  Consider creating a purchase order to restock.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStockFilter(counts.low > 0 ? "low" : "out")}
                  className="border-amber-300 bg-white text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                >
                  View items
                </Button>
                <Button asChild size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                  <Link to="/purchase-orders?restock=1">Create PO</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search materials or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-card sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={v => setStockFilter(v as StockFilter)}>
              <SelectTrigger className="bg-card sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="in-stock">Well Stocked</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            {(search || categoryFilter !== "all" || stockFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); }} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
            <table className="w-full min-w-[900px] [&_th]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Level</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No materials match your filters.</td>
                  </tr>
                ) : filtered.map(m => {
                  const status = getStockStatus(m);
                  const percent = getStockPercent(m);
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <Package className="h-4 w-4" />
                          </span>
                          <div className="min-w-[180px]">
                            <p className="text-sm font-medium text-foreground">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <CategoryBadge category={categories.find(c => c.id === m.category)} />
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{supplierName(m.supplierId) || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="w-44">
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm">
                              <span className={cn("font-semibold tabular-nums", status === "in-stock" ? "text-foreground" : status === "low" ? "text-amber-600" : "text-red-600")}>{m.stock}</span>
                              <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>
                            </p>
                            {status !== "in-stock" && (
                              <span className={cn("text-[11px] font-medium", status === "low" ? "text-amber-600" : "text-red-600")}>
                                {status === "low" ? "Low" : "Out"}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div className={cn("h-full rounded-full transition-all", stockBarColor[status])} style={{ width: `${percent}%` }} />
                            </div>
                            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{percent}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Min: {m.lowStockThreshold} {m.unit}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold tabular-nums text-foreground whitespace-nowrap">{formatCurrency(m.unitPrice)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)} aria-label={`Edit ${m.name}`}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} aria-label={`Delete ${m.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CategoryManager
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onChange={() => {
          setCategories(store.getCategories());
          setMaterials(store.getMaterials());
          setCategoryFilter(f => (f === "all" || store.getCategory(f) ? f : "all"));
        }}
      />

      <MaterialImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={() => {
          setMaterials(store.getMaterials());
          setCategories(store.getCategories());
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-xl">{editing ? "Edit Material" : "Add Material"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Material Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder='e.g. Marine Plywood 3/4"' />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="e.g. sheet, pc, roll" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price (₱) *</Label>
              <Input type="number" min={0} step="0.01" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Current Stock</Label>
                <Input type="number" min={0} value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <Label>Low Stock Threshold</Label>
                <Input type="number" min={0} value={form.lowStockThreshold} onChange={e => setForm({...form, lowStockThreshold: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplierId || "none"} onValueChange={v => setForm({...form, supplierId: v === "none" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers
                    .filter(s => s.status === "active" || s.id === form.supplierId)
                    .map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.status === "inactive" ? " (inactive)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update Material" : "Add Material"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
