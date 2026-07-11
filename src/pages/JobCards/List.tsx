import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, Button, Input, Select } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { filterByBranch } from "../../lib/selectors";
import { formatDate } from "../../lib/utils";
import type { JobStatus, JobType } from "../../lib/types";

const STATUSES: JobStatus[] = ["Received", "In Diagnosis", "Waiting Approval", "In Repair", "QA", "Ready", "Delivered"];

export default function JobCardList() {
  const { jobCards, customers, appliances, brands, technicians, selectedBranchId } = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [jobType, setJobType] = useState<JobType | "all">("all");
  const [techId, setTechId] = useState<string>("all");

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const appMap = useMemo(() => new Map(appliances.map((a) => [a.id, a])), [appliances]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const techMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const rows = useMemo(() => {
    let list = filterByBranch(jobCards, selectedBranchId);
    if (status !== "all") list = list.filter((j) => j.status === status);
    if (jobType !== "all") list = list.filter((j) => j.jobType === jobType);
    if (techId !== "all") list = list.filter((j) => j.technicianId === techId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) => {
        const cust = custMap.get(j.customerId);
        const app = appMap.get(j.applianceId);
        return (
          j.id.toLowerCase().includes(q) ||
          cust?.name.toLowerCase().includes(q) ||
          app?.model.toLowerCase().includes(q) ||
          app?.serialNo.toLowerCase().includes(q)
        );
      });
    }
    return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [jobCards, selectedBranchId, status, jobType, techId, search, custMap, appMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Job Cards</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{rows.length} job cards match your filters</p>
        </div>
        <Link to="/jobcards/new"><Button>+ New Job Card</Button></Link>
      </div>

      <Card className="flex flex-wrap gap-3 items-end" padded>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
            <Input placeholder="Search job ID, customer, appliance…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value as JobStatus | "all")}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="w-40">
          <Select value={jobType} onChange={(e) => setJobType(e.target.value as JobType | "all")}>
            <option value="all">All job types</option>
            <option value="warranty">Warranty</option>
            <option value="non_warranty">Non-Warranty</option>
          </Select>
        </div>
        <div className="w-44">
          <Select value={techId} onChange={(e) => setTechId(e.target.value)}>
            <option value="all">All technicians</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
              <th className="px-5 py-3 font-medium">Job ID</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Appliance</th>
              <th className="px-3 py-3 font-medium">Brand</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Technician</th>
              <th className="px-5 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => {
              const app = appMap.get(j.applianceId);
              return (
                <tr key={j.id} className="border-b last:border-0 [border-color:var(--color-border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <Link to={`/jobcards/${j.id}`} className="font-medium text-[var(--color-brand-1)]">{j.id}</Link>
                  </td>
                  <td className="px-3 py-3">{custMap.get(j.customerId)?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{app?.model ?? "—"}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{app ? brandMap.get(app.brandId)?.name : "—"}</td>
                  <td className="px-3 py-3"><JobTypeBadge jobType={j.jobType} /></td>
                  <td className="px-3 py-3"><JobStatusBadge status={j.status} /></td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{j.technicianId ? techMap.get(j.technicianId)?.name : "Unassigned"}</td>
                  <td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(j.createdAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">No job cards match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
