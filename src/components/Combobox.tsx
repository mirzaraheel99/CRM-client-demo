import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "../lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  // Extra text to match against while typing (e.g. phone, serial, model) —
  // defaults to label when omitted.
  searchText?: string;
  disabled?: boolean;
}

// Type-to-filter replacement for a plain <select> when the option list is
// long enough that scanning it isn't practical (customers, appliances).
// Keeps the same value/onChange contract as a native select.
export function Combobox({
  value, onChange, options, placeholder, className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => (o.searchText ?? o.label).toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cx(
          "flex w-full items-center gap-1 rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--color-brand-1)] focus-within:ring-4 focus-within:ring-[var(--color-brand-1)]/[0.12]",
          className
        )}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          value={open ? query : (selected?.label ?? "")}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
            else if (event.key === "Enter") {
              event.preventDefault();
              const option = filtered[highlighted];
              if (option && !option.disabled) { onChange(option.value); setOpen(false); }
            } else if (event.key === "Escape") { setOpen(false); }
          }}
          placeholder={placeholder}
          className="w-full min-w-0 truncate bg-transparent outline-none placeholder:text-[var(--color-ink-muted)]"
        />
        <ChevronDown size={14} className="shrink-0 text-[var(--color-ink-muted)]" />
      </div>
      {open && (
        <div ref={listRef} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-[var(--color-surface-1)] py-1 text-sm shadow-lg [border-color:var(--color-border)]">
          {filtered.length === 0 && <p className="px-3 py-2 text-[var(--color-ink-muted)]">No matches</p>}
          {filtered.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              data-idx={idx}
              disabled={option.disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={cx(
                "block w-full truncate px-3 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-40",
                idx === highlighted ? "bg-[var(--color-brand-1)]/10 text-[var(--color-brand-1)]" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
