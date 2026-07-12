import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pagination, SortableTh } from "../../components/ui";
import { filterByBranch } from "../../lib/selectors";
import { formatDate } from "../../lib/utils";
import { toast } from "../../lib/toast";
import { useSort } from "../../lib/useSort";
import { canPerform } from "../../lib/permissions";
import type { Customer } from "../../lib/types";

type SortKey = "document" | "name" | "phone" | "orders" | "jobs" | "since";
const PAGE_SIZE = 15;

export default function CustomerList() {
  const { customers, jobCards, serviceOrders, branches, selectedBranchId, role, addCustomer } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const defaultBranchId = selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId;
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "", branchId: defaultBranchId });
  const [page, setPage] = useState(1);

  const productCounts = useMemo(() => {
    const productSets = new Map<string, Set<string>>();
    for (const job of jobCards) {
      if (!productSets.has(job.customerId)) productSets.set(job.customerId, new Set());
      productSets.get(job.customerId)?.add(job.applianceId);
    }
    return new Map(Array.from(productSets, ([customerId, products]) => [customerId, products.size]));
  }, [jobCards]);
  const jobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobCards) counts.set(job.customerId, (counts.get(job.customerId) ?? 0) + 1);
    return counts;
  }, [jobCards]);
  const orderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of serviceOrders) counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
    return counts;
  }, [serviceOrders]);

  const filtered = useMemo(() => {
    let list = filterByBranch(customers, selectedBranchId);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((customer) => customer.documentNo.toLowerCase().includes(query) || customer.name.toLowerCase().includes(query) || customer.phone.includes(query) || customer.email.toLowerCase().includes(query));
    }
    return list;
  }, [customers, selectedBranchId, search]);

  const getValue = (customer: Customer, key: SortKey) => {
    if (key === "document") return customer.documentNo;
    if (key === "name") return customer.name;
    if (key === "phone") return customer.phone;
    if (key === "orders") return orderCounts.get(customer.id) ?? 0;
    if (key === "jobs") return jobCounts.get(customer.id) ?? 0;
    return new Date(customer.createdAt).getTime();
  };
  const { sorted: rows, sortKey, dir, toggle } = useSort<Customer, SortKey>(filtered, getValue, "since", "desc");
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    const existing = customers.find((customer) => customer.phone.replace(/\D/g, "") === form.phone.replace(/\D/g, ""));
    const saved = addCustomer(form);
    setForm({ name: "", phone: "", whatsapp: "", email: "", address: "", branchId: defaultBranchId });
    setOpen(false);
    toast(existing ? `${saved.documentNo} already uses this phone number; the existing customer was kept.` : `${saved.documentNo} added to customers.`, existing ? "info" : "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-rise-in">
        <div><h1 className="text-xl font-semibold tracking-tight">Customers</h1><p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{rows.length} customer records</p></div>
        {canPerform(role, "create_customer") && <Button onClick={() => { setForm((current) => ({ ...current, branchId: defaultBranchId })); setOpen(true); }}>+ Add Customer</Button>}
      </div>

      <Card><div className="relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" /><Input placeholder="Search customer no., name, phone, email..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-8" /></div></Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="block p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-[var(--color-ink-muted)]">{customer.documentNo}</p><p className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{customer.name}</p><p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{customer.phone}</p></div><Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? "Verified" : "Unverified"}</Badge></div>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)]"><span>{orderCounts.get(customer.id) ?? 0} orders | {productCounts.get(customer.id) ?? 0} products | {jobCounts.get(customer.id) ?? 0} lines</span><span>Since {formatDate(customer.createdAt)}</span></div>
            </Link>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[980px] text-sm">
            <thead><tr className="sticky top-0 z-10 border-b bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><SortableTh label="Customer No." active={sortKey === "document"} direction={dir} onClick={() => toggle("document")} className="px-5 py-3" /><SortableTh label="Name" active={sortKey === "name"} direction={dir} onClick={() => toggle("name")} className="px-3 py-3" /><SortableTh label="Phone" active={sortKey === "phone"} direction={dir} onClick={() => toggle("phone")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">WhatsApp</th><th className="px-3 py-3 font-medium">Email</th><SortableTh label="Orders" active={sortKey === "orders"} direction={dir} onClick={() => toggle("orders")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">Products</th><SortableTh label="Job lines" active={sortKey === "jobs"} direction={dir} onClick={() => toggle("jobs")} className="px-3 py-3" /><SortableTh label="Since" active={sortKey === "since"} direction={dir} onClick={() => toggle("since")} className="px-5 py-3" /></tr></thead>
            <tbody>
              {pagedRows.map((customer) => <tr key={customer.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] [border-color:var(--color-border)]"><td className="px-5 py-3 text-[var(--color-ink-secondary)]">{customer.documentNo}</td><td className="px-3 py-3"><Link to={`/customers/${customer.id}`} className="font-medium text-[var(--color-brand-1)]">{customer.name}</Link></td><td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer.phone}</td><td className="px-3 py-3"><Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? "Verified" : "Unverified"}</Badge></td><td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer.email}</td><td className="px-3 py-3 tabular-nums">{orderCounts.get(customer.id) ?? 0}</td><td className="px-3 py-3 tabular-nums">{productCounts.get(customer.id) ?? 0}</td><td className="px-3 py-3 tabular-nums">{jobCounts.get(customer.id) ?? 0}</td><td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(customer.createdAt)}</td></tr>)}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<Users size={18} />} title="No customers found" subtitle="Try a different search term." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Customer">
        <div className="space-y-3"><Field label="Full name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field><Field label="WhatsApp"><Input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></Field><Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Address"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field><Field label="Branch"><select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)]">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field><Button className="w-full justify-center" onClick={submit}>Save Customer</Button></div>
      </Modal>
    </div>
  );
}
