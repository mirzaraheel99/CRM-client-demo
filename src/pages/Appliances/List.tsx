import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Wifi, PackageSearch } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, Button, Input, Select, Modal, Field, EmptyState, SortableTh } from "../../components/ui";
import { Badge } from "../../components/ui";
import { formatDate } from "../../lib/utils";
import { toast } from "../../lib/toast";
import { useSort } from "../../lib/useSort";
import type { ApplianceCategory, Appliance } from "../../lib/types";

const CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];
type SortKey = "model" | "category" | "brand" | "customer" | "serial" | "purchased";

export default function ApplianceList() {
  const { appliances, customers, brands, addAppliance } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ApplianceCategory | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", brandId: "", category: "AC" as ApplianceCategory, model: "", serialNo: "", imeiNo: "", purchaseDate: "" });

  const custMap = new Map(customers.map((c) => [c.id, c]));
  const brandMap = new Map(brands.map((b) => [b.id, b]));

  const filtered = useMemo(() => {
    let list = appliances;
    if (category !== "all") list = list.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.model.toLowerCase().includes(q) || a.serialNo.toLowerCase().includes(q) || (a.imeiNo ?? "").includes(q));
    }
    return list;
  }, [appliances, category, search]);

  const getValue = (a: Appliance, key: SortKey) => {
    if (key === "model") return a.model;
    if (key === "category") return a.category;
    if (key === "brand") return brandMap.get(a.brandId)?.name ?? "";
    if (key === "customer") return custMap.get(a.customerId)?.name ?? "";
    if (key === "serial") return a.serialNo;
    return new Date(a.purchaseDate).getTime();
  };
  const { sorted: rows, sortKey, dir, toggle } = useSort<Appliance, SortKey>(filtered, getValue, "purchased", "desc");

  function submit() {
    if (!form.customerId || !form.brandId || !form.model.trim() || !form.serialNo.trim() || !form.purchaseDate) return;
    const brand = brands.find((b) => b.id === form.brandId)!;
    const months = (Date.now() - new Date(form.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    addAppliance({
      ...form,
      imeiNo: form.imeiNo || undefined,
      isSmartConnected: false,
      warrantyStatus: months < brand.warrantyMonths ? "In Warranty" : "Out of Warranty",
    });
    setForm({ customerId: "", brandId: "", category: "AC", model: "", serialNo: "", imeiNo: "", purchaseDate: "" });
    setOpen(false);
    toast(`${form.model} added to appliances.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Appliances</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{rows.length} registered appliances</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Appliance</Button>
      </div>

      <Card className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input placeholder="Search model, serial, IMEI…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="w-44">
          <Select value={category} onChange={(e) => setCategory(e.target.value as ApplianceCategory | "all")}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="sticky top-0 z-10 bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
              <SortableTh label="Model" active={sortKey === "model"} direction={dir} onClick={() => toggle("model")} className="px-5 py-3" />
              <SortableTh label="Category" active={sortKey === "category"} direction={dir} onClick={() => toggle("category")} className="px-3 py-3" />
              <SortableTh label="Brand" active={sortKey === "brand"} direction={dir} onClick={() => toggle("brand")} className="px-3 py-3" />
              <SortableTh label="Customer" active={sortKey === "customer"} direction={dir} onClick={() => toggle("customer")} className="px-3 py-3" />
              <SortableTh label="Serial No." active={sortKey === "serial"} direction={dir} onClick={() => toggle("serial")} className="px-3 py-3" />
              <SortableTh label="Purchased" active={sortKey === "purchased"} direction={dir} onClick={() => toggle("purchased")} className="px-3 py-3" />
              <th className="px-5 py-3 font-medium">Warranty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-5 py-3">
                  <Link to={`/appliances/${a.id}`} className="font-medium text-[var(--color-brand-1)] hover:text-[var(--color-brand-2)] transition-colors">{a.model}</Link>
                  {a.isSmartConnected && <Wifi size={12} className="inline ml-1.5 mb-0.5 text-[var(--color-status-good)]" />}
                </td>
                <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{a.category}</td>
                <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{brandMap.get(a.brandId)?.name ?? "—"}</td>
                <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{custMap.get(a.customerId)?.name ?? "—"}</td>
                <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{a.serialNo}</td>
                <td className="px-3 py-3 text-[var(--color-ink-muted)]">{formatDate(a.purchaseDate)}</td>
                <td className="px-5 py-3"><Badge tone={a.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{a.warrantyStatus}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState icon={<PackageSearch size={18} />} title="No appliances found" subtitle="Try a different search or category filter." />}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Appliance">
        <div className="space-y-3">
          <Field label="Customer">
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Choose customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Brand">
            <Select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
              <option value="">Choose brand…</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ApplianceCategory })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Model"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
          <Field label="Serial number"><Input value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} /></Field>
          {form.category === "Mobile" && (
            <Field label="IMEI"><Input value={form.imeiNo} onChange={(e) => setForm({ ...form, imeiNo: e.target.value })} /></Field>
          )}
          <Field label="Purchase date"><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
          <Button className="w-full justify-center" onClick={submit}>Save Appliance</Button>
        </div>
      </Modal>
    </div>
  );
}
