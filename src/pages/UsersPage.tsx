import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { store, type Role, type User } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ExternalLink, KeyRound, Pencil, Plus, Search, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";

const NONE = "none";

const roleBadge = (role?: Role) => {
  switch (role?.name) {
    case "admin": return "bg-red-50 text-red-700 ring-red-600/20";
    case "manager": return "bg-purple-50 text-purple-700 ring-purple-600/20";
    case "agent": return "bg-blue-50 text-blue-700 ring-blue-600/20";
    default: return "bg-slate-50 text-slate-700 ring-slate-500/20";
  }
};

const initials = (name: string) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const UsersPage = () => {
  const navigate = useNavigate();
  const roles = store.getRoles();
  const employees = store.getEmployees();
  const totalPermissions = store.getPermissions().length;
  const defaultRoleId = roles.find(r => r.name === "staff")?.id ?? roles[roles.length - 1]?.id ?? "";

  const [users, setUsers] = useState(store.getUsers());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", roleId: defaultRoleId, employeeId: "", status: "active" as User["status"] });

  const [permUser, setPermUser] = useState<User | null>(null);
  const [permDraft, setPermDraft] = useState<string[]>([]);

  const refresh = () => setUsers(store.getUsers());

  const q = search.trim().toLowerCase();
  const filtered = users.filter(u =>
    (roleFilter === "all" || u.roleId === roleFilter) &&
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", roleId: defaultRoleId, employeeId: "", status: "active" });
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, roleId: u.roleId, employeeId: u.employeeId ?? "", status: u.status });
    setFormOpen(true);
  };

  const handleSave = () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) { toast.error("Name and email are required"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    if (!form.roleId) { toast.error("Select a role"); return; }
    if (users.some(u => u.id !== editing?.id && u.email.toLowerCase() === email)) { toast.error(`${email} is already used by another user`); return; }

    const data = { name, email, roleId: form.roleId, employeeId: form.employeeId || undefined, status: form.status };
    if (editing) {
      store.updateUser(editing.id, data);
      toast.success(`${name} updated`);
    } else {
      store.addUser({ ...data, directPermissions: [] });
      toast.success(`User ${name} created`);
    }
    refresh();
    setFormOpen(false);
  };

  const openPermissions = (u: User) => {
    setPermUser(u);
    setPermDraft(store.getUserPermissions(u.id).direct);
  };

  const permRole = permUser ? store.getRole(permUser.roleId) : undefined;
  const rolePerms = permRole?.permissions ?? [];
  const draftDirect = permDraft.filter(id => !rolePerms.includes(id));
  const draftEffective = new Set([...rolePerms, ...draftDirect]).size;
  const savedDirect = permUser ? store.getUserPermissions(permUser.id).direct : [];
  const permDirty = draftDirect.length !== savedDirect.length || draftDirect.some(id => !savedDirect.includes(id));

  const savePermissions = () => {
    if (!permUser) return;
    store.updateUser(permUser.id, { directPermissions: draftDirect });
    toast.success(`Direct permissions saved for ${permUser.name}`, {
      description: `${draftDirect.length} direct · ${draftEffective} total permissions`,
    });
    refresh();
    setPermUser(null);
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="User Management"
        description="Manage user accounts, their roles, and any extra permissions"
        actions={
          <>
            <Button variant="outline" className="bg-card" onClick={() => navigate("/roles")}>
              <Shield className="mr-2 h-4 w-4" />Roles & Permissions
            </Button>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add User</Button>
          </>
        }
      />

      {users.length === 0 ? (
        <EmptyState icon={<UserCog className="h-6 w-6" />} title="No users yet" description="Create your first user account." actionLabel="Add User" onAction={openNew} />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-card sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
            <table className="w-full min-w-[860px] [&_th]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  {["User", "Role", "Access", "Linked Employee", "Status", "Last Login"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">No users match your filters.</td></tr>
                ) : filtered.map(u => {
                  const role = store.getRole(u.roleId);
                  const emp = u.employeeId ? store.getEmployee(u.employeeId) : null;
                  const access = store.getUserPermissions(u.id);
                  return (
                    <tr key={u.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{initials(u.name)}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", roleBadge(role))}>{role?.label ?? "No role"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => openPermissions(u)} className="group flex items-center gap-2 text-left text-sm" title="Manage permissions">
                          <span className="tabular-nums text-foreground group-hover:text-primary">{access.effective.length}/{totalPermissions}</span>
                          {access.direct.length > 0 && (
                            <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              +{access.direct.length} direct
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{emp?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", u.status === "active" ? "bg-green-100 text-green-700" : "bg-secondary text-secondary-foreground")}>{u.status}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{u.lastLogin ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openPermissions(u)}><KeyRound className="mr-1.5 h-4 w-4" />Permissions</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.name}`}><Pencil className="h-4 w-4" /></Button>
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

      {/* Add / edit user */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{editing ? `Edit ${editing.name}` : "Add User"}</DialogTitle>
            {editing && <DialogDescription>Changing the role keeps this user's direct permissions.</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.roleId} onValueChange={v => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.label} — {r.permissions.length} permissions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Link to Employee</Label>
                <Select value={form.employeeId || NONE} onValueChange={v => setForm({ ...form, employeeId: v === NONE ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.position}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as User["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Save Changes" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct permissions */}
      <Dialog open={!!permUser} onOpenChange={o => !o && setPermUser(null)}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-border px-6 py-5 pr-12 text-left">
            <DialogTitle className="text-xl">Permissions — {permUser?.name}</DialogTitle>
            <DialogDescription>
              Permissions from the role are locked here; change those on the Roles page. Tick any extra permissions to grant them directly to this user.
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", roleBadge(permRole))}>
                Role: {permRole?.label ?? "None"} · {rolePerms.length}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Direct: {draftDirect.length}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Total: {draftEffective}/{totalPermissions}
              </span>
              {permRole && (
                <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => navigate(`/roles?role=${permRole.id}`)}>
                  Edit {permRole.label} role <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {permUser && (
              <PermissionMatrix
                key={permUser.id}
                selected={draftDirect}
                onChange={setPermDraft}
                locked={rolePerms}
                lockedLabel={`From ${permRole?.label ?? "role"}`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-4">
            <Button variant="ghost" size="sm" onClick={() => setPermDraft([])} disabled={draftDirect.length === 0} className="text-muted-foreground">
              Remove all direct permissions
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPermUser(null)}>Cancel</Button>
              <Button onClick={savePermissions} disabled={!permDirty}>Save Permissions</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
