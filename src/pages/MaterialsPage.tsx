import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, formatCurrency, type Material } from "@/lib/data";
import { Plus, Search, Package, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const categories: Material['category'][] = ['wood', 'hardware', 'finishing', 'adhesive', 'other'];

const MaterialsPage = () => {
  const [materials, setMaterials] = useState(store.getMaterials());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({ name: "", category: "wood" as Material['category'], unit: "", unitPrice: 0, description: "" });

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", category: "wood", unit: "", unitPrice: 0, description: "" });
    setDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({ name: m.name, category: m.category, unit: m.unit, unitPrice: m.unitPrice, description: m.description });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Material name is required"); return; }
    if (!form.unit.trim()) { toast.error("Unit is required"); return; }
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
    store.deleteMaterial(id);
    setMaterials(store.getMaterials());
    toast.success("Material deleted");
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Materials & Pricing"
        description="Manage materials, hardware, and pricing"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Material</Button>}
      />

      {materials.length === 0 ? (
        <EmptyState icon={<Package className="h-6 w-6" />} title="No materials yet" description="Add materials to use in quotation BOMs." actionLabel="Add Material" onAction={openNew} />
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Material</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Category</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Unit</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Unit Price</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </td>
                    <td className="px-6 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">{m.category}</span></td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{m.unit}</td>
                    <td className="px-6 py-3.5 text-sm text-right font-medium tabular-nums text-foreground">{formatCurrency(m.unitPrice)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Material" : "Add Material"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Material Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v as Material['category']})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit *</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="e.g. sheet, pc, roll" /></div>
            </div>
            <div><Label>Unit Price (₱) *</Label><Input type="number" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: Number(e.target.value)})} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Add Material"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
