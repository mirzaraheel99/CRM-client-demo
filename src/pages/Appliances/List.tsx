import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, Search, Wifi } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, SortableTh } from "../../components/ui";
import { formatDate } from "../../lib/utils";
import { toast } from "../../lib/toast";
import { useSort } from "../../lib/useSort";
import { appliancesByBranch } from "../../lib/selectors";
import { canPerform } from "../../lib/permissions";
import type { Appliance, ApplianceCategory } from "../../lib/types";

const CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];
const PAGE_SIZE = 15;
type SortKey = "document" | "model" | "category" | "brand" | "serial" | "purchased";

export default function ApplianceList() {
  const { appliances, brands, jobCards, selectedBranchId, role, addAppliance } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ApplianceCategory | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brandId: "", category: "AC" as ApplianceCategory, model: "", serialNo: "", imeiNo: "", purchaseDate: "" });
  const [page, setPage] = useState(1);

  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const scopedAppliances = useMemo(() => appliancesByBranch(appliances, jobCards, selectedBranchId), [appliances, jobCards, selectedBranchId]);
  const filtered = useMemo(() => {
    let list = scopedAppliances;
    if (category !== "all") list = list.filter((appliance) => appliance.category === category);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((appliance) =>
        appliance.documentNo.toLowerCase().includes(query) ||
        appliance.model.toLowerCase().includes(query) ||
        appliance.serialNo.toLowerCase().includes(query) ||
        (appliance.imeiNo ?? "").includes(query)
      );
    }
    return list;
  }, [scopedAppliances, category, search]);

  const getValue = (appliance: Appliance, key: SortKey) => {
    if (key === "document") return appliance.documentNo;
    if (key === "model") return appliance.model;
    if (key === "category") return appliance.category;
    if (key === "brand") return brandMap.get(appliance.brandId)?.name ?? "";
    if (key === "serial") return appliance.serialNo;
    return new Date(appliance.purchaseDate).getTime();
  };
  const { sorted: rows, sortKey, dir, toggle } = useSort<Appliance, SortKey>(filtered, getValue, "purchased", "desc");
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function submit() {
    if (!form.brandId || !form.model.trim() || !form.serialNo.trim() || !form.purchaseDate) return;
    const brand = brands.find((candidate) => candidate.id === form.brandId)!;
    const months = (Date.now() - new Date(form.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const appliance = addAppliance({
      ...form,
      imeiNo: form.imeiNo || undefined,
      isSmartConnected: false,
      warrantyStatus: months < brand.warrantyMonths ? "In Warranty" : "Out of Warranty",
    });
    setForm({ brandId: "", category: "AC", model: "", serialNo: "", imeiNo: "", purchaseDate: "" });
    setOpen(false);
    toast(`${appliance.documentNo} added to the product registry.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Product Registry</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{rows.length} independent product records; customer association is created on each service order.</p>
        </div>
        {canPerform(role, "create_appliance") && <Button onClick={() => setOpen(true)}>+ Add Product</Button>}
      </div>

      <Card className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input placeholder="Search product no., model, serial, IMEI..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-8" />
        </div>
        <div className="w-44">
          <Select value={category} onChange={(event) => { setCategory(event.target.value as ApplianceCategory | "all"); setPage(1); }}>
            <option value="all">All categories</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((appliance) => (
            <Link key={appliance.id} to={`/appliances/${appliance.id}`} className="block p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-ink-muted)]">{appliance.documentNo}</p>
                  <p className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{appliance.model}{appliance.isSmartConnected && <Wifi size={12} className="ml-1.5 inline text-[var(--color-status-good)]" />}</p>
                  <p className="mt-1 truncate text-xs text-[var(--color-ink-secondary)]">{brandMap.get(appliance.brandId)?.name ?? "Unknown brand"} | {appliance.category} | SN {appliance.serialNo}</p>
                </div>
                <Badge tone={appliance.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance.warrantyStatus}</Badge>
              </div>
              <p className="mt-3 text-right text-xs text-[var(--color-ink-muted)]">Purchased {formatDate(appliance.purchaseDate)}</p>
            </Link>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]">
                <SortableTh label="Product No." active={sortKey === "document"} direction={dir} onClick={() => toggle("document")} className="px-5 py-3" />
                <SortableTh label="Model" active={sortKey === "model"} direction={dir} onClick={() => toggle("model")} className="px-3 py-3" />
                <SortableTh label="Category" active={sortKey === "category"} direction={dir} onClick={() => toggle("category")} className="px-3 py-3" />
                <SortableTh label="Brand" active={sortKey === "brand"} direction={dir} onClick={() => toggle("brand")} className="px-3 py-3" />
                <SortableTh label="Serial No." active={sortKey === "serial"} direction={dir} onClick={() => toggle("serial")} className="px-3 py-3" />
                <SortableTh label="Purchased" active={sortKey === "purchased"} direction={dir} onClick={() => toggle("purchased")} className="px-3 py-3" />
                <th className="px-5 py-3 font-medium">Warranty</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((appliance) => (
                <tr key={appliance.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] [border-color:var(--color-border)]">
                  <td className="px-5 py-3 font-medium tabular-nums text-[var(--color-ink-secondary)]">{appliance.documentNo}</td>
                  <td className="px-3 py-3"><Link to={`/appliances/${appliance.id}`} className="font-medium text-[var(--color-brand-1)]">{appliance.model}</Link>{appliance.isSmartConnected && <Wifi size={12} className="ml-1.5 inline text-[var(--color-status-good)]" />}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{appliance.category}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{brandMap.get(appliance.brandId)?.name ?? "-"}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{appliance.serialNo}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-muted)]">{formatDate(appliance.purchaseDate)}</td>
                  <td className="px-5 py-3"><Badge tone={appliance.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance.warrantyStatus}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<PackageSearch size={18} />} title="No products found" subtitle="Try a different search or category filter." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Product">
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-ink-muted)]">Products are registered independently. Select the customer when creating the service order.</p>
          <Field label="Brand"><Select value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })}><option value="">Choose brand...</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</Select></Field>
          <Field label="Category"><Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ApplianceCategory })}>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Model"><Input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></Field>
          <Field label="Serial number"><Input value={form.serialNo} onChange={(event) => setForm({ ...form, serialNo: event.target.value })} /></Field>
          {form.category === "Mobile" && <Field label="IMEI"><Input value={form.imeiNo} onChange={(event) => setForm({ ...form, imeiNo: event.target.value })} /></Field>}
          <Field label="Purchase date"><Input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></Field>
          <Button className="w-full justify-center" onClick={submit}>Save Product</Button>
        </div>
      </Modal>
    </div>
  );
}
