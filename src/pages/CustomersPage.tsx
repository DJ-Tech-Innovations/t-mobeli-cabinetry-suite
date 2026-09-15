import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, type Customer } from "@/lib/data";
import { Plus, Search, Users, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(store.getCustomers());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "" });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", contactPerson: "", phone: "", email: "", address: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, contactPerson: c.contactPerson, phone: c.phone, email: c.email, address: c.address });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Customer name is required"); return; }
    if (editing) {
      store.updateCustomer(editing.id, form);
      toast.success("Customer updated");
    } else {
      store.addCustomer(form);
      toast.success("Customer added");
    }
    setCustomers(store.getCustomers());
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    store.deleteCustomer(id);
    setCustomers(store.getCustomers());
    toast.success("Customer deleted");
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Customers"
        description="Manage your customer directory"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Customer</Button>}
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers yet"
          description="Add your first customer to start creating projects and quotations."
          actionLabel="Add Customer"
          onAction={openNew}
        />
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
            <table className="w-full min-w-[720px] [&_th]:whitespace-nowrap [&_td_span]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Contact Person</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Phone</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Email</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <button onClick={() => navigate(`/customers/${c.id}`)} className="text-sm font-medium text-foreground hover:text-primary">
                        {c.name}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{c.contactPerson}</td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{c.phone}</td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{c.email}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Customer Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Add Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
