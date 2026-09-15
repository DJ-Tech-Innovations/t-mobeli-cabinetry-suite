import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Package, Receipt, Settings, ShoppingCart, User as UserIcon, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { store, getStockStatus, getInvoiceStatus } from "@/lib/data";

interface Notification {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  tone: "red" | "amber" | "blue";
}

const READ_KEY = "tmobeli.readNotifications";

const toneClasses: Record<Notification["tone"], string> = {
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
};

function buildNotifications(): Notification[] {
  const items: Notification[] = [];

  for (const m of store.getMaterials()) {
    const status = getStockStatus(m);
    if (status === "in-stock") continue;
    items.push({
      id: `stock-${m.id}-${status}`,
      title: status === "out" ? `${m.name} is out of stock` : `${m.name} is running low`,
      description: `${m.stock} ${m.unit} left (threshold ${m.lowStockThreshold})`,
      path: "/materials",
      icon: Package,
      tone: status === "out" ? "red" : "amber",
    });
  }

  for (const inv of store.getInvoices()) {
    if (getInvoiceStatus(inv) !== "overdue") continue;
    const customer = store.getCustomer(inv.customerId);
    items.push({
      id: `overdue-${inv.id}`,
      title: `Invoice ${inv.number} is overdue`,
      description: `${customer?.name ?? "Customer"} · due ${inv.dueDate}`,
      path: "/invoices",
      icon: Receipt,
      tone: "red",
    });
  }

  for (const po of store.getPurchaseOrders()) {
    if (po.status !== "pending") continue;
    items.push({
      id: `po-${po.id}`,
      title: `${po.number} awaiting approval`,
      description: store.getSupplier(po.supplierId)?.name ?? "Purchase order",
      path: "/purchase-orders",
      icon: ShoppingCart,
      tone: "blue",
    });
  }

  return items;
}

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

export function NotificationsMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(loadReadIds);
  // Rebuild whenever the menu opens so it reflects the latest data
  const notifications = useMemo(() => buildNotifications(), [open]);
  const unread = notifications.filter((n) => !readIds.has(n.id)).length;

  const markRead = (ids: string[]) => {
    const next = new Set(readIds);
    ids.forEach((id) => next.add(id));
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <span className="sr-only">Notifications{unread > 0 ? ` (${unread} unread)` : ""}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead(notifications.map((n) => n.id))}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto py-1">
            {notifications.map((n) => {
              const isUnread = !readIds.has(n.id);
              return (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={() => {
                    markRead([n.id]);
                    navigate(n.path);
                  }}
                  className="mx-1 cursor-pointer items-start gap-3 rounded-md px-3 py-2.5"
                >
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneClasses[n.tone])}>
                    <n.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", isUnread ? "font-medium text-foreground" : "text-muted-foreground")}>{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.description}</span>
                  </span>
                  {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccountMenu() {
  // No authentication yet — treat the first user (the admin) as the signed-in account
  const user = store.getUsers()[0];
  const role = user ? store.getRole(user.roleId) : undefined;
  const name = user?.name ?? "Guest";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-medium text-foreground">{name}</span>
            {role && <span className="block text-xs text-muted-foreground">{role.label}</span>}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
          <span className="sr-only">Open account menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{name}</p>
          {user && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/users">
            <UserIcon className="mr-2 h-4 w-4" /> My Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/roles">
            <Settings className="mr-2 h-4 w-4" /> Roles & Permissions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
          onSelect={() => toast.info("Sign-in isn't set up yet")}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
