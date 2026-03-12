import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, type User } from "@/lib/data";
import { Plus, Search, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";

const UsersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setRefresh] = useState(0);

  const roles = store.getRoles();
  const employees = store.getEmployees();

  const [form, setForm] = useState({
    name: '', email: '', roleId: roles[3]?.id || '', employeeId: '', status: 'active' as User['status'],
  });

  const users = store.getUsers();
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    store.addUser({ ...form, employeeId: form.employeeId || undefined });
    toast.success(`User ${form.name} created`);
    setForm({ name: '', email: '', roleId: roles[3]?.id || '', employeeId: '', status: 'active' });
    setDialogOpen(false);
    setRefresh(r => r + 1);
  };

  const roleColor = (name: string) => {
    switch (name) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-purple-100 text-purple-700';
      case 'agent': return 'bg-blue-100 text-blue-700';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="User Management"
        description="Manage user accounts and role assignments"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/roles')}>
              <Shield className="h-4 w-4 mr-2" />Roles & Permissions
            </Button>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
          </div>
        }
      />

      {users.length === 0 ? (
        <EmptyState icon={<UserCog className="h-6 w-6" />} title="No users yet" description="Create your first user account." actionLabel="Add User" onAction={() => setDialogOpen(true)} />
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">User</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Role</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Linked Employee</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const role = store.getRole(u.roleId);
                  const emp = u.employeeId ? store.getEmployee(u.employeeId) : null;
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColor(role?.name || '')}`}>
                          {role?.label || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{emp?.name || '—'}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary text-secondary-foreground'
                        }`}>{u.status}</span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{u.lastLogin || '—'}</td>
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
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={v => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.label} — {r.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Employee (optional)</Label>
              <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.position}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
