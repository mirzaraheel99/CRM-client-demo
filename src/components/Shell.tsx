import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Users, PackageSearch, Tag, Boxes,
  UserCog, GitBranch, MessageSquare, BarChart3, Smartphone, Sun, Moon,
  Languages, ChevronDown, Wrench, Menu, RotateCcw, Radar, X, Search, Settings as SettingsIcon, LogOut,
} from "lucide-react";
import { useStore } from "../lib/store";
import { t } from "../lib/i18n";
import { Avatar } from "./ui";
import { Toaster } from "./Toaster";
import { CommandPalette } from "./CommandPalette";
import { useCommandPaletteStore } from "../lib/commandPaletteStore";
import { toast } from "../lib/toast";
import { cx } from "../lib/utils";
import { canAccessPath } from "../lib/permissions";
import { bi } from "../lib/domainAr";
import { useState, type ReactNode } from "react";
import type { Role } from "../lib/types";

const NAV: { to: string; labelKey: Parameters<typeof t>[1]; icon: ReactNode; roles?: Role[] }[] = [
  { to: "/", labelKey: "dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/predictive-maintenance", labelKey: "predictiveMaintenance", icon: <Radar size={18} />, roles: ["admin", "manager", "supervisor"] },
  { to: "/jobcards", labelKey: "jobCards", icon: <ClipboardList size={18} /> },
  { to: "/customers", labelKey: "customers", icon: <Users size={18} /> },
  { to: "/appliances", labelKey: "appliances", icon: <PackageSearch size={18} /> },
  { to: "/brands", labelKey: "brands", icon: <Tag size={18} />, roles: ["admin", "manager"] },
  { to: "/inventory", labelKey: "inventory", icon: <Boxes size={18} /> },
  { to: "/technicians", labelKey: "technicians", icon: <UserCog size={18} />, roles: ["admin", "manager", "supervisor"] },
  { to: "/workflow", labelKey: "workflow", icon: <GitBranch size={18} />, roles: ["admin", "manager"] },
  { to: "/communications", labelKey: "communications", icon: <MessageSquare size={18} /> },
  { to: "/reports", labelKey: "reports", icon: <BarChart3 size={18} />, roles: ["admin", "manager", "supervisor"] },
  { to: "/mobile", labelKey: "mobileApps", icon: <Smartphone size={18} /> },
  { to: "/settings", labelKey: "settings", icon: <SettingsIcon size={18} />, roles: ["admin"] },
];

const ROLE_LABELS: Record<Role, string> = {
  front_desk: "Front Desk",
  technician: "Technician",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

export function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, setRole, currentUser, logout, selectedBranchId, setBranch, branches, theme, setTheme, lang, setLang, sidebarCollapsed, toggleSidebar, resetDemoData } = useStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const visibleNav = NAV.filter((item) => canAccessPath(role, item.to));

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    if (!canAccessPath(nextRole, location.pathname)) navigate("/", { replace: true });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-surface-page)]">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        id="primary-navigation"
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r bg-[var(--color-surface-1)] transition-transform [border-color:var(--color-border)] md:relative md:z-auto md:translate-x-0 md:transition-all",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "md:w-[64px]" : "md:w-[240px]"
        )}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b [border-color:var(--color-border)] shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-1)] text-white shrink-0">
            <Wrench size={16} />
          </div>
          <div className={cx("min-w-0", sidebarCollapsed && "md:hidden")}>
            <p className="text-sm font-semibold truncate">FixFlow</p>
            <p className="text-[11px] text-[var(--color-ink-muted)] truncate">Appliance Service Suite</p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-black/5 md:hidden dark:hover:bg-white/10"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--color-brand-1)]/10 text-[var(--color-brand-1)]"
                    : "text-[var(--color-ink-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
                )
              }
            >
              {item.icon}
              <span className={cx("truncate", sidebarCollapsed && "md:hidden")}>{t(lang, item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t [border-color:var(--color-border)]">
          <button
            onClick={() => {
              if (confirm("Reset all demo data back to the original seed dataset?")) {
                resetDemoData();
                navigate("/", { replace: true });
                toast("Demo data reset.");
              }
            }}
            title="Reset demo data"
            className="flex w-full items-center gap-2 px-4 py-3 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
          >
            <RotateCcw size={16} />
            <span className={cx(sidebarCollapsed && "md:hidden")}>Reset demo data</span>
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden w-full items-center gap-2 border-t px-4 py-3 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] [border-color:var(--color-border)] md:flex"
          >
            <Menu size={16} />
            {!sidebarCollapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b bg-[var(--color-surface-1)] px-3 py-2 [border-color:var(--color-border)] md:gap-3 md:px-5">
          <button
            type="button"
            aria-label="Open navigation"
            aria-controls="primary-navigation"
            aria-expanded={mobileNavOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-black/5 md:hidden dark:hover:bg-white/10"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="mr-auto min-w-0 md:hidden">
            <p className="truncate text-sm font-semibold">FixFlow</p>
            <p className="truncate text-[10px] text-[var(--color-ink-muted)]">Appliance Service Suite</p>
          </div>

          <button
            type="button"
            onClick={() => useCommandPaletteStore.getState().setOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-lg border bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-brand-1)]/40 transition-colors [border-color:var(--color-border)] md:w-64"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-medium [border-color:var(--color-border)]">⌘K</kbd>
          </button>
          <button
            type="button"
            aria-label="Search"
            onClick={() => useCommandPaletteStore.getState().setOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-black/5 md:hidden dark:hover:bg-white/10"
          >
            <Search size={17} />
          </button>

          <div className="order-2 flex min-w-0 items-center gap-2 md:order-none md:shrink-0">
            <span className="hidden text-xs text-[var(--color-ink-muted)] sm:inline">{t(lang, "branch")}</span>
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(e) => setBranch(e.target.value)}
                aria-label={t(lang, "branch")}
                className="max-w-[154px] appearance-none truncate rounded-lg border bg-[var(--color-surface-2)] py-1.5 pl-3 pr-7 text-sm font-medium outline-none [border-color:var(--color-border)] sm:max-w-none"
              >
                <option value="all">{t(lang, "allBranches")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
            </div>
          </div>

          <div className="order-3 ml-auto flex shrink-0 items-center gap-1.5 md:order-none md:gap-2">
            {currentUser?.role === "admin" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-ink-muted)] hidden sm:inline">{bi("View as", "عرض كـ")}</span>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => changeRole(e.target.value as Role)}
                    aria-label={t(lang, "role")}
                    className="max-w-[128px] appearance-none truncate rounded-lg border bg-[var(--color-surface-2)] py-1.5 pl-3 pr-7 text-sm font-medium outline-none [border-color:var(--color-border)] sm:max-w-none"
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                </div>
              </div>
            ) : (
              <span className="hidden text-xs text-[var(--color-ink-muted)] sm:inline">{ROLE_LABELS[role]}</span>
            )}

            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              title="Toggle language"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Languages size={17} />
            </button>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <div className="hidden items-center gap-2 border-l pl-2 ml-1 [border-color:var(--color-border)] sm:flex">
              <Avatar name={currentUser?.name ?? ROLE_LABELS[role]} />
              <button
                onClick={() => { logout(); navigate("/login", { replace: true }); }}
                title={bi("Sign out", "تسجيل الخروج")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">{children}</main>
      </div>
      <Toaster />
      <CommandPalette />
    </div>
  );
}
