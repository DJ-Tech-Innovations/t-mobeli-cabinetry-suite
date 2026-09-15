import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { store, CATEGORY_COLORS, type Category, type CategoryColor } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Check, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** Full class strings so Tailwind can detect them. */
export const categoryBadgeStyles: Record<CategoryColor, string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
  slate: "bg-slate-50 text-slate-700 ring-slate-600/20",
};

const swatchStyles: Record<CategoryColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
};

export function CategoryBadge({ category }: { category?: Category }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        categoryBadgeStyles[category?.color ?? "slate"],
      )}
    >
      {category?.name ?? "Uncategorized"}
    </span>
  );
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after any create / update / delete so the parent can refresh. */
  onChange: () => void;
}

const emptyForm = { name: "", description: "", color: "blue" as CategoryColor };

export function CategoryManager({ open, onOpenChange, onChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState(store.getCategories());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const materials = store.getMaterials();
  const suppliers = store.getSuppliers();
  const usage = (id: string) => materials.filter((m) => m.category === id).length;
  const supplierUsage = (id: string) => suppliers.filter((s) => s.categoryId === id).length;

  const refresh = () => {
    setCategories(store.getCategories());
    onChange();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description, color: c.color });
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) { toast.error("Category name is required"); return; }
    const duplicate = categories.some((c) => c.id !== editingId && c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) { toast.error(`A category named "${name}" already exists`); return; }

    if (editingId) {
      store.updateCategory(editingId, { ...form, name });
      toast.success("Category updated");
    } else {
      store.addCategory({ ...form, name });
      toast.success("Category added");
    }
    resetForm();
    refresh();
  };

  const requestDelete = (c: Category) => {
    const count = usage(c.id);
    if (count > 0) {
      toast.error(`"${c.name}" is used by ${count} material${count === 1 ? "" : "s"}. Reassign them before deleting.`);
      return;
    }
    const supplierCount = supplierUsage(c.id);
    if (supplierCount > 0) {
      toast.error(`"${c.name}" is assigned to ${supplierCount} supplier${supplierCount === 1 ? "" : "s"}. Reassign them before deleting.`);
      return;
    }
    setPendingDelete(c);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    store.deleteCategory(pendingDelete.id);
    if (editingId === pendingDelete.id) resetForm();
    toast.success("Category deleted");
    setPendingDelete(null);
    refresh();
  };

  // The parent opens the dialog via the `open` prop, so reload here to pick up
  // categories created elsewhere (e.g. by a materials import)
  useEffect(() => {
    if (open) setCategories(store.getCategories());
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Tags className="h-5 w-5 text-primary" /> Material Categories
            </DialogTitle>
            <DialogDescription>Add, rename, recolor, or remove the categories used to group materials.</DialogDescription>
          </DialogHeader>

          {/* Add / edit form */}
          <div className="rounded-xl border border-border bg-slate-50/60 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{editingId ? "Edit Category" : "New Category"}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  placeholder="e.g. Laminates"
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional"
                  className="bg-card"
                />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    aria-label={color}
                    aria-pressed={form.color === color}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      swatchStyles[color],
                      form.color === color && "ring-2 ring-slate-900",
                    )}
                  >
                    {form.color === color && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Preview: <CategoryBadge category={{ id: "preview", name: form.name.trim() || "Category", description: "", color: form.color }} />
              </div>
              <div className="flex gap-2">
                {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
                <Button size="sm" onClick={handleSave}>
                  {editingId ? <><Check className="mr-1.5 h-4 w-4" />Save</> : <><Plus className="mr-1.5 h-4 w-4" />Add Category</>}
                </Button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="overflow-hidden rounded-xl border border-border">
            {categories.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No categories yet. Add your first one above.</p>
            ) : (
              <ul className="divide-y divide-border">
                {categories.map((c) => {
                  const count = usage(c.id);
                  return (
                    <li
                      key={c.id}
                      className={cn("flex items-center gap-3 px-4 py-3 transition-colors", editingId === c.id ? "bg-blue-50/60" : "hover:bg-muted/50")}
                    >
                      <span className={cn("h-3 w-3 shrink-0 rounded-full", swatchStyles[c.color])} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                        {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">
                        {count} material{count === 1 ? "" : "s"}
                      </span>
                      <div className="flex shrink-0 items-center">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => requestDelete(c)} aria-label={`Delete ${c.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be permanently removed. This can't be undone.
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
    </>
  );
}
