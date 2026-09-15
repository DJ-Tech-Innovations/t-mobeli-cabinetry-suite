import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { store, type Role } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ArrowLeft, Copy, KeyRound, Lock, Pencil, Plus, Shield, Trash2, Users2 } from "lucide-react";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));

type DialogMode = "create" | "edit" | "duplicate";
interface RoleFormData { label: string; name: string; description: string; copyFrom?: string }

const RolesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roles, setRoles] = useState(store.getRoles());
  const [selectedId, setSelectedId] = useState(() => {
    const requested = searchParams.get("role");
    return requested && store.getRole(requested) ? requested : roles[0]?.id ?? "";
  });
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [dialog, setDialog] = useState<{ mode: DialogMode; role?: Role } | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const totalPermissions = store.getPermissions().length;
  const users = store.getUsers();
  const selected = roles.find(r => r.id === selectedId) ?? roles[0];

  const refresh = () => setRoles(store.getRoles());
  const permsOf = (r: Role) => drafts[r.id] ?? r.permissions;
  const isDirty = (r: Role) => drafts[r.id] !== undefined && !sameSet(drafts[r.id], r.permissions);
  const dropDraft = (id: string) => setDrafts(d => { const next = { ...d }; delete next[id]; return next; });

  const openDialog = (mode: DialogMode, role?: Role) => {
    setDialog({ mode, role });
    setDialogKey(k => k + 1);
  };

  const handleDialogSave = (data: RoleFormData) => {
    if (!dialog) return;
    if (dialog.mode === "edit" && dialog.role) {
      store.updateRole(dialog.role.id, { label: data.label, name: data.name, description: data.description });
      toast.success(`${data.label} updated`);
    } else {
      const permissions = dialog.mode === "duplicate" && dialog.role
        ? permsOf(dialog.role)
        : data.copyFrom ? store.getRole(data.copyFrom)?.permissions ?? [] : [];
      const role = store.addRole({ label: data.label, name: data.name, description: data.description, permissions: [...permissions] });
      setSelectedId(role.id);
      toast.success(`Role ${role.label} created`, { description: permissions.length ? `${permissions.length} permissions copied` : "Now choose its permissions" });
    }
    refresh();
    setDialog(null);
  };

  const saveSelected = () => {
    if (!selected) return;
    const next = drafts[selected.id];
    store.updateRole(selected.id, { permissions: next });
    dropDraft(selected.id);
    refresh();
    const affected = store.countUsersInRole(selected.id);
    toast.success(`Permissions saved for ${selected.label}`, {
      description: `${next.length} permissions · applies to ${affected} user${affected === 1 ? "" : "s"}`,
    });
  };

  const requestDelete = (role: Role) => {
    if (role.isSystem) { toast.error(`${role.label} is a system role and can't be deleted`); return; }
    const count = store.countUsersInRole(role.id);
    if (count > 0) {
      toast.error(`${role.label} is assigned to ${count} user${count === 1 ? "" : "s"}`, { description: "Move them to another role first." });
      return;
    }
    setPendingDelete(role);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (store.deleteRole(pendingDelete.id)) {
      dropDraft(pendingDelete.id);
      toast.success(`Role ${pendingDelete.label} deleted`);
      const remaining = store.getRoles();
      setRoles(remaining);
      if (selectedId === pendingDelete.id) setSelectedId(remaining[0]?.id ?? "");
    }
    setPendingDelete(null);
  };

  const members = selected ? users.filter(u => u.roleId === selected.id) : [];
  const draft = selected ? permsOf(selected) : [];
  const added = selected ? draft.filter(id => !selected.permissions.includes(id)).length : 0;
  const removed = selected ? selected.permissions.filter(id => !draft.includes(id)).length : 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <button onClick={() => navigate("/users")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </button>

      <PageHeader
        title="Roles & Permissions"
        description="Create roles, choose what each role can do, and see who has them"
        actions={<Button onClick={() => openDialog("create")}><Plus className="mr-2 h-4 w-4" />New Role</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Role list */}
        <aside className="space-y-2">
          <p className="label-caps px-1">{roles.length} roles</p>
          {roles.map(r => {
            const active = r.id === selected?.id;
            const count = users.filter(u => u.roleId === r.id).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                aria-current={active}
                className={cn(
                  "w-full rounded-xl border bg-card p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "border-primary shadow-card ring-1 ring-primary" : "border-border hover:border-slate-300",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", r.isSystem ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                    <Shield className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate font-semibold text-foreground">{r.label}</span>
                  {r.isSystem && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">System</span>}
                  {isDirty(r) && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{r.description || "No description"}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Users2 className="h-3.5 w-3.5 text-slate-400" />{count} user{count === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5 text-slate-400" />{permsOf(r).length}/{totalPermissions}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Selected role */}
        {selected ? (
          <section className="min-w-0 overflow-hidden rounded-2xl bg-card shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
                  {selected.label}
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">{selected.name}</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{selected.description || "No description"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openDialog("edit", selected)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => openDialog("duplicate", selected)}><Copy className="mr-1.5 h-4 w-4" />Duplicate</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestDelete(selected)}
                  disabled={selected.isSystem}
                  className="border-red-200 text-destructive hover:bg-red-50 hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50/60 px-5 py-3 text-sm">
              <span className="text-muted-foreground">Assigned to:</span>
              {members.length === 0 ? (
                <span className="text-muted-foreground">No users yet</span>
              ) : members.map(u => (
                <Link key={u.id} to="/users" className="inline-flex items-center gap-1.5 rounded-full bg-card py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-foreground ring-1 ring-border hover:ring-primary">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                    {u.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </span>
                  {u.name}
                </Link>
              ))}
            </div>

            {selected.isSystem && (
              <p className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {selected.label} always has every permission, so its permissions can't be changed and the role can't be deleted.
              </p>
            )}

            <PermissionMatrix
              key={selected.id}
              selected={draft}
              onChange={ids => setDrafts(d => ({ ...d, [selected.id]: ids }))}
              readOnly={selected.isSystem}
            />

            {isDirty(selected) && (
              <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white/95 px-5 py-3 backdrop-blur">
                <span className="flex items-center gap-2 text-sm text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Unsaved changes
                  <span className="text-xs text-muted-foreground">
                    {added > 0 && `+${added} granted`}{added > 0 && removed > 0 && " · "}{removed > 0 && `−${removed} removed`}
                  </span>
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => dropDraft(selected.id)}>Discard</Button>
                  <Button size="sm" onClick={saveSelected}>Save Permissions</Button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-2xl bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-card">No roles yet. Create one to get started.</div>
        )}
      </div>

      {dialog && (
        <RoleDialog
          key={dialogKey}
          mode={dialog.mode}
          role={dialog.role}
          roles={roles}
          onOpenChange={open => !open && setDialog(null)}
          onSave={handleDialogSave}
        />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.label}" and its permission settings will be permanently removed. No users are assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function RoleDialog({ mode, role, roles, onOpenChange, onSave }: {
  mode: DialogMode;
  role?: Role;
  roles: Role[];
  onOpenChange: (open: boolean) => void;
  onSave: (data: RoleFormData) => void;
}) {
  const initialLabel = mode === "duplicate" && role ? `${role.label} (copy)` : role?.label ?? "";
  const [label, setLabel] = useState(initialLabel);
  const [name, setName] = useState(mode === "edit" && role ? role.name : slugify(initialLabel));
  const [nameTouched, setNameTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(role?.description ?? "");
  const [copyFrom, setCopyFrom] = useState("none");
  const keyLocked = mode === "edit" && !!role?.isSystem;

  const submit = () => {
    const cleanLabel = label.trim();
    const cleanName = slugify(name);
    if (!cleanLabel) { toast.error("Role name is required"); return; }
    if (!cleanName) { toast.error("Role key is required"); return; }
    const others = roles.filter(r => mode !== "edit" || r.id !== role?.id);
    if (others.some(r => r.label.toLowerCase() === cleanLabel.toLowerCase())) { toast.error(`A role named "${cleanLabel}" already exists`); return; }
    if (others.some(r => r.name === cleanName)) { toast.error(`The key "${cleanName}" is already used`); return; }
    onSave({ label: cleanLabel, name: cleanName, description: description.trim(), copyFrom: copyFrom === "none" ? undefined : copyFrom });
  };

  const title = mode === "create" ? "New Role" : mode === "duplicate" ? `Duplicate ${role?.label}` : `Edit ${role?.label}`;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>
            {mode === "duplicate" ? "Creates a new role with the same permissions." : mode === "create" ? "You'll choose its permissions after creating it." : "Update the role's name and description."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Role Name *</Label>
            <Input
              value={label}
              onChange={e => { setLabel(e.target.value); if (!nameTouched) setName(slugify(e.target.value)); }}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="e.g. Sales Supervisor"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role Key *</Label>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); setNameTouched(true); }}
              onBlur={() => setName(slugify(name))}
              disabled={keyLocked}
              placeholder="e.g. sales-supervisor"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {keyLocked ? "System role keys can't be changed." : "Lowercase identifier used by the system. Letters, numbers, and dashes."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this role for?" />
          </div>
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label>Start with permissions from</Label>
              <Select value={copyFrom} onValueChange={setCopyFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No permissions (start empty)</SelectItem>
                  {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.label} — {r.permissions.length} permissions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{mode === "edit" ? "Save Changes" : "Create Role"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RolesPage;
