import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
    setSelected((s) => {
      const next = { ...s };
      if (itemId in next) delete next[itemId];
      else next[itemId] = 1;
      return next;
    });
  }

  function setQty(itemId: string, qty: number) {
    setSelected((s) => ({ ...s, [itemId]: Math.max(1, qty) }));
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
      <div className="max-h-72 overflow-y-auto rounded-lg border [border-color:var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--color-surface-2)]">
            <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
              <th className="py-2 pl-3 font-medium w-8"></th>
              <th className="py-2 font-medium">Part</th>
              <th className="py-2 font-medium">Brand</th>
              <th className="py-2 font-medium">Unit Price</th>
              <th className="py-2 font-medium">Stock</th>
              <th className="py-2 pr-3 font-medium w-20">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const checked = item.id in selected;
              const stock = stockByItem.get(item.id) ?? 0;
              return (
                <tr
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`border-b last:border-0 cursor-pointer [border-color:var(--color-border)] ${checked ? "bg-[var(--color-brand-1)]/5" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"}`}
                >
                  <td className="py-2 pl-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="py-2">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{item.partNo}</p>
                  </td>
                  <td className="py-2 text-[var(--color-ink-secondary)]">{item.brand}</td>
                  <td className="py-2 tabular-nums">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 tabular-nums">
                    <span className={stock <= item.reorderLevel ? "text-[var(--color-status-critical)] font-medium" : ""}>{stock}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={1}
                      disabled={!checked}
                      value={selected[item.id] ?? 1}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setQty(item.id, Number(e.target.value))}
                      className="w-16 rounded border bg-[var(--color-surface-2)] px-1.5 py-1 text-sm outline-none disabled:opacity-40 [border-color:var(--color-border)]"
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-[var(--color-ink-muted)]">No parts match your search.</td></tr>
            )}
          </tbody>
        </table>
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
