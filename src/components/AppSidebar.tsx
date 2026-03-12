import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, FolderKanban, Package, FileText, Users2, UserCog, Shield } from "lucide-react";

const navSections = [
  {
    label: "Main Menu",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Customers", path: "/customers", icon: Users },
      { title: "Projects", path: "/projects", icon: FolderKanban },
      { title: "Materials", path: "/materials", icon: Package },
      { title: "Quotations", path: "/quotations", icon: FileText },
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

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <aside className="w-60 min-h-screen bg-muted border-r border-border flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          T-Mobeli
        </h1>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="label-caps px-3 mb-2">{section.label}</p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path} className="relative">
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-primary"
                        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                      />
                    )}
                    <button
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-card text-foreground shadow-card"
                          : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          T-Mobeli Business System
        </p>
        <p className="text-xs text-muted-foreground">Phase 1 • v1.0</p>
      </div>
    </aside>
  );
}
