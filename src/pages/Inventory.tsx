import { useMemo, useState } from "react";
import { PackagePlus, PackageMinus, ArrowLeftRight, Undo2 } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Tabs, Button, Input, Select, Field, Modal, Badge } from "../components/ui";
import { HorizontalBarChart } from "../components/charts";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { stockByBranch } from "../lib/selectors";
import type { InventoryTransaction } from "../lib/types";

const TABS = ["Item Master", "Stock Ledger", "Locations & Van Stock", "Stock by Branch"];

export default function Inventory() {
  const { branches, inventoryItems, inventoryLocations, inventoryStock, inventoryTransactions, addInventoryItem, addInventoryTransaction } = useStore();
  const [tab, setTab] = useState(TABS[0]);
  const [txnModal, setTxnModal] = useState<InventoryTransaction["type"] | null>(null);
  const [itemModal, setItemModal] = useState(false);

  const [txnForm, setTxnForm] = useState({ itemId: "", locationId: "", destLocationId: "", qty: 1 });
  const [itemForm, setItemForm] = useState({ name: "", category: "Electrical", brand: "", partNo: "", unitPrice: 0, reorderLevel: 5 });

  const stockByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of inventoryStock) map.set(s.itemId, (map.get(s.itemId) ?? 0) + s.qty);
    return map;
  }, [inventoryStock]);

  const branchStock = useMemo(
    () => stockByBranch(inventoryItems, inventoryLocations, inventoryStock, branches),
    [inventoryItems, inventoryLocations, inventoryStock, branches]
  );
  const branchValueChart = branchStock.map((b) => ({ branch: b.branch.name, value: b.totalValue }));

  function submitTxn() {
    if (!txnForm.itemId || !txnForm.locationId || txnForm.qty <= 0) return;
    if (!txnModal) return;
    addInventoryTransaction({
      itemId: txnForm.itemId,
      locationId: txnForm.locationId,
      type: txnModal,
      qty: txnForm.qty,
      createdBy: "You",
      destLocationId: txnModal === "transfer" ? txnForm.destLocationId : undefined,
    });
    setTxnForm({ itemId: "", locationId: "", destLocationId: "", qty: 1 });
    setTxnModal(null);
  }

  function submitItem() {
    if (!itemForm.name.trim() || !itemForm.partNo.trim()) return;
    addInventoryItem(itemForm);
    setItemForm({ name: "", category: "Electrical", brand: "", partNo: "", unitPrice: 0, reorderLevel: 5 });
    setItemModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventory & Spare Parts</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Stores, technician vans, and branch stock</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setTxnModal("receive")}><PackagePlus size={14} /> Receive</Button>
          <Button variant="secondary" onClick={() => setTxnModal("issue")}><PackageMinus size={14} /> Issue</Button>
          <Button variant="secondary" onClick={() => setTxnModal("return")}><Undo2 size={14} /> Return</Button>
          <Button variant="secondary" onClick={() => setTxnModal("transfer")}><ArrowLeftRight size={14} /> Transfer</Button>
          <Button onClick={() => setItemModal(true)}>+ Add Item</Button>
        </div>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
        <div className="p-5">
          {tab === "Item Master" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Part No.</th>
                  <th className="py-2 font-medium">Brand</th>
                  <th className="py-2 font-medium">Unit Price</th>
                  <th className="py-2 font-medium">Reorder Level</th>
                  <th className="py-2 font-medium">Total Stock</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((i) => {
                  const total = stockByItem.get(i.id) ?? 0;
                  return (
                    <tr key={i.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                      <td className="py-2.5 font-medium">{i.name}</td>
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
                {[...inventoryTransactions].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 60).map((txn) => {
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
              {inventoryLocations.map((loc) => {
                const items = inventoryStock.filter((s) => s.locationId === loc.id && s.qty > 0);
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
              {inventoryLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          {txnModal === "transfer" && (
            <Field label="To location">
              <Select value={txnForm.destLocationId} onChange={(e) => setTxnForm({ ...txnForm, destLocationId: e.target.value })}>
                <option value="">Choose destination…</option>
                {inventoryLocations.filter((l) => l.id !== txnForm.locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
