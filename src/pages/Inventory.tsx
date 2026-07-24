import { useMemo, useState } from "react";
import { PackagePlus, PackageMinus, ArrowLeftRight, Undo2, Sparkles, Search, Building2 } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Tabs, Button, Input, Select, Field, Modal, Badge, SortableTh, EmptyState, Textarea } from "../components/ui";
import { HorizontalBarChart } from "../components/charts";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { inventoryLocationsByBranch, inventoryStockByBranch, inventoryTransactionsByBranch, stockByBranch, totalStockByItem, smartReorderSuggestions } from "../lib/selectors";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { useSort } from "../lib/useSort";
import { isFieldRequired, getMissingRequiredFields } from "../lib/requiredFields";
import { INVENTORY_TXN_TYPE_AR, LOCATION_TYPE_AR, bi } from "../lib/domainAr";
import type { InventoryTransaction, InventoryItem } from "../lib/types";

const TABS = ["Item Master", "Stock Ledger", "Locations & Van Stock", "Stock by Branch", "Smart Reorder"];
const TAB_LABELS: Record<string, string> = {
  "Item Master": bi("Item Master", "سجل الأصناف"),
  "Stock Ledger": bi("Stock Ledger", "دفتر حركة المخزون"),
  "Locations & Van Stock": bi("Locations & Van Stock", "المواقع ومخزون الشاحنات"),
  "Stock by Branch": bi("Stock by Branch", "المخزون حسب الفرع"),
  "Smart Reorder": bi("Smart Reorder", "إعادة الطلب الذكي"),
};
type ItemSortKey = "name" | "partNo" | "brand" | "unitPrice" | "reorderLevel" | "totalStock";

const emptyItemForm = () => ({ name: "", nameAr: "", category: "Electrical", brand: "", partNo: "", unit: "", unitPrice: 0, reorderLevel: 5, notes: "" });

export default function Inventory() {
  const { branches, inventoryItems, inventoryLocations, inventoryStock, inventoryTransactions, brands, units, selectedBranchId, role, addInventoryItem, addInventoryTransaction, requiredFieldsVersion } = useStore();
  // requiredFieldsVersion (destructured above) forces a re-render whenever the module-level table in requiredFields.ts changes.
  void requiredFieldsVersion;
  const [tab, setTab] = useState(TABS[0]);
  const [txnModal, setTxnModal] = useState<InventoryTransaction["type"] | null>(null);
  const [itemModal, setItemModal] = useState(false);
  const [orderedItems, setOrderedItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [breakdownItem, setBreakdownItem] = useState<InventoryItem | null>(null);

  const [txnForm, setTxnForm] = useState({ itemId: "", locationId: "", destLocationId: "", qty: 1 });
  const [itemForm, setItemForm] = useState(emptyItemForm());
  const scopedLocations = useMemo(() => inventoryLocationsByBranch(inventoryLocations, selectedBranchId), [inventoryLocations, selectedBranchId]);
  const scopedStock = useMemo(() => inventoryStockByBranch(inventoryStock, inventoryLocations, selectedBranchId), [inventoryStock, inventoryLocations, selectedBranchId]);
  const scopedTransactions = useMemo(() => inventoryTransactionsByBranch(inventoryTransactions, inventoryLocations, selectedBranchId), [inventoryTransactions, inventoryLocations, selectedBranchId]);
  const scopedBranches = useMemo(() => selectedBranchId === "all" ? branches : branches.filter((branch) => branch.id === selectedBranchId), [branches, selectedBranchId]);

  const stockByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scopedStock) map.set(s.itemId, (map.get(s.itemId) ?? 0) + s.qty);
    return map;
  }, [scopedStock]);

  // Unlike stockByItem (scoped to the top-nav branch selector), this always
  // reflects every branch, so admins can see true company-wide stock even
  // while viewing a single branch's scope.
  const companyStockByItem = useMemo(() => totalStockByItem(inventoryStock), [inventoryStock]);
  const companyStockByBranch = useMemo(
    () => stockByBranch(inventoryItems, inventoryLocations, inventoryStock, branches),
    [inventoryItems, inventoryLocations, inventoryStock, branches]
  );

  const itemSortValue = (i: InventoryItem, key: ItemSortKey) => {
    if (key === "name") return i.name;
    if (key === "partNo") return i.partNo;
    if (key === "brand") return i.brand;
    if (key === "unitPrice") return i.unitPrice;
    if (key === "reorderLevel") return i.reorderLevel;
    return stockByItem.get(i.id) ?? 0;
  };
  const filteredItems = useMemo(() => {
    if (!search.trim()) return inventoryItems;
    const query = search.toLowerCase();
    return inventoryItems.filter((i) =>
      i.name.toLowerCase().includes(query) ||
      (i.nameAr ?? "").toLowerCase().includes(query) ||
      i.partNo.toLowerCase().includes(query) ||
      i.brand.toLowerCase().includes(query) ||
      i.category.toLowerCase().includes(query)
    );
  }, [inventoryItems, search]);
  const { sorted: sortedItems, sortKey: itemSortKey, dir: itemDir, toggle: toggleItemSort } = useSort<InventoryItem, ItemSortKey>(filteredItems, itemSortValue, "name");

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
    if (getMissingRequiredFields("inventoryItem", itemForm).length > 0) return;
    addInventoryItem({ ...itemForm, nameAr: itemForm.nameAr.trim() || undefined, notes: itemForm.notes.trim() || undefined });
    setItemForm(emptyItemForm());
    setItemModal(false);
    toast(`${itemForm.name} added to inventory.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Inventory & Spare Parts", "المخزون وقطع الغيار")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Stores, technician vans, and branch stock</p>
        </div>
        {canPerform(role, "manage_inventory") && <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setTxnModal("receive")}><PackagePlus size={14} /> {bi("Receive", "استلام")}</Button>
          <Button variant="secondary" onClick={() => setTxnModal("issue")}><PackageMinus size={14} /> {bi("Issue", "صرف")}</Button>
          <Button variant="secondary" onClick={() => setTxnModal("return")}><Undo2 size={14} /> {bi("Return", "إرجاع")}</Button>
          <Button variant="secondary" onClick={() => setTxnModal("transfer")}><ArrowLeftRight size={14} /> {bi("Transfer", "نقل")}</Button>
          <Button onClick={() => setItemModal(true)}>+ {bi("Add Item", "إضافة صنف")}</Button>
        </div>}
      </div>

      <Card padded={false}>
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} labels={TAB_LABELS} /></div>
        <div className="p-5">
          {tab === "Item Master" && (
            <div className="space-y-3">
              <div className="relative max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                <Input placeholder={bi("Search name, part no., brand, category...", "بحث بالاسم أو رقم القطعة أو العلامة التجارية أو الفئة...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                    <SortableTh label={bi("Name", "الاسم")} active={itemSortKey === "name"} direction={itemDir} onClick={() => toggleItemSort("name")} className="py-2" />
                    <th className="py-2 pr-6 font-medium">{bi("Arabic Alias", "الاسم بالعربية")}</th>
                    <SortableTh label={bi("Part No.", "رقم القطعة")} active={itemSortKey === "partNo"} direction={itemDir} onClick={() => toggleItemSort("partNo")} className="py-2" />
                    <SortableTh label={bi("Brand", "العلامة التجارية")} active={itemSortKey === "brand"} direction={itemDir} onClick={() => toggleItemSort("brand")} className="py-2" />
                    <th className="py-2 pr-6 font-medium">{bi("Unit", "الوحدة")}</th>
                    <SortableTh label={bi("Unit Price", "سعر الوحدة")} active={itemSortKey === "unitPrice"} direction={itemDir} onClick={() => toggleItemSort("unitPrice")} className="py-2" />
                    <SortableTh label={bi("Reorder Level", "حد إعادة الطلب")} active={itemSortKey === "reorderLevel"} direction={itemDir} onClick={() => toggleItemSort("reorderLevel")} className="py-2" />
                    <SortableTh label={selectedBranchId === "all" ? bi("Total Stock", "إجمالي المخزون") : bi("Stock (This Branch)", "المخزون (هذا الفرع)")} active={itemSortKey === "totalStock"} direction={itemDir} onClick={() => toggleItemSort("totalStock")} className="py-2" />
                    {selectedBranchId !== "all" && <th className="py-2 pr-6 font-medium">{bi("Company-wide Stock", "المخزون على مستوى الشركة")}</th>}
                    <th className="py-2 font-medium">{bi("By Branch", "حسب الفرع")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((i) => {
                    const total = stockByItem.get(i.id) ?? 0;
                    const companyTotal = companyStockByItem.get(i.id) ?? 0;
                    return (
                      <tr key={i.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                        <td className="py-2.5 font-medium">{i.name}</td>
                        <td className="py-2.5 pr-6 text-[var(--color-ink-secondary)]" dir="rtl">{i.nameAr ?? "—"}</td>
                        <td className="py-2.5 text-[var(--color-ink-secondary)]">{i.partNo}</td>
                        <td className="py-2.5 text-[var(--color-ink-secondary)]">{i.brand}</td>
                        <td className="py-2.5 pr-6 text-[var(--color-ink-secondary)]">{i.unit ?? "—"}</td>
                        <td className="py-2.5 tabular-nums">{formatCurrency(i.unitPrice)}</td>
                        <td className="py-2.5 tabular-nums">{i.reorderLevel}</td>
                        <td className="py-2.5 tabular-nums">
                          <Badge tone={total <= i.reorderLevel ? "critical" : "good"}>{total}</Badge>
                        </td>
                        {selectedBranchId !== "all" && (
                          <td className="py-2.5 pr-6 tabular-nums text-[var(--color-ink-secondary)]">{companyTotal}</td>
                        )}
                        <td className="py-2.5">
                          <Button size="sm" variant="secondary" onClick={() => setBreakdownItem(i)}>
                            <Building2 size={13} /> {bi("View", "عرض")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedItems.length === 0 && <EmptyState icon={<Search size={18} />} title={bi("No items found", "لم يتم العثور على أصناف")} subtitle="Try a different search term." />}
            </div>
          )}

          {tab === "Stock Ledger" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                  <th className="py-2 font-medium">{bi("Item", "الصنف")}</th>
                  <th className="py-2 font-medium">{bi("Type", "النوع")}</th>
                  <th className="py-2 font-medium">{bi("Location", "الموقع")}</th>
                  <th className="py-2 font-medium">{bi("Qty", "الكمية")}</th>
                  <th className="py-2 font-medium">{bi("By", "بواسطة")}</th>
                  <th className="py-2 font-medium">{bi("When", "الوقت")}</th>
                </tr>
              </thead>
              <tbody>
                {[...scopedTransactions].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 60).map((txn) => {
                  const item = inventoryItems.find((i) => i.id === txn.itemId);
                  const loc = inventoryLocations.find((l) => l.id === txn.locationId);
                  return (
                    <tr key={txn.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                      <td className="py-2.5">{item?.name}</td>
                      <td className="py-2.5 capitalize">{bi(txn.type, INVENTORY_TXN_TYPE_AR[txn.type])}</td>
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
                    <CardHeader title={loc.name} subtitle={bi(loc.type === "van" ? "Technician van" : loc.type === "store" ? "Main store" : "Branch store", LOCATION_TYPE_AR[loc.type])} />
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
                      {items.length === 0 && <p className="text-xs text-[var(--color-ink-muted)]">{bi("No stock recorded.", "لا يوجد مخزون مسجل.")}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "Stock by Branch" && (
            <div className="space-y-5">
              <div>
                <CardHeader title={bi("Inventory value by branch", "قيمة المخزون حسب الفرع")} subtitle="Total stock value (unit price × qty on hand) across all locations in each branch" />
                <HorizontalBarChart data={branchValueChart} dataKey="value" categoryKey="branch" color="var(--color-series-5)" height={Math.max(120, branchStock.length * 60)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branchStock.map(({ branch, totalUnits, totalValue, lowStockCount }) => (
                  <Card key={branch.id}>
                    <CardHeader title={branch.name} />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">{bi("Units on hand", "الوحدات المتوفرة")}</span><span className="font-medium tabular-nums">{totalUnits}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">{bi("Stock value", "قيمة المخزون")}</span><span className="font-medium tabular-nums">{formatCurrency(totalValue)}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--color-ink-muted)]">{bi("Low-stock items", "أصناف منخفضة المخزون")}</span>
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
                    <th className="py-2 font-medium">{bi("Part", "القطعة")}</th>
                    <th className="py-2 font-medium">{bi("Current Stock", "المخزون الحالي")}</th>
                    <th className="py-2 font-medium">{bi("Weekly Usage", "الاستهلاك الأسبوعي")}</th>
                    <th className="py-2 font-medium">{bi("Weeks of Cover", "أسابيع التغطية")}</th>
                    <th className="py-2 font-medium">{bi("Suggested Reorder", "الطلب المقترح")}</th>
                    <th className="py-2 font-medium">{bi("Action", "الإجراء")}</th>
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
                          {s.weeksOfCover == null ? bi("No recent usage", "لا يوجد استهلاك حديث") : `${s.weeksOfCover} wks`}
                        </Badge>
                      </td>
                      <td className="py-2.5 tabular-nums font-medium">{s.suggestedQty} units</td>
                      <td className="py-2.5">
                        {orderedItems.has(s.item.id) ? (
                          <Badge tone="good">{bi("Order placed", "تم تقديم الطلب")}</Badge>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => { setOrderedItems((prev) => new Set(prev).add(s.item.id)); toast(`Purchase order created for ${s.item.name}.`); }}>
                            {bi("Create Purchase Order", "إنشاء أمر شراء")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reorderSuggestions.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-[var(--color-ink-muted)]">{bi("Stock levels are healthy across all tracked parts.", "مستويات المخزون جيدة لجميع القطع المتابعة.")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Modal open={!!txnModal} onClose={() => setTxnModal(null)} title={txnModal ? bi(`${txnModal} stock`.replace(/^\w/, (c) => c.toUpperCase()), `${INVENTORY_TXN_TYPE_AR[txnModal]} المخزون`) : ""}>
        <div className="space-y-3">
          <Field label={bi("Item", "الصنف")}>
            <Select value={txnForm.itemId} onChange={(e) => setTxnForm({ ...txnForm, itemId: e.target.value })}>
              <option value="">{bi("Choose item…", "اختر صنفاً…")}</option>
              {inventoryItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label={txnModal === "transfer" ? bi("From location", "من موقع") : bi("Location", "الموقع")}>
            <Select value={txnForm.locationId} onChange={(e) => setTxnForm({ ...txnForm, locationId: e.target.value })}>
              <option value="">{bi("Choose location…", "اختر موقعاً…")}</option>
              {scopedLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          {txnModal === "transfer" && (
            <Field label={bi("To location", "إلى موقع")}>
              <Select value={txnForm.destLocationId} onChange={(e) => setTxnForm({ ...txnForm, destLocationId: e.target.value })}>
                <option value="">{bi("Choose destination…", "اختر الوجهة…")}</option>
                {scopedLocations.filter((l) => l.id !== txnForm.locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label={bi("Quantity", "الكمية")}>
            <Input type="number" min={1} value={txnForm.qty} onChange={(e) => setTxnForm({ ...txnForm, qty: Number(e.target.value) })} />
          </Field>
          <Button className="w-full justify-center" onClick={submitTxn}>{bi("Confirm", "تأكيد")}</Button>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title={bi("Add Inventory Item", "إضافة صنف للمخزون")}>
        <div className="space-y-3">
          <Field label={bi("Name", "الاسم")} required={isFieldRequired("inventoryItem", "name")}><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></Field>
          <Field label={bi("Arabic Alias (shown on customer invoices/messages)", "الاسم بالعربية (يظهر في فواتير ورسائل العميل)")} required={isFieldRequired("inventoryItem", "nameAr")}><Input dir="rtl" value={itemForm.nameAr} onChange={(e) => setItemForm({ ...itemForm, nameAr: e.target.value })} /></Field>
          <Field label={bi("Part No.", "رقم القطعة")} required={isFieldRequired("inventoryItem", "partNo")}><Input value={itemForm.partNo} onChange={(e) => setItemForm({ ...itemForm, partNo: e.target.value })} /></Field>
          <Field label={bi("Brand", "العلامة التجارية")} required={isFieldRequired("inventoryItem", "brand")}>
            <Select value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}>
              <option value="">{bi("Choose brand...", "اختر العلامة التجارية...")}</option>
              {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label={bi("Unit of measure", "وحدة القياس")} required={isFieldRequired("inventoryItem", "unit")}>
            <Select value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}>
              <option value="">{bi("Choose unit...", "اختر الوحدة...")}</option>
              {units.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label={bi("Unit price (SAR)", "سعر الوحدة (ريال)")} required={isFieldRequired("inventoryItem", "unitPrice")}><Input type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })} /></Field>
          <Field label={bi("Reorder level", "حد إعادة الطلب")} required={isFieldRequired("inventoryItem", "reorderLevel")}><Input type="number" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })} /></Field>
          <Field label={bi("Notes (optional)", "ملاحظات (اختياري)")} required={isFieldRequired("inventoryItem", "notes")}>
            <Textarea rows={3} value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
          </Field>
          <Button className="w-full justify-center" onClick={submitItem} disabled={getMissingRequiredFields("inventoryItem", itemForm).length > 0}>{bi("Save Item", "حفظ الصنف")}</Button>
        </div>
      </Modal>

      <Modal open={!!breakdownItem} onClose={() => setBreakdownItem(null)} title={breakdownItem ? bi(`Stock by branch — ${breakdownItem.name}`, `المخزون حسب الفرع — ${breakdownItem.name}`) : ""}>
        {breakdownItem && (
          <div className="space-y-2">
            {companyStockByBranch.map(({ branch, totals }) => {
              const qty = totals.get(breakdownItem.id) ?? 0;
              return (
                <div key={branch.id} className="flex items-center justify-between rounded-md border px-3 py-2 [border-color:var(--color-border)]">
                  <span className="text-sm text-[var(--color-ink-secondary)]">{branch.name}</span>
                  <Badge tone={qty <= breakdownItem.reorderLevel ? "critical" : "good"}>{qty}</Badge>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 mt-1 border-t [border-color:var(--color-border)]">
              <span className="text-sm font-medium">{bi("Company-wide total", "الإجمالي على مستوى الشركة")}</span>
              <Badge tone="brand">{companyStockByItem.get(breakdownItem.id) ?? 0}</Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
