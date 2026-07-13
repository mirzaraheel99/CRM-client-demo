import { useMemo, useState } from "react";
import { PackagePlus, PackageMinus, ArrowLeftRight, Undo2, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Tabs, Button, Input, Select, Field, Modal, Badge, SortableTh } from "../components/ui";
import { HorizontalBarChart } from "../components/charts";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { inventoryLocationsByBranch, inventoryStockByBranch, inventoryTransactionsByBranch, stockByBranch, smartReorderSuggestions } from "../lib/selectors";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { useSort } from "../lib/useSort";
import type { InventoryTransaction, InventoryItem } from "../lib/types";

const TABS = ["Item Master", "Stock Ledger", "Locations & Van Stock", "Stock by Branch", "Smart Reorder"];
type ItemSortKey = "name" | "partNo" | "brand" | "unitPrice" | "reorderLevel" | "totalStock";

export default function Inventory() {
  const { branches, inventoryItems, inventoryLocations, inventoryStock, inventoryTransactions, selectedBranchId, role, addInventoryItem, addInventoryTransaction } = useStore();
  const [tab, setTab] = useState(TABS[0]);
  const [txnModal, setTxnModal] = useState<InventoryTransaction["type"] | null>(null);
  const [itemModal, setItemModal] = useState(false);
  const [orderedItems, setOrderedItems] = useState<Set<string>>(new Set());

  const [txnForm, setTxnForm] = useState({ itemId: "", locationId: "", destLocationId: "", qty: 1 });
  const [itemForm, setItemForm] = useState({ name: "", nameAr: "", category: "Electrical", brand: "", partNo: "", unitPrice: 0, reorderLevel: 5 });
  const scopedLocations = useMemo(() => inventoryLocationsByBranch(inventoryLocations, selectedBranchId), [inventoryLocations, selectedBranchId]);
  const scopedStock = useMemo(() => inventoryStockByBranch(inventoryStock, inventoryLocations, selectedBranchId), [inventoryStock, inventoryLocations, selectedBranchId]);
  const scopedTransactions = useMemo(() => inventoryTransactionsByBranch(inventoryTransactions, inventoryLocations, selectedBranchId), [inventoryTransactions, inventoryLocations, selectedBranchId]);
  const scopedBranches = useMemo(() => selectedBranchId === "all" ? branches : branches.filter((branch) => branch.id === selectedBranchId), [branches, selectedBranchId]);

  const stockByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scopedStock) map.set(s.itemId, (map.get(s.itemId) ?? 0) + s.qty);
    return map;
  }, [scopedStock]);

  const itemSortValue = (i: InventoryItem, key: ItemSortKey) => {
    if (key === "name") return i.name;
    if (key === "partNo") return i.partNo;
    if (key === "brand") return i.brand;
    if (key === "unitPrice") return i.unitPrice;
    if (key === "reorderLevel") return i.reorderLevel;
    return stockByItem.get(i.id) ?? 0;
  };
  const { sorted: sortedItems, sortKey: itemSortKey, dir: itemDir, toggle: toggleItemSort } = useSort<InventoryItem, ItemSortKey>(inventoryItems, itemSortValue, "name");

  const branchStock = useMemo(
    () => stockByBranch(inventoryItems, scopedLocations, scopedStock, scopedBranches),
    [inventoryItems, scopedLocations, scopedStock, scopedBranches]
  );
  const branchValueChart = branchStock.map((b) => ({ branch: b.branch.name, value: b.totalValue }));
  const reorderSuggestions = useMemo(
    () => smartReorderSuggestions(inventoryItems, scopedTransactions, scopedStock),
    [inventoryItems, scopedTransactions, scopedStock]
  );

  function submitTxn() {
    if (!txnForm.itemId || !txnForm.locationId || txnForm.qty <= 0) return;
    if (!txnModal) return;
    const result = addInventoryTransaction({
      itemId: txnForm.itemId,
      locationId: txnForm.locationId,
      type: txnModal,
      qty: txnForm.qty,
      createdBy: "You",
      destLocationId: txnModal === "transfer" ? txnForm.destLocationId : undefined,
    });
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) {
      setTxnForm({ itemId: "", locationId: "", destLocationId: "", qty: 1 });
      setTxnModal(null);
    }
  }

  function submitItem() {
    if (!itemForm.name.trim() || !itemForm.partNo.trim()) return;
    addInventoryItem({ ...itemForm, nameAr: itemForm.nameAr.trim() || undefined });
    setItemForm({ name: "", nameAr: "", category: "Electrical", brand: "", partNo: "", unitPrice: 0, reorderLevel: 5 });
    setItemModal(false);
    toast(`${itemForm.name} added to inventory.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventory & Spare Parts</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Stores, technician vans, and branch stock</p>
        </div>
        {canPerform(role, "manage_inventory") && <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setTxnModal("receive")}><PackagePlus size={14} /> Receive</Button>
          <Button variant="secondary" onClick={() => setTxnModal("issue")}><PackageMinus size={14} /> Issue</Button>
          <Button variant="secondary" onClick={() => setTxnModal("return")}><Undo2 size={14} /> Return</Button>
          <Button variant="secondary" onClick={() => setTxnModal("transfer")}><ArrowLeftRight size={14} /> Transfer</Button>
          <Button onClick={() => setItemModal(true)}>+ Add Item</Button>
        </div>}
      </div>

      <Card padded={false}>
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
        <div className="p-5">
          {tab === "Item Master" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                  <SortableTh label="Name" active={itemSortKey === "name"} direction={itemDir} onClick={() => toggleItemSort("name")} className="py-2" />
                  <th className="py-2 pr-6 font-medium">Arabic Alias</th>
                  <SortableTh label="Part No." active={itemSortKey === "partNo"} direction={itemDir} onClick={() => toggleItemSort("partNo")} className="py-2" />
                  <SortableTh label="Brand" active={itemSortKey === "brand"} direction={itemDir} onClick={() => toggleItemSort("brand")} className="py-2" />
                  <SortableTh label="Unit Price" active={itemSortKey === "unitPrice"} direction={itemDir} onClick={() => toggleItemSort("unitPrice")} className="py-2" />
                  <SortableTh label="Reorder Level" active={itemSortKey === "reorderLevel"} direction={itemDir} onClick={() => toggleItemSort("reorderLevel")} className="py-2" />
                  <SortableTh label="Total Stock" active={itemSortKey === "totalStock"} direction={itemDir} onClick={() => toggleItemSort("totalStock")} className="py-2" />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((i) => {
                  const total = stockByItem.get(i.id) ?? 0;
                  return (
                    <tr key={i.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                      <td className="py-2.5 font-medium">{i.name}</td>
                      <td className="py-2.5 pr-6 text-[var(--color-ink-secondary)]" dir="rtl">{i.nameAr ?? "—"}</td>
                      <td className="py-2.5 text-[var(--color-ink-secondary)]">{i.partNo}</td>
                      <td className="py-2.5 text-[var(--color-ink-secondary)]">{i.brand}</td>
                      <td className="py-2.5 tabular-nums">{formatCurrency(i.unitPrice)}</td>
                      <td className="py-2.5 tabular-nums">{i.reorderLevel}</td>
                      <td className="py-2.5 tabular-nums">
                        <Badge tone={total <= i.reorderLevel ? "critical" : "good"}>{total}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "Stock Ledger" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Location</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium">By</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {[...scopedTransactions].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 60).map((txn) => {
                  const item = inventoryItems.find((i) => i.id === txn.itemId);
                  const loc = inventoryLocations.find((l) => l.id === txn.locationId);
                  return (
                    <tr key={txn.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                      <td className="py-2.5">{item?.name}</td>
                      <td className="py-2.5 capitalize">{txn.type}</td>
                      <td className="py-2.5 text-[var(--color-ink-secondary)]">{loc?.name}</td>
                      <td className="py-2.5 tabular-nums">{txn.qty}</td>
                      <td className="py-2.5 text-[var(--color-ink-secondary)]">{txn.createdBy}</td>
                      <td className="py-2.5 text-[var(--color-ink-muted)]">{formatDateTime(txn.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "Locations & Van Stock" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scopedLocations.map((loc) => {
                const items = scopedStock.filter((s) => s.locationId === loc.id && s.qty > 0);
                return (
                  <Card key={loc.id}>
                    <CardHeader title={loc.name} subtitle={loc.type === "van" ? "Technician van" : loc.type === "store" ? "Main store" : "Branch store"} />
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {items.slice(0, 8).map((s) => {
                        const item = inventoryItems.find((i) => i.id === s.itemId);
                        return (
                          <div key={s.itemId} className="flex justify-between text-xs">
                            <span className="text-[var(--color-ink-secondary)] truncate">{item?.name}</span>
                            <span className="tabular-nums font-medium">{s.qty}</span>
                          </div>
                        );
                      })}
                      {items.length === 0 && <p className="text-xs text-[var(--color-ink-muted)]">No stock recorded.</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "Stock by Branch" && (
            <div className="space-y-5">
              <div>
                <CardHeader title="Inventory value by branch" subtitle="Total stock value (unit price × qty on hand) across all locations in each branch" />
                <HorizontalBarChart data={branchValueChart} dataKey="value" categoryKey="branch" color="var(--color-series-5)" height={Math.max(120, branchStock.length * 60)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branchStock.map(({ branch, totalUnits, totalValue, lowStockCount }) => (
                  <Card key={branch.id}>
                    <CardHeader title={branch.name} />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Units on hand</span><span className="font-medium tabular-nums">{totalUnits}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Stock value</span><span className="font-medium tabular-nums">{formatCurrency(totalValue)}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--color-ink-muted)]">Low-stock items</span>
                        <Badge tone={lowStockCount > 0 ? "critical" : "good"}>{lowStockCount}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === "Smart Reorder" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--color-brand-1)]" />
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Ranked by consumption velocity over the last 30 days, not just a static reorder level — items closest to running out appear first.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                    <th className="py-2 font-medium">Part</th>
                    <th className="py-2 font-medium">Current Stock</th>
                    <th className="py-2 font-medium">Weekly Usage</th>
                    <th className="py-2 font-medium">Weeks of Cover</th>
                    <th className="py-2 font-medium">Suggested Reorder</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderSuggestions.map((s) => (
                    <tr key={s.item.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                      <td className="py-2.5">
                        <p className="font-medium">{s.item.name}</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">{s.item.partNo}</p>
                      </td>
                      <td className="py-2.5 tabular-nums">{s.currentStock}</td>
                      <td className="py-2.5 tabular-nums">{s.weeklyVelocity}/wk</td>
                      <td className="py-2.5">
                        <Badge tone={s.weeksOfCover == null ? "neutral" : s.weeksOfCover < 1.5 ? "critical" : "warning"}>
                          {s.weeksOfCover == null ? "No recent usage" : `${s.weeksOfCover} wks`}
                        </Badge>
                      </td>
                      <td className="py-2.5 tabular-nums font-medium">{s.suggestedQty} units</td>
                      <td className="py-2.5">
                        {orderedItems.has(s.item.id) ? (
                          <Badge tone="good">Order placed</Badge>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => { setOrderedItems((prev) => new Set(prev).add(s.item.id)); toast(`Purchase order created for ${s.item.name}.`); }}>
                            Create Purchase Order
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reorderSuggestions.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-[var(--color-ink-muted)]">Stock levels are healthy across all tracked parts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Modal open={!!txnModal} onClose={() => setTxnModal(null)} title={`${txnModal ?? ""} stock`.replace(/^\w/, (c) => c.toUpperCase())}>
        <div className="space-y-3">
          <Field label="Item">
            <Select value={txnForm.itemId} onChange={(e) => setTxnForm({ ...txnForm, itemId: e.target.value })}>
              <option value="">Choose item…</option>
              {inventoryItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label={txnModal === "transfer" ? "From location" : "Location"}>
            <Select value={txnForm.locationId} onChange={(e) => setTxnForm({ ...txnForm, locationId: e.target.value })}>
              <option value="">Choose location…</option>
              {scopedLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          {txnModal === "transfer" && (
            <Field label="To location">
              <Select value={txnForm.destLocationId} onChange={(e) => setTxnForm({ ...txnForm, destLocationId: e.target.value })}>
                <option value="">Choose destination…</option>
                {scopedLocations.filter((l) => l.id !== txnForm.locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Quantity">
            <Input type="number" min={1} value={txnForm.qty} onChange={(e) => setTxnForm({ ...txnForm, qty: Number(e.target.value) })} />
          </Field>
          <Button className="w-full justify-center" onClick={submitTxn}>Confirm</Button>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Add Inventory Item">
        <div className="space-y-3">
          <Field label="Name"><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></Field>
          <Field label="Arabic Alias (shown on customer invoices/messages)"><Input dir="rtl" value={itemForm.nameAr} onChange={(e) => setItemForm({ ...itemForm, nameAr: e.target.value })} /></Field>
          <Field label="Part No."><Input value={itemForm.partNo} onChange={(e) => setItemForm({ ...itemForm, partNo: e.target.value })} /></Field>
          <Field label="Brand"><Input value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })} /></Field>
          <Field label="Unit price (SAR)"><Input type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })} /></Field>
          <Field label="Reorder level"><Input type="number" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })} /></Field>
          <Button className="w-full justify-center" onClick={submitItem}>Save Item</Button>
        </div>
      </Modal>
    </div>
  );
}
