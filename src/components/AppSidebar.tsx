import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, Package, FileText, Users2, UserCog, Shield, Building2, Hammer, Receipt, ShoppingCart, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { store, getStockStatus, isOpenPurchaseOrder } from "@/lib/data";

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Optional count shown as a pill next to the item (hidden when 0). */
  badge?: () => number;
}

export const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Main Menu",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Customers", path: "/customers", icon: Users },
      { title: "Projects", path: "/projects", icon: FolderKanban },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        title: "Materials",
        path: "/materials",
        icon: Package,
        badge: () => store.getMaterials().filter((m) => getStockStatus(m) !== "in-stock").length,
      },
      {
        title: "Purchase Orders",
        path: "/purchase-orders",
        icon: ShoppingCart,
        badge: () => store.getPurchaseOrders().filter(isOpenPurchaseOrder).length,
      },
      { title: "Suppliers", path: "/suppliers", icon: Building2 },
      { title: "Furniture Builder", path: "/furniture-builder", icon: Hammer },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Quotations", path: "/quotations", icon: FileText },
      { title: "Invoices", path: "/invoices", icon: Receipt },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Employees", path: "/employees", icon: Users2 },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Users", path: "/users", icon: UserCog },
      { title: "Roles", path: "/roles", icon: Shield },
    ],
  },
];

interface AppSidebarProps {
  /** Called after a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Shows a close button (mobile drawer only). */
  onClose?: () => void;
}

export function AppSidebar({ onNavigate, onClose }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-blue-950 via-blue-950 to-slate-950 text-blue-100">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
        <NavLink to="/" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-900/50 ring-1 ring-white/20">
            TM
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight text-white">T-Mobeli</span>
            <span className="block text-[11px] text-blue-300/70">Business System</span>
          </span>
        </NavLink>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-blue-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close navigation</span>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300/60">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const badge = item.badge?.() ?? 0;
                return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                          : "text-blue-100/75 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            isActive ? "text-white" : "text-blue-300/70 group-hover:text-white",
                          )}
                        />
                        <span className="flex-1">{item.title}</span>
                        {badge > 0 && (
                          <span
                            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white"
                            aria-label={`${badge} need attention`}
                          >
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
          <p className="text-xs font-medium text-white">T-Mobeli Business System</p>
          <p className="text-[11px] text-blue-300/70">Phase 1 • v1.0</p>
        </div>
      </div>
    </div>
  );
}
