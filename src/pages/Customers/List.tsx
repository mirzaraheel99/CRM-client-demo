import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, Button, Input, Modal, Field, Badge } from "../../components/ui";
import { filterByBranch } from "../../lib/selectors";
import { formatDate } from "../../lib/utils";

export default function CustomerList() {
  const { customers, appliances, jobCards, selectedBranchId, addCustomer } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "" });

  const rows = useMemo(() => {
    let list = filterByBranch(customers, selectedBranchId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
    }
    return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [customers, selectedBranchId, search]);

  function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    const branchId = selectedBranchId === "all" ? "br-1" : selectedBranchId;
    addCustomer({ ...form, branchId });
    setForm({ name: "", phone: "", whatsapp: "", email: "", address: "" });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{rows.length} customers</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Customer</Button>
      </div>

      <Card>
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input placeholder="Search name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">WhatsApp</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Appliances</th>
              <th className="px-3 py-3 font-medium">Jobs</th>
              <th className="px-5 py-3 font-medium">Since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b last:border-0 [border-color:var(--color-border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-5 py-3">
                  <Link to={`/customers/${c.id}`} className="font-medium text-[var(--color-brand-1)]">{c.name}</Link>
                </td>
                <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{c.phone}</td>
                <td className="px-3 py-3">
                  <Badge tone={c.whatsappVerified ? "good" : "warning"}>{c.whatsappVerified ? "Verified" : "Unverified"}</Badge>
                </td>
                <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{c.email}</td>
                <td className="px-3 py-3 tabular-nums">{appliances.filter((a) => a.customerId === c.id).length}</td>
                <td className="px-3 py-3 tabular-nums">{jobCards.filter((j) => j.customerId === c.id).length}</td>
                <td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
