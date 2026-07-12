import { useMemo, useState } from "react";
import { Check, Minus, Package, Plus, Search } from "lucide-react";
import { Input, Button } from "./ui";
import { formatCurrency } from "../lib/utils";
import type { InventoryItem } from "../lib/types";

export function PartsGrid({
  items, stockByItem, onAdd,
}: {
  items: InventoryItem[];
  stockByItem: Map<string, number>;
  onAdd: (selections: { itemId: string; qty: number }[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});

  const rows = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.partNo.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q));
  }, [items, search]);

  function toggle(itemId: string) {
    if ((stockByItem.get(itemId) ?? 0) <= 0) return;
    setSelected((s) => {
      const next = { ...s };
      if (itemId in next) delete next[itemId];
      else next[itemId] = 1;
      return next;
    });
  }

  function setQty(itemId: string, qty: number) {
    const available = stockByItem.get(itemId) ?? 0;
    setSelected((s) => ({ ...s, [itemId]: Math.max(1, Math.min(available, qty)) }));
  }

  const selectedCount = Object.keys(selected).length;
  const total = Object.entries(selected).reduce((acc, [itemId, qty]) => {
    const item = items.find((i) => i.id === itemId);
    return acc + (item ? item.unitPrice * qty : 0);
  }, 0);

  function handleAdd() {
    onAdd(Object.entries(selected).map(([itemId, qty]) => ({ itemId, qty })));
    setSelected({});
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
        <Input placeholder="Search parts by name, part no, brand…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>
      <div className="max-h-[26rem] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {rows.map((item) => {
            const checked = item.id in selected;
            const stock = stockByItem.get(item.id) ?? 0;
            const outOfStock = stock <= 0;
            const lowStock = stock > 0 && stock <= item.reorderLevel;
            const qty = selected[item.id] ?? 1;

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-lg border transition-colors [border-color:var(--color-border)] ${checked ? "border-[var(--color-brand-1)] bg-[var(--color-brand-1)]/[0.05]" : "bg-[var(--color-surface-2)]"} ${outOfStock ? "opacity-55" : ""}`}
              >
                <label className={`flex min-h-24 gap-3 p-3 ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={outOfStock}
                    onChange={() => toggle(item.id)}
                    aria-label={`Select ${item.name}`}
                    className="sr-only"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-black/[0.04] text-[var(--color-ink-muted)] dark:bg-white/[0.06]">
                    <Package size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="block truncate text-[11px] text-[var(--color-ink-muted)]">{item.partNo} · {item.brand}</span>
                    <span className="mt-2 block text-sm font-semibold tabular-nums">{formatCurrency(item.unitPrice)}</span>
                  </span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-[var(--color-brand-1)] bg-[var(--color-brand-1)] text-white" : "[border-color:var(--color-border)]"}`}>
                    {checked && <Check size={13} strokeWidth={3} />}
                  </span>
                </label>

                <div className="flex h-11 items-center justify-between border-t px-3 [border-color:var(--color-border)]">
                  <span className={`text-[11px] font-medium ${outOfStock || lowStock ? "text-[var(--color-status-critical)]" : "text-[var(--color-ink-muted)]"}`}>
                    {outOfStock ? "Out of stock" : lowStock ? `${stock} left · Low stock` : `${stock} in stock`}
                  </span>
                  <div className={`flex h-7 items-center overflow-hidden rounded-md border [border-color:var(--color-border)] ${checked ? "" : "opacity-35"}`}>
                    <button
                      type="button"
                      title="Decrease quantity"
                      aria-label={`Decrease ${item.name} quantity`}
                      disabled={!checked || qty <= 1}
                      onClick={() => setQty(item.id, qty - 1)}
                      className="flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={stock}
                      disabled={!checked}
                      value={qty}
                      aria-label={`${item.name} quantity`}
                      onChange={(e) => setQty(item.id, Number(e.target.value))}
                      className="h-7 w-8 border-x bg-transparent text-center text-xs tabular-nums outline-none disabled:cursor-not-allowed [border-color:var(--color-border)]"
                    />
                    <button
                      type="button"
                      title="Increase quantity"
                      aria-label={`Increase ${item.name} quantity`}
                      disabled={!checked || qty >= stock}
                      onClick={() => setQty(item.id, qty + 1)}
                      className="flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">No parts match your search.</p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-ink-muted)]">
          {selectedCount > 0 ? `${selectedCount} part${selectedCount > 1 ? "s" : ""} selected · ${formatCurrency(total)}` : "Select parts to add to this job"}
        </p>
        <Button disabled={selectedCount === 0} onClick={handleAdd}>Add {selectedCount > 0 ? `${selectedCount} ` : ""}to Job Card</Button>
      </div>
    </div>
  );
}
