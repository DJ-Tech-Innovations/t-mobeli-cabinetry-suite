import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, type Project } from "@/lib/data";
import { Plus, Search, FolderKanban, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(store.getProjects());
  const customers = store.getCustomers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", customerId: "", status: "active" as Project['status'] });

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", customerId: customers[0]?.id || "", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description, customerId: p.customerId, status: p.status });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Project name is required"); return; }
    if (!form.customerId) { toast.error("Select a customer"); return; }
    if (editing) {
      store.updateProject(editing.id, form);
      toast.success("Project updated");
    } else {
      store.addProject(form);
      toast.success("Project created");
    }
    setProjects(store.getProjects());
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    store.deleteProject(id);
    setProjects(store.getProjects());
    toast.success("Project deleted");
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Projects"
        description="Manage all cabinetry projects"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Project</Button>}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects yet"
          description="Create your first project to start building quotations."
          actionLabel="Create Project"
          onAction={openNew}
        />
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Project</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Customer</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Created</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const customer = store.getCustomer(p.customerId);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <button onClick={() => navigate(`/projects/${p.id}`)} className="text-sm font-medium text-foreground hover:text-primary">{p.name}</button>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{customer?.name}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          p.status === 'active' ? 'bg-green-100 text-green-700' :
                          p.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-secondary text-secondary-foreground'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{p.createdAt}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={v => setForm({...form, customerId: v})}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Project Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            {editing && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v as Project['status']})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create Project"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
