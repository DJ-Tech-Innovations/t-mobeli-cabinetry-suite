import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar, navSections } from "./AppSidebar";
import { AccountMenu, NotificationsMenu } from "./HeaderActions";

const allNavItems = navSections.flatMap((s) => s.items);

function useBreadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ title: "Dashboard" }];

  const section = allNavItems.find((item) => item.path === `/${segments[0]}`);
  const crumbs: { title: string; path?: string }[] = [
    { title: section?.title ?? segments[0], path: segments.length > 1 ? `/${segments[0]}` : undefined },
  ];
  if (segments.length > 1) crumbs.push({ title: segments[1] === "new" ? "New" : "Details" });
  return crumbs;
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const crumbs = useBreadcrumbs();

  // Close the drawer and reset scroll whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] border-none p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col print:!hidden">
        <AppSidebar />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64 print:!pl-0">
        <header className="sticky top-0 z-30 print:!hidden flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open navigation</span>
          </button>

          <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="hidden sm:block">
                <Link to="/" className="text-muted-foreground hover:text-foreground">T-Mobeli</Link>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={i} className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 ${i === 0 ? "hidden sm:block" : ""}`} />
                  {crumb.path ? (
                    <Link to={crumb.path} className="truncate text-muted-foreground hover:text-foreground">{crumb.title}</Link>
                  ) : (
                    <span className="truncate font-medium text-foreground">{crumb.title}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <div className="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />
            <NotificationsMenu />
            <AccountMenu />
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
