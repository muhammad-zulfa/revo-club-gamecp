"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Images,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Settings,
  Shield,
  Swords,
  Trophy,
  UserCircle2,
  Users,
  Wifi,
} from "lucide-react";
import { UserRole } from "@prisma/client";

const nav = [
  ["Dashboard", "/dashboard", LayoutDashboard, "all"],
  ["News", "/news", Newspaper, "all"],
  ["Events", "/events", CalendarDays, "all"],
  ["Gallery", "/gallery", Images, "all"],
  ["Profile", "/profile", UserCircle2, "member"],
  ["GP wallet", "/gp-wallet", HandCoins, "member"],
  ["Warehouse", "/warehouse", Archive, "all"],
  ["Guild cash", "/guild-cash", Coins, "all"],
  ["Members", "/members", Users, "all"],
  ["Online members", "/online-members", Wifi, "all"],
  ["Guild management", "/guild", Shield, "admin"],
  ["Settings", "/settings", Settings, "admin"],
] as const;

const collapsedWidth = 96;
const expandedWidth = 300;
const storageKey = "rf-guild-sidebar-collapsed";

type ShellFrameProps = {
  active: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  session: {
    name: string;
    role: UserRole;
  } | null;
};

function SidebarLink({
  href,
  label,
  Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : "gap-3"
      } ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
    >
      <Icon size={18} />
      {!collapsed ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </Link>
  );
}

export function ShellFrame({ active, title, subtitle, action, children, session }: ShellFrameProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);
    setCollapsed(storedValue === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed]);

  const adminNav = session?.role === UserRole.ADMIN ? [["Approvals", "/approvals", Users] as const] : [];
  const visibleNav = nav.filter(([, , , visibility]) => {
    if (visibility === "all") return true;
    if (visibility === "admin") return session?.role === UserRole.ADMIN;
    return session?.role === UserRole.MEMBER;
  });
  const sidebarWidth = collapsed ? collapsedWidth : expandedWidth;

  return (
    <div className="min-h-screen">
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white md:flex md:flex-col"
        style={{ width: sidebarWidth }}
      >
        <div className={`flex items-center px-6 pb-4 pt-6 ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <Swords size={22} />
            </div>
            {!collapsed ? (
              <div>
                <div className="text-lg font-extrabold tracking-tight">RF GUILD</div>
                <div className="text-xs text-slate-400">Standalone CRM</div>
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto pb-6 ${collapsed ? "px-3" : "px-6"}`}>
          <div className={`rounded-2xl border border-slate-200 ${collapsed ? "px-0 py-3" : "p-4"}`}>
            {!collapsed ? (
              <>
                <div className="text-sm font-semibold">RF Default Fresh</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Brave Fox · Accretia
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <span className="h-3 w-3 rounded-full bg-emerald-500" title="Brave Fox · Accretia" />
              </div>
            )}
          </div>

          {collapsed ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null}

          <nav className={`mt-6 space-y-1 ${collapsed ? "px-0" : ""}`}>
            {visibleNav.map(([label, href, Icon]) => (
              <SidebarLink key={href} href={href} label={label} Icon={Icon} active={active === href} collapsed={collapsed} />
            ))}
            {adminNav.map(([label, href, Icon]) => (
              <SidebarLink key={href} href={href} label={label} Icon={Icon} active={active === href} collapsed={collapsed} />
            ))}
          </nav>

          <div className={`border-slate-200 ${collapsed ? "mt-6 border-t pt-4" : "mt-8 border-t pt-6"}`}>
            {!collapsed ? (
              <div className="px-4 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Guild statistics</div>
            ) : null}
            <Link
              href="/dashboard"
              title={collapsed ? "Rankings" : undefined}
              className={`mt-2 flex items-center rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <Trophy size={18} />
              {!collapsed ? <span>Rankings</span> : <span className="sr-only">Rankings</span>}
            </Link>
          </div>
        </div>

        <div className={`border-t border-slate-200 py-4 ${collapsed ? "px-3" : "px-6"}`}>
          <div className={`rounded-2xl border border-slate-200 bg-slate-50 ${collapsed ? "px-0 py-3" : "px-4 py-3"}`}>
            {!collapsed ? (
              <>
                <div className="text-sm font-semibold text-slate-800">{session?.name ?? "Unknown user"}</div>
                <div className="mt-1 text-xs uppercase tracking-[.12em] text-slate-400">{session?.role ?? "Session"}</div>
              </>
            ) : (
              <div className="text-center text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                {session?.role?.slice(0, 1) ?? "S"}
              </div>
            )}
          </div>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button
              title={collapsed ? "Sign out" : undefined}
              className={`flex w-full items-center rounded-xl px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <LogOut size={18} />
              {!collapsed ? <span>Sign out</span> : <span className="sr-only">Sign out</span>}
            </button>
          </form>
        </div>
      </aside>

      <main className="min-h-screen px-5 py-7 md:px-8 md:py-9" style={{ marginLeft: sidebarWidth }}>
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-8 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-[38px] font-extrabold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            {action}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
