import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, LayoutDashboard, ClipboardList, Users, PackageSearch, Tag, Boxes,
  UserCog, GitBranch, MessageSquare, BarChart3, Smartphone, Radar, ClipboardPlus,
} from "lucide-react";
import { useStore } from "../lib/store";
import { canAccessPath } from "../lib/permissions";
import { appliancesByBranch, filterByBranch } from "../lib/selectors";
import { useCommandPaletteStore } from "../lib/commandPaletteStore";
import { bi } from "../lib/domainAr";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

const STATIC_DESTINATIONS = [
  { to: "/", label: bi("Dashboard", "لوحة التحكم"), icon: <LayoutDashboard size={15} /> },
  { to: "/predictive-maintenance", label: bi("Predictive Maintenance", "الصيانة التنبؤية"), icon: <Radar size={15} /> },
  { to: "/jobcards", label: bi("Job Cards", "بطاقات العمل"), icon: <ClipboardList size={15} /> },
  { to: "/jobcards/new", label: bi("New Job Card", "بطاقة عمل جديدة"), icon: <ClipboardPlus size={15} /> },
  { to: "/customers", label: bi("Customers", "العملاء"), icon: <Users size={15} /> },
  { to: "/appliances", label: bi("Appliances", "الأجهزة"), icon: <PackageSearch size={15} /> },
  { to: "/brands", label: bi("Brands", "العلامات التجارية"), icon: <Tag size={15} /> },
  { to: "/inventory", label: bi("Inventory", "المخزون"), icon: <Boxes size={15} /> },
  { to: "/technicians", label: bi("Technicians", "الفنيون"), icon: <UserCog size={15} /> },
  { to: "/workflow", label: bi("Workflow Designer", "مصمم سير العمل"), icon: <GitBranch size={15} /> },
  { to: "/communications", label: bi("Communications", "الاتصالات"), icon: <MessageSquare size={15} /> },
  { to: "/reports", label: bi("Reports", "التقارير"), icon: <BarChart3 size={15} /> },
  { to: "/mobile", label: bi("Mobile Apps", "تطبيقات الجوال"), icon: <Smartphone size={15} /> },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { jobCards, customers, appliances, role, selectedBranchId } = useStore();
  const { open, setOpen } = useCommandPaletteStore();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useCommandPaletteStore.getState().open);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const appMap = useMemo(() => new Map(appliances.map((a) => [a.id, a])), [appliances]);
  const scopedJobs = useMemo(() => filterByBranch(jobCards, selectedBranchId), [jobCards, selectedBranchId]);
  const scopedCustomers = useMemo(() => filterByBranch(customers, selectedBranchId), [customers, selectedBranchId]);
  const scopedAppliances = useMemo(() => appliancesByBranch(appliances, selectedBranchId), [appliances, selectedBranchId]);

  const commands: Command[] = useMemo(() => {
    const nav: Command[] = STATIC_DESTINATIONS.filter((destination) => canAccessPath(role, destination.to)).map((d) => ({
      id: `nav-${d.to}`,
      label: d.label,
      hint: bi("Go to page", "الانتقال للصفحة"),
      icon: d.icon,
      action: () => navigate(d.to),
    }));

    const jobs: Command[] = scopedJobs.slice(0, 300).map((j) => {
      const cust = custMap.get(j.customerId)?.name ?? "";
      const app = appMap.get(j.applianceId)?.model ?? "";
      return {
        id: `job-${j.id}`,
        label: `${j.documentNo} - ${cust}`,
        hint: `${app} | ${j.status}`,
        icon: <ClipboardList size={15} />,
        action: () => navigate(`/jobcards/${j.id}`),
        keywords: `${j.id} ${j.documentNo} ${j.invoiceNo} ${cust} ${app} ${j.status}`.toLowerCase(),
      };
    });

    const custs: Command[] = scopedCustomers.slice(0, 300).map((c) => ({
      id: `cust-${c.id}`,
      label: `${c.documentNo} - ${c.name}`,
      hint: c.phone,
      icon: <Users size={15} />,
      action: () => navigate(`/customers/${c.id}`),
      keywords: `${c.documentNo} ${c.name} ${c.phone}`.toLowerCase(),
    }));

    const apps: Command[] = scopedAppliances.slice(0, 300).map((a) => ({
      id: `app-${a.id}`,
      label: `${a.documentNo} - ${a.model}`,
      hint: `Serial ${a.serialNo}`,
      icon: <PackageSearch size={15} />,
      action: () => navigate(`/appliances/${a.id}`),
      keywords: `${a.documentNo} ${a.model} ${a.serialNo}`.toLowerCase(),
    }));

    return [...nav, ...jobs, ...custs, ...apps];
  }, [scopedJobs, scopedCustomers, scopedAppliances, custMap, appMap, navigate, role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.id.startsWith("nav-")).slice(0, 8);
    return commands.filter((c) => (c.keywords ?? c.label.toLowerCase()).includes(q)).slice(0, 20);
  }, [commands, query]);

  function select(cmd: Command) {
    cmd.action();
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[activeIdx]) { e.preventDefault(); select(filtered[activeIdx]); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh] bg-black/40 backdrop-blur-[2px] animate-rise-in" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-2xl border bg-[var(--color-surface-2)] shadow-[var(--shadow-lg)] overflow-hidden [border-color:var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b px-4 py-3 [border-color:var(--color-border)]">
          <Search size={16} className="text-[var(--color-ink-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder={bi("Search job cards, customers, appliances, or pages…", "بحث في بطاقات العمل أو العملاء أو الأجهزة أو الصفحات…")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-muted)]"
          />
          <kbd className="hidden sm:inline-block shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ink-muted)] [border-color:var(--color-border)]">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">{bi("No matches.", "لا توجد نتائج.")}</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => select(cmd)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                i === activeIdx ? "bg-[var(--color-brand-1)]/10 text-[var(--color-brand-1)]" : "text-[var(--color-ink-primary)]"
              }`}
            >
              <span className={i === activeIdx ? "text-[var(--color-brand-1)]" : "text-[var(--color-ink-muted)]"}>{cmd.icon}</span>
              <span className="flex-1 min-w-0 truncate font-medium">{cmd.label}</span>
              {cmd.hint && <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">{cmd.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
