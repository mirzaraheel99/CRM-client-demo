import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, Button, Input, Modal, Field, Badge, EmptyState, SortableTh, Pagination } from "../../components/ui";
import { filterByBranch } from "../../lib/selectors";
import { formatDate } from "../../lib/utils";
import { toast } from "../../lib/toast";
import { useSort } from "../../lib/useSort";
import type { Customer } from "../../lib/types";

type SortKey = "name" | "phone" | "appliances" | "jobs" | "since";
const PAGE_SIZE = 15;

export default function CustomerList() {
  const { customers, appliances, jobCards, selectedBranchId, addCustomer } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "" });
  const [page, setPage] = useState(1);

  const applianceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const appliance of appliances) counts.set(appliance.customerId, (counts.get(appliance.customerId) ?? 0) + 1);
    return counts;
  }, [appliances]);
  const jobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobCards) counts.set(job.customerId, (counts.get(job.customerId) ?? 0) + 1);
    return counts;
  }, [jobCards]);

  const filtered = useMemo(() => {
    let list = filterByBranch(customers, selectedBranchId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
    }
    return list;
  }, [customers, selectedBranchId, search]);

  const getValue = (c: Customer, key: SortKey) => {
    if (key === "name") return c.name;
    if (key === "phone") return c.phone;
    if (key === "appliances") return applianceCounts.get(c.id) ?? 0;
    if (key === "jobs") return jobCounts.get(c.id) ?? 0;
    return new Date(c.createdAt).getTime();
  };
  const { sorted: rows, sortKey, dir, toggle } = useSort<Customer, SortKey>(filtered, getValue, "since", "desc");
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    const branchId = selectedBranchId === "all" ? "br-1" : selectedBranchId;
    addCustomer({ ...form, branchId });
    setForm({ name: "", phone: "", whatsapp: "", email: "", address: "" });
    setOpen(false);
    toast(`${form.name} added to customers.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{rows.length} customers</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Customer</Button>
      </div>

      <Card>
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input placeholder="Search name, phone, email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
      </Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="block p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{customer.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{customer.phone}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">{customer.email || "No email address"}</p>
                </div>
                <Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? "Verified" : "Unverified"}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                <span>{applianceCounts.get(customer.id) ?? 0} appliances · {jobCounts.get(customer.id) ?? 0} jobs</span>
                <span className="tabular-nums">Since {formatDate(customer.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="sticky top-0 z-10 bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                <SortableTh label="Name" active={sortKey === "name"} direction={dir} onClick={() => toggle("name")} className="px-5 py-3" />
                <SortableTh label="Phone" active={sortKey === "phone"} direction={dir} onClick={() => toggle("phone")} className="px-3 py-3" />
                <th className="px-3 py-3 font-medium">WhatsApp</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <SortableTh label="Appliances" active={sortKey === "appliances"} direction={dir} onClick={() => toggle("appliances")} className="px-3 py-3" />
                <SortableTh label="Jobs" active={sortKey === "jobs"} direction={dir} onClick={() => toggle("jobs")} className="px-3 py-3" />
                <SortableTh label="Since" active={sortKey === "since"} direction={dir} onClick={() => toggle("since")} className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((c) => (
                <tr key={c.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <Link to={`/customers/${c.id}`} className="font-medium text-[var(--color-brand-1)] hover:text-[var(--color-brand-2)] transition-colors">{c.name}</Link>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{c.phone}</td>
                  <td className="px-3 py-3">
                    <Badge tone={c.whatsappVerified ? "good" : "warning"}>{c.whatsappVerified ? "Verified" : "Unverified"}</Badge>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{c.email}</td>
                  <td className="px-3 py-3 tabular-nums">{applianceCounts.get(c.id) ?? 0}</td>
                  <td className="px-3 py-3 tabular-nums">{jobCounts.get(c.id) ?? 0}</td>
                  <td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<Users size={18} />} title="No customers found" subtitle="Try a different search term." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Customer">
        <div className="space-y-3">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Button className="w-full justify-center" onClick={submit}>Save Customer</Button>
        </div>
      </Modal>
    </div>
  );
}
