import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { store } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Lock, Search } from "lucide-react";

interface PermissionMatrixProps {
  /** Editable granted permission ids (never includes `locked` ids) */
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Always-on permissions shown checked and disabled, e.g. inherited from a role */
  locked?: string[];
  lockedLabel?: string;
  readOnly?: boolean;
}

export function PermissionMatrix({ selected, onChange, locked = [], lockedLabel = "Granted by role", readOnly = false }: PermissionMatrixProps) {
  const [query, setQuery] = useState("");
  const all = store.getPermissions();
  const groups = store.getPermissionsByGroup();
  const lockedSet = new Set(locked);
  const granted = new Set([...selected, ...locked]);
  const editable = (id: string) => !readOnly && !lockedSet.has(id);

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.filter(editable).forEach(id => (on ? next.add(id) : next.delete(id)));
    onChange([...next].filter(id => !lockedSet.has(id)));
  };

  const q = query.trim().toLowerCase();
  const visibleGroups = Object.entries(groups)
    .map(([group, perms]) => [group, perms.filter(p => !q || group.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))] as const)
    .filter(([, perms]) => perms.length > 0);
  const grantedCount = all.filter(p => granted.has(p.id)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search permissions..." className="h-9 pl-9" />
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{grantedCount}</span> of {all.length} granted
        </span>
        {!readOnly && (
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMany(all.map(p => p.id), true)}>Grant all</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMany(all.map(p => p.id), false)} disabled={selected.length === 0}>Clear</Button>
          </div>
        )}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No permissions match “{query}”.</p>
      ) : (
        <div className="divide-y divide-border">
          {visibleGroups.map(([group, perms]) => {
            const ids = perms.map(p => p.id);
            const onCount = ids.filter(id => granted.has(id)).length;
            const editableIds = ids.filter(editable);
            const allEditableOn = editableIds.length > 0 && editableIds.every(id => granted.has(id));
            return (
              <div key={group} className="px-5 py-4">
                <div className="mb-3 flex items-center gap-3">
                  <Checkbox
                    checked={onCount === ids.length ? true : onCount > 0 ? "indeterminate" : false}
                    disabled={editableIds.length === 0}
                    onCheckedChange={() => setMany(editableIds, !allEditableOn)}
                    aria-label={`Toggle all ${group} permissions`}
                  />
                  <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs tabular-nums",
                    onCount === ids.length ? "bg-emerald-50 text-emerald-700" : onCount > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500",
                  )}>
                    {onCount}/{ids.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:ml-7 sm:grid-cols-2 xl:grid-cols-4">
                  {perms.map(p => {
                    const isLocked = lockedSet.has(p.id);
                    const checked = granted.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                          isLocked ? "border-slate-200 bg-slate-50" : checked ? "border-blue-200 bg-blue-50/60" : "border-border bg-card",
                          editable(p.id) ? "cursor-pointer hover:border-blue-300" : "cursor-default",
                        )}
                      >
                        <Checkbox checked={checked} disabled={!editable(p.id)} onCheckedChange={v => setMany([p.id], v === true)} className="mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-sm text-foreground">{p.description}</span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">{p.name}</span>
                          {isLocked && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                              <Lock className="h-3 w-3" />{lockedLabel}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
