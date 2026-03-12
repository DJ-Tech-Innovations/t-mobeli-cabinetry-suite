import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, type Employee } from "@/lib/data";
import { Plus, Search, UserCheck, Users2, Percent, Badge } from "lucide-react";
import { toast } from "sonner";

const EmployeesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'agents' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setRefresh] = useState(0);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', position: '', department: '',
    isAgent: false, commissionPercent: 0, status: 'active' as Employee['status'],
  });

  const employees = store.getEmployees();
  const filtered = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase());
    if (filter === 'agents') return matchesSearch && e.isAgent;
    if (filter === 'active') return matchesSearch && e.status === 'active';
    if (filter === 'inactive') return matchesSearch && e.status === 'inactive';
    return matchesSearch;
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    store.addEmployee(form);
    toast.success(`Employee ${form.name} added`);
    setForm({ name: '', email: '', phone: '', position: '', department: '', isAgent: false, commissionPercent: 0, status: 'active' });
    setDialogOpen(false);
    setRefresh(r => r + 1);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Employees"
        description="Manage staff and sales agents"
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>}
      />

      {employees.length === 0 ? (
        <EmptyState icon={<Users2 className="h-6 w-6" />} title="No employees yet" description="Add your first employee to get started." actionLabel="Add Employee" onAction={() => setDialogOpen(true)} />
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filter} onValueChange={v => setFilter(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="agents">Agents Only</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Position</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Department</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Agent</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-foreground">Commission</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/employees/${e.id}`)}>
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-foreground">{e.position}</td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{e.department}</td>
                    <td className="px-6 py-3.5">
                      {e.isAgent && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> Agent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-right tabular-nums text-foreground">{e.isAgent ? `${e.commissionPercent}%` : '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary text-secondary-foreground'
                      }`}>{e.status}</span>
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
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Position</Label><Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Procurement">Procurement</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between bg-muted rounded-xl p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Sales Agent</p>
                <p className="text-xs text-muted-foreground">Enable if this employee handles sales and earns commission</p>
              </div>
              <Switch checked={form.isAgent} onCheckedChange={v => setForm({ ...form, isAgent: v })} />
            </div>
            {form.isAgent && (
              <div>
                <Label>Commission Rate (%)</Label>
                <Input type="number" value={form.commissionPercent} onChange={e => setForm({ ...form, commissionPercent: Number(e.target.value) })} min={0} max={100} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
