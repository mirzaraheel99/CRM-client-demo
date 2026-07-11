import type { ReactNode } from "react";
import { cx } from "../lib/utils";

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-xl border bg-[var(--color-surface-1)] [border-color:var(--color-border)]",
        padded && "p-5",
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
        <h3 className="text-sm font-semibold text-[var(--color-ink-primary)]">{title}</h3>
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
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", badgeStyles[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Button({
  children, onClick, variant = "primary", size = "md", className, type = "button", disabled,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md"; className?: string; type?: "button" | "submit"; disabled?: boolean;
}) {
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-brand-1)] text-white hover:bg-[var(--color-brand-2)]",
    secondary: "bg-black/5 text-[var(--color-ink-primary)] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
    ghost: "text-[var(--color-ink-secondary)] hover:bg-black/5 dark:hover:bg-white/10",
    danger: "bg-[var(--color-status-critical)] text-white hover:opacity-90",
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
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
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
  label, value, delta, deltaTone = "good", icon, accent,
}: {
  label: string; value: string; delta?: string; deltaTone?: "good" | "critical"; icon?: ReactNode; accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${accent ?? "var(--color-brand-1)"}1a`, color: accent ?? "var(--color-brand-1)" }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold tabular-nums text-[var(--color-ink-primary)]">{value}</span>
        {delta && (
          <span className={cx("text-xs font-medium tabular-nums", deltaTone === "good" ? "text-[var(--color-status-good)]" : "text-[var(--color-status-critical)]")}>
            {delta}
          </span>
        )}
      </div>
    </Card>
  );
}

export function Modal({ open, onClose, title, children, width = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: "sm" | "md" | "lg" }) {
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className={cx("w-full rounded-2xl bg-[var(--color-surface-2)] shadow-2xl max-h-[90vh] overflow-y-auto", widths[width])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4 [border-color:var(--color-border)]">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 border-b [border-color:var(--color-border)] overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cx(
            "px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
            active === tab
              ? "border-[var(--color-brand-1)] text-[var(--color-brand-1)]"
              : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm font-medium text-[var(--color-ink-secondary)]">{title}</p>
      {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-1">{subtitle}</p>}
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

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] focus:border-[var(--color-brand-1)] transition-colors",
        props.className
      )}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] focus:border-[var(--color-brand-1)] transition-colors",
        props.className
      )}
    >
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] focus:border-[var(--color-brand-1)] transition-colors",
        props.className
      )}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-ink-secondary)]">{label}</span>
      {children}
    </label>
  );
}
