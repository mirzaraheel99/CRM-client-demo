import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical } from "lucide-react";
import { cx } from "../lib/utils";
import { useCountUp } from "../lib/useCountUp";
import { STAGE_NAME_AR } from "../lib/domainAr";
import type { StageName } from "../lib/types";

export function Card({
  children, className, padded = true, interactive = false,
}: {
  children: ReactNode; className?: string; padded?: boolean; interactive?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-lg border bg-[var(--color-surface-1)] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-200 [border-color:var(--color-border)]",
        padded && "p-4",
        interactive && "hover:border-[var(--color-baseline)] hover:shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--color-ink-primary)]">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  neutral: "bg-black/5 text-[var(--color-ink-secondary)] dark:bg-white/10",
  good: "bg-[var(--color-status-good)]/10 text-[var(--color-status-good)]",
  warning: "bg-[var(--color-status-warning)]/15 text-[#8a5a00]",
  serious: "bg-[var(--color-status-serious)]/15 text-[#a04a2c]",
  critical: "bg-[var(--color-status-critical)]/10 text-[var(--color-status-critical)]",
  brand: "bg-[var(--color-brand-1)]/10 text-[var(--color-brand-2)]",
};

export function Badge({ children, tone = "neutral", icon, className }: { children: ReactNode; tone?: keyof typeof badgeStyles; icon?: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tracking-tight whitespace-nowrap ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]", badgeStyles[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

// Single shared switch so every on/off toggle in the app (Settings, Workflow
// Designer, etc.) gets the same knob geometry -- `left-0` anchors the resting
// position explicitly so the translate-x transform always starts from the
// same place, instead of each call site reimplementing (and drifting from) it.
export function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        checked ? "bg-[var(--color-brand-1)]" : "bg-black/15 dark:bg-white/15"
      )}
    >
      <span className={cx("absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function Button({
  children, onClick, variant = "primary", size = "md", className, type = "button", disabled,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md"; className?: string; type?: "button" | "submit"; disabled?: boolean;
}) {
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-brand-1)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-brand-2)] hover:shadow-[var(--shadow-md)]",
    secondary: "bg-black/5 text-[var(--color-ink-primary)] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
    ghost: "text-[var(--color-ink-secondary)] hover:bg-black/5 dark:hover:bg-white/10",
    danger: "bg-[var(--color-status-critical)] text-white shadow-[var(--shadow-sm)] hover:opacity-90",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-1)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}

export function StatTile({
  label, value, delta, deltaTone = "good", icon, accent, sparkline,
}: {
  label: string; value: string; delta?: string; deltaTone?: "good" | "critical" | "neutral"; icon?: ReactNode; accent?: string;
  sparkline?: ReactNode;
}) {
  const animatedValue = useCountUp(value);
  const deltaColor =
    deltaTone === "good" ? "text-[var(--color-status-good)]" :
    deltaTone === "critical" ? "text-[var(--color-status-critical)]" :
    "text-[var(--color-ink-muted)]";
  return (
    <Card interactive className="flex h-full min-h-[142px] flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: `color-mix(in srgb, ${accent ?? "var(--color-brand-1)"} 10%, transparent)`,
              color: accent ?? "var(--color-brand-1)",
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-0.5">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-[var(--color-ink-primary)]">{animatedValue}</span>
        {delta && <span className={cx("ml-auto max-w-full text-right text-[11px] font-medium leading-4 tabular-nums", deltaColor)}>{delta}</span>}
      </div>
      <div className="-mx-1 -mb-1 mt-auto h-9">{sparkline}</div>
    </Card>
  );
}

export function Modal({ open, onClose, title, children, width = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: "sm" | "md" | "lg" }) {
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-rise-in" onClick={onClose}>
      <div
        className={cx("w-full rounded-2xl bg-[var(--color-surface-2)] shadow-[var(--shadow-lg)] max-h-[90vh] overflow-y-auto", widths[width])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4 [border-color:var(--color-border)]">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] text-xl leading-none transition-colors">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange, labels }: { tabs: string[]; active: string; onChange: (t: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex gap-1 border-b [border-color:var(--color-border)] overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cx(
            "px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-[color,border-color] duration-200",
            active === tab
              ? "border-[var(--color-brand-1)] text-[var(--color-brand-1)]"
              : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
          )}
        >
          {labels?.[tab] ?? tab}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-[var(--color-ink-muted)] dark:bg-white/5">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-[var(--color-ink-secondary)]">{title}</p>
      {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-1">{subtitle}</p>}
    </div>
  );
}

export function WorkflowStepper({
  steps, currentIdx, orientation = "horizontal", viewedIdx, onStepClick,
}: {
  steps: { stepOrder: number; stepName: string }[]; currentIdx: number; orientation?: "horizontal" | "vertical";
  viewedIdx?: number; onStepClick?: (stepName: string, index: number) => void;
}) {
  if (orientation === "vertical") {
    return (
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const viewed = viewedIdx !== undefined && i === viewedIdx;
          const clickable = Boolean(onStepClick) && i <= currentIdx;
          const Wrapper = clickable ? "button" : "div";
          return (
            <li key={s.stepOrder} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    done ? "bg-[var(--color-status-good)] text-white" :
                    active ? "bg-[var(--color-brand-1)] text-white shadow-[var(--shadow-sm)]" :
                    "bg-black/[0.06] text-[var(--color-ink-muted)] dark:bg-white/10"
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span className={cx("w-0.5 flex-1 min-h-[18px]", done ? "bg-[var(--color-status-good)]" : "bg-black/[0.08] dark:bg-white/10")} />
                )}
              </div>
              <Wrapper
                type={clickable ? "button" : undefined}
                onClick={clickable ? () => onStepClick!(s.stepName, i) : undefined}
                className={cx(
                  "pb-4 text-left rounded-md -mx-1.5 px-1.5",
                  active ? "pt-0" : "",
                  clickable && "cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                  viewed && "bg-[var(--color-brand-1)]/10"
                )}
              >
                <p className={cx("text-sm leading-tight", active ? "font-semibold text-[var(--color-ink-primary)]" : done ? "text-[var(--color-ink-secondary)]" : "text-[var(--color-ink-muted)]")}>
                  {s.stepName}
                </p>
                <p className="text-xs leading-tight text-[var(--color-ink-muted)]" dir="rtl">{STAGE_NAME_AR[s.stepName as StageName] ?? ""}</p>
              </Wrapper>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.stepOrder} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5 min-w-[86px]">
              <span
                className={cx(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done ? "bg-[var(--color-status-good)] text-white" :
                  active ? "bg-[var(--color-brand-1)] text-white shadow-[var(--shadow-sm)]" :
                  "bg-black/10 text-[var(--color-ink-muted)] dark:bg-white/10"
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cx("text-[11px] text-center leading-tight", active ? "font-semibold text-[var(--color-ink-primary)]" : "text-[var(--color-ink-muted)]")}>
                {s.stepName}
              </span>
              <span className="text-[10px] leading-tight text-center text-[var(--color-ink-muted)]" dir="rtl">{STAGE_NAME_AR[s.stepName as StageName] ?? ""}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cx("h-0.5 w-6 sm:w-10 transition-colors", done ? "bg-[var(--color-status-good)]" : "bg-black/10 dark:bg-white/10")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: color ?? "var(--color-brand-1)", fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cx(
        "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand-1)] focus:ring-4 focus:ring-[var(--color-brand-1)]/[0.12]",
        props.className
      )}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ children, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cx(
        "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand-1)] focus:ring-4 focus:ring-[var(--color-brand-1)]/[0.12]",
        props.className
      )}
    >
      {children}
    </select>
  );
});

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand-1)] focus:ring-4 focus:ring-[var(--color-brand-1)]/[0.12]",
        props.className
      )}
    />
  );
}

export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-ink-secondary)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-serious)]" aria-hidden="true"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function SortableTh({
  label, active, direction, onClick, className,
}: {
  label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void; className?: string;
}) {
  return (
    <th className={cx("font-medium select-none", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cx(
          "group inline-flex items-center gap-1 transition-colors",
          active ? "text-[var(--color-ink-primary)]" : "hover:text-[var(--color-ink-primary)]"
        )}
      >
        {label}
        {active ? (
          direction === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
        ) : (
          <ChevronsUpDown size={13} className="opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    </th>
  );
}

export function ActionsMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink-primary)] dark:hover:bg-white/10"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border bg-[var(--color-surface-1)] py-1 shadow-[var(--shadow-md)] [border-color:var(--color-border)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={cx(
                "block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10",
                item.danger ? "text-[var(--color-status-critical)]" : "text-[var(--color-ink-primary)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Pagination({
  page, pageSize, total, onPageChange,
}: {
  page: number; pageSize: number; total: number; onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 [border-color:var(--color-border)]">
      <p className="text-xs tabular-nums text-[var(--color-ink-muted)]">
        {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Previous page"
          aria-label="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-[var(--color-ink-secondary)] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-35 [border-color:var(--color-border)] dark:hover:bg-white/[0.06]"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-20 text-center text-xs font-medium tabular-nums text-[var(--color-ink-secondary)]">
          Page {safePage} of {pageCount}
        </span>
        <button
          type="button"
          title="Next page"
          aria-label="Next page"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-[var(--color-ink-secondary)] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-35 [border-color:var(--color-border)] dark:hover:bg-white/[0.06]"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-md", className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-56 w-full" />
        </Card>
        <Card className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-56 w-full rounded-full mx-auto max-w-56" />
        </Card>
      </div>
    </div>
  );
}

export function LiveIndicator() {
  const [since, setSince] = useState(() => Date.now());
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const secs = Math.max(0, Math.round((Date.now() - since) / 1000));
  const label = secs < 10 ? "Updated just now" : secs < 60 ? `Updated ${secs}s ago` : `Updated ${Math.round(secs / 60)}m ago`;

  return (
    <button
      onClick={() => setSince(Date.now())}
      title="Refresh"
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] hover:border-[var(--color-brand-1)]/40 transition-colors [border-color:var(--color-border)]"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-status-good)] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-status-good)]" />
      </span>
      {label}
    </button>
  );
}
