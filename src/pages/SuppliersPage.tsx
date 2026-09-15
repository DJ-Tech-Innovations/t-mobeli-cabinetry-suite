import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CategoryBadge } from "@/components/CategoryManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { store, type Supplier } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Building2, CheckCircle2, Mail, MapPin, Package, Pencil, Phone, Plus, Power, Search, Trash2, X, XCircle } from "lucide-react";
import { toast } from "sonner";

type StatusFilter = "all" | Supplier["status"];

const emptyForm = { name: "", categoryId: "", contactPerson: "", phone: "", email: "", address: "", notes: "" };

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState(store.getSuppliers());
  const categories = store.getCategories();
  const materials = store.getMaterials();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  const refresh = () => setSuppliers(store.getSuppliers());
  const materialCount = (id: string) => materials.filter((m) => m.supplierId === id).length;

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const inactiveCount = suppliers.length - activeCount;
  const categoryCount = new Set(suppliers.map((s) => s.categoryId)).size;

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = [s.name, s.contactPerson, s.email, s.phone, s.address].some((v) => v.toLowerCase().includes(q));
    const matchCat = categoryFilter === "all" || s.categoryId === categoryFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const hasFilters = search !== "" || categoryFilter !== "all" || statusFilter !== "all";

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, categoryId: s.categoryId, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, notes: s.notes });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) { toast.error("Company name is required"); return; }
    if (!form.categoryId) { toast.error("Category is required"); return; }
    if (!form.contactPerson.trim()) { toast.error("Contact person is required"); return; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { toast.error("Enter a valid email address"); return; }
    if (suppliers.some((s) => s.id !== editing?.id && s.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`A supplier named "${name}" already exists`);
      return;
    }

    if (editing) {
      store.updateSupplier(editing.id, { ...form, name });
      toast.success("Supplier updated");
    } else {
      store.addSupplier({ ...form, name, status: "active" });
      toast.success("Supplier added");
    }
    refresh();
    setDialogOpen(false);
  };

  const toggleStatus = (s: Supplier) => {
    const status = s.status === "active" ? "inactive" : "active";
    store.updateSupplier(s.id, { status });
    toast.success(`${s.name} ${status === "active" ? "activated" : "deactivated"}`);
    refresh();
  };

  const requestDelete = (s: Supplier) => {
    const count = materialCount(s.id);
    if (count > 0) {
      toast.error(`${s.name} supplies ${count} material${count === 1 ? "" : "s"}. Reassign them or deactivate the supplier instead.`);
      return;
    }
    const poCount = store.getPurchaseOrders().filter((po) => po.supplierId === s.id).length;
    if (poCount > 0) {
      toast.error(`${s.name} has ${poCount} purchase order${poCount === 1 ? "" : "s"} on record. Deactivate the supplier instead.`);
      return;
    }
    setPendingDelete(s);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    store.deleteSupplier(pendingDelete.id);
    toast.success("Supplier deleted");
    setPendingDelete(null);
    refresh();
  };

  const stats = [
    { label: "Total Suppliers", value: suppliers.length, hint: `${categoryCount} ${categoryCount === 1 ? "category" : "categories"}`, icon: Building2, iconColor: "text-slate-400", valueColor: "text-foreground" },
    { label: "Active", value: activeCount, hint: "Currently supplying materials", icon: CheckCircle2, iconColor: "text-emerald-500", valueColor: "text-emerald-600" },
    { label: "Inactive", value: inactiveCount, hint: "Paused or discontinued", icon: XCircle, iconColor: "text-slate-400", valueColor: inactiveCount > 0 ? "text-slate-700" : "text-slate-400" },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Suppliers"
        description="Manage your material suppliers and their contact information"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="label-caps">{s.label}</p>
              <s.icon className={cn("h-5 w-5", s.iconColor)} />
            </div>
            <p className={cn("mt-2 text-3xl font-bold tabular-nums", s.valueColor)}>{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No suppliers yet"
          description="Add the companies you buy materials from to keep their contact details in one place."
          actionLabel="Add Supplier"
          onAction={openNew}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full bg-card sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="inline-flex rounded-lg bg-card p-1 shadow-card" role="group" aria-label="Filter by status">
                {(["all", "active", "inactive"] as StatusFilter[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    aria-pressed={statusFilter === value}
                    className={cn(
                      "rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      statusFilter === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); }} className="text-muted-foreground">
                  <X className="mr-1 h-4 w-4" />Clear
                </Button>
              )}
            </div>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-card">
              No suppliers match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((s) => {
                const active = s.status === "active";
                const count = materialCount(s.id);
                return (
                  <div
                    key={s.id}
                    className={cn("flex flex-col rounded-2xl bg-card shadow-card transition-shadow hover:shadow-card-hover", !active && "opacity-75")}
                  >
                    <div className="flex-1 p-5">
                      <div className="flex items-start gap-3">
                        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", active ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400")}>
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold text-foreground">{s.name}</h3>
                          <p className="truncate text-sm text-muted-foreground">{s.contactPerson}</p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20",
                          )}
                        >
                          {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={categories.find((c) => c.id === s.categoryId)} />
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                          <Package className="h-3 w-3" />{count} material{count === 1 ? "" : "s"}
                        </span>
                      </div>

                      <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          {s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="truncate hover:text-primary">{s.phone}</a> : <span className="text-slate-400">No phone</span>}
                        </div>
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          {s.email ? <a href={`mailto:${s.email}`} className="truncate hover:text-primary">{s.email}</a> : <span className="text-slate-400">No email</span>}
                        </div>
                        <div className="flex items-start gap-2.5 text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span className={cn("line-clamp-2", !s.address && "text-slate-400")}>{s.address || "No address"}</span>
                        </div>
                      </dl>

                      {s.notes && (
                        <p className="mt-3 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{s.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 border-t border-border px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="mr-1.5 h-4 w-4" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(s)} className="text-muted-foreground">
                          {active ? <XCircle className="mr-1.5 h-4 w-4" /> : <Power className="mr-1.5 h-4 w-4" />}
                          {active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => requestDelete(s)} className="text-destructive hover:bg-red-50 hover:text-destructive">
                        <Trash2 className="mr-1.5 h-4 w-4" />Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-xl">{editing ? "Edit Supplier" : "Add New Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PH Wood Supply Co." />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person *</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+63 9XX XXX XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="orders@supplier.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Lead times, minimum orders, payment terms..." />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update Supplier" : "Add Supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" and its contact details will be permanently removed. This can't be undone.
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

export default SuppliersPage;
