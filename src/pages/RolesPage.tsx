import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { store } from "@/lib/data";
import { ArrowLeft, Shield, Save } from "lucide-react";
import { toast } from "sonner";

const RolesPage = () => {
  const navigate = useNavigate();
  const roles = store.getRoles();
  const permissionsByGroup = store.getPermissionsByGroup();
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || '');
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    roles.forEach(r => { map[r.id] = [...r.permissions]; });
    return map;
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const togglePermission = (permId: string) => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || [];
      const next = current.includes(permId)
        ? current.filter(id => id !== permId)
        : [...current, permId];
      return { ...prev, [selectedRoleId]: next };
    });
  };

  const toggleGroup = (groupPerms: string[]) => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || [];
      const allChecked = groupPerms.every(id => current.includes(id));
      const next = allChecked
        ? current.filter(id => !groupPerms.includes(id))
        : [...new Set([...current, ...groupPerms])];
      return { ...prev, [selectedRoleId]: next };
    });
  };

  const handleSave = () => {
    store.updateRole(selectedRoleId, { permissions: rolePermissions[selectedRoleId] });
    toast.success(`Permissions updated for ${selectedRole?.label}`);
  };

  const roleColor = (name: string) => {
    switch (name) {
      case 'admin': return 'border-red-300 bg-red-50 text-red-700';
      case 'manager': return 'border-purple-300 bg-purple-50 text-purple-700';
      case 'agent': return 'border-blue-300 bg-blue-50 text-blue-700';
      default: return 'border-border bg-muted text-muted-foreground';
    }
  };

  const currentPerms = rolePermissions[selectedRoleId] || [];

  return (
    <div className="p-8">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </button>

      <PageHeader
        title="Roles & Permissions"
        description="Configure role-based access control (like Spatie)"
        actions={<Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Changes</Button>}
      />

      {/* Role selector */}
      <div className="flex gap-3 mb-8">
        {roles.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleId(r.id)}
            className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
              r.id === selectedRoleId ? roleColor(r.name) + ' shadow-card' : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-semibold">{r.label}</span>
            </div>
            <p className="text-xs opacity-70">{r.description}</p>
            <p className="text-xs mt-1 font-medium">{(rolePermissions[r.id] || []).length} permissions</p>
          </button>
        ))}
      </div>

      {/* Permissions matrix */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-[length:var(--font-size-h2)] font-semibold">
            Permissions for {selectedRole?.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Toggle individual permissions or entire groups</p>
        </div>

        <div className="divide-y divide-border">
          {Object.entries(permissionsByGroup).map(([group, perms]) => {
            const groupPermIds = perms.map(p => p.id);
            const allChecked = groupPermIds.every(id => currentPerms.includes(id));
            const someChecked = groupPermIds.some(id => currentPerms.includes(id));

            return (
              <div key={group} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                    onCheckedChange={() => toggleGroup(groupPermIds)}
                  />
                  <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                  <span className="text-xs text-muted-foreground">
                    {groupPermIds.filter(id => currentPerms.includes(id)).length}/{groupPermIds.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-7">
                  {perms.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox
                        checked={currentPerms.includes(p.id)}
                        onCheckedChange={() => togglePermission(p.id)}
                      />
                      <div>
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors">{p.description}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
