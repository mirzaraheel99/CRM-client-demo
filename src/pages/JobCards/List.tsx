import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useStore } from "../../lib/store";
import { toast } from "../../lib/toast";
import { Button, Card, Input, Pagination, Select, SortableTh } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { filterByBranch } from "../../lib/selectors";
import { formatDate, formatSequence } from "../../lib/utils";
import { useSort } from "../../lib/useSort";
import { canPerform } from "../../lib/permissions";
import type { JobCard, JobStatus, JobType } from "../../lib/types";

const STATUSES: JobStatus[] = ["Received", "In Diagnosis", "Waiting Approval", "In Repair", "QA", "Ready", "Delivered"];
const PAGE_SIZE = 15;
type SortKey = "id" | "customer" | "appliance" | "status" | "technician" | "created";

export default function JobCardList() {
  const { jobCards, serviceOrders, customers, appliances, brands, technicians, selectedBranchId, role, assignTechnician } = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [jobType, setJobType] = useState<JobType | "all">("all");
  const [techId, setTechId] = useState("all");
  const [page, setPage] = useState(1);

  const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const applianceMap = useMemo(() => new Map(appliances.map((appliance) => [appliance.id, appliance])), [appliances]);
  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const technicianMap = useMemo(() => new Map(technicians.map((technician) => [technician.id, technician])), [technicians]);
  const orderMap = useMemo(() => new Map(serviceOrders.map((order) => [order.id, order])), [serviceOrders]);
  const scopedTechnicians = useMemo(() => filterByBranch(technicians, selectedBranchId), [technicians, selectedBranchId]);

  const filtered = useMemo(() => {
    let list = filterByBranch(jobCards, selectedBranchId);
    if (status !== "all") list = list.filter((job) => job.status === status);
    if (jobType !== "all") list = list.filter((job) => job.jobType === jobType);
    if (techId !== "all") list = list.filter((job) => job.technicianId === techId);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((job) => {
        const customer = customerMap.get(job.customerId);
        const appliance = applianceMap.get(job.applianceId);
        const order = orderMap.get(job.serviceOrderId);
        return job.documentNo.toLowerCase().includes(query) || job.invoiceNo.toLowerCase().includes(query) || order?.documentNo.toLowerCase().includes(query) || customer?.documentNo.toLowerCase().includes(query) || customer?.name.toLowerCase().includes(query) || customer?.phone.includes(query) || appliance?.documentNo.toLowerCase().includes(query) || appliance?.model.toLowerCase().includes(query) || appliance?.serialNo.toLowerCase().includes(query);
      });
    }
    return list;
  }, [jobCards, selectedBranchId, status, jobType, techId, search, customerMap, applianceMap, orderMap]);

  const getValue = (job: JobCard, key: SortKey) => {
    if (key === "id") return job.documentNo;
    if (key === "customer") return customerMap.get(job.customerId)?.name ?? "";
    if (key === "appliance") return applianceMap.get(job.applianceId)?.model ?? "";
    if (key === "status") return job.status;
    if (key === "technician") return job.technicianId ? technicianMap.get(job.technicianId)?.name ?? "" : "";
    return new Date(job.createdAt).getTime();
  };
  const { sorted: rows, sortKey, dir, toggle } = useSort<JobCard, SortKey>(filtered, getValue, "created", "desc");
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const canAssign = canPerform(role, "assign_technician");

  const eligibleTechniciansFor = (job: JobCard) => {
    const appliance = applianceMap.get(job.applianceId);
    return technicians.filter((technician) => (
      technician.branchId === job.branchId &&
      technician.status !== "Off Duty" &&
      (!appliance || technician.skills.includes(appliance.category))
    ));
  };

  const handleAssign = (job: JobCard, technicianId: string) => {
    if (!technicianId || technicianId === job.technicianId) return;
    const result = assignTechnician(job.id, technicianId);
    toast(result.message, result.ok ? "success" : "error");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-rise-in">
        <div><h1 className="text-xl font-semibold tracking-tight">Service Order Lines</h1><p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{rows.length} sequenced product jobs match your filters</p></div>
        {canPerform(role, "create_job") && <Link to="/jobcards/new"><Button>+ New Service Order</Button></Link>}
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" /><Input placeholder="Search order, line, invoice, customer phone, product..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-8" /></div></div>
        <div className="w-40"><Select value={status} onChange={(event) => { setStatus(event.target.value as JobStatus | "all"); setPage(1); }}><option value="all">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
        <div className="w-40"><Select value={jobType} onChange={(event) => { setJobType(event.target.value as JobType | "all"); setPage(1); }}><option value="all">All job types</option><option value="warranty">Warranty</option><option value="non_warranty">Non-Warranty</option></Select></div>
        <div className="w-44"><Select value={techId} onChange={(event) => { setTechId(event.target.value); setPage(1); }}><option value="all">All technicians</option>{scopedTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</Select></div>
      </Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((job) => {
            const customer = customerMap.get(job.customerId);
            const appliance = applianceMap.get(job.applianceId);
            const eligibleTechnicians = eligibleTechniciansFor(job);
            return (
              <div key={job.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/jobcards/${job.id}`} className="text-sm font-semibold text-[var(--color-brand-1)] hover:underline">{job.documentNo}</Link>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Sequence {formatSequence(job.sequenceNo)} | {job.invoiceNo}</p>
                    <p className="mt-2 truncate text-sm font-medium">
                      {customer ? <Link to={`/customers/${customer.id}`} className="hover:text-[var(--color-brand-1)] hover:underline">{customer.name}</Link> : "Unknown customer"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-ink-muted)]">{appliance?.model ?? "Unknown product"} | {appliance?.documentNo}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5"><JobStatusBadge status={job.status} /><JobTypeBadge jobType={job.jobType} /></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--color-ink-muted)]">
                  <span>{formatDate(job.createdAt)}</span>
                  <Link to={`/jobcards/${job.id}`} className="font-medium text-[var(--color-brand-1)] hover:underline">Open job</Link>
                </div>
                <div className="mt-3">
                  <Select value={job.technicianId ?? ""} disabled={!canAssign || job.status === "Delivered"} onChange={(event) => handleAssign(job, event.target.value)}>
                    <option value="">Assign technician...</option>
                    {eligibleTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[1120px] text-sm">
            <thead><tr className="sticky top-0 z-10 border-b bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><SortableTh label="Service order / line" active={sortKey === "id"} direction={dir} onClick={() => toggle("id")} className="px-5 py-3" /><SortableTh label="Customer" active={sortKey === "customer"} direction={dir} onClick={() => toggle("customer")} className="px-3 py-3" /><SortableTh label="Product" active={sortKey === "appliance"} direction={dir} onClick={() => toggle("appliance")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">Invoice No.</th><th className="px-3 py-3 font-medium">Type</th><SortableTh label="Status" active={sortKey === "status"} direction={dir} onClick={() => toggle("status")} className="px-3 py-3" /><SortableTh label="Technician" active={sortKey === "technician"} direction={dir} onClick={() => toggle("technician")} className="px-3 py-3" /><SortableTh label="Job date" active={sortKey === "created"} direction={dir} onClick={() => toggle("created")} className="px-5 py-3" /></tr></thead>
            <tbody>
              {pagedRows.map((job) => {
                const appliance = applianceMap.get(job.applianceId);
                const customer = customerMap.get(job.customerId);
                const eligibleTechnicians = eligibleTechniciansFor(job);
                return (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] [border-color:var(--color-border)]">
                    <td className="px-5 py-3"><Link to={`/jobcards/${job.id}`} className="font-medium text-[var(--color-brand-1)] hover:underline">{job.documentNo}</Link><p className="text-xs text-[var(--color-ink-muted)]">Sequence {formatSequence(job.sequenceNo)}</p></td>
                    <td className="px-3 py-3">
                      {customer ? <Link to={`/customers/${customer.id}`} className="font-medium hover:text-[var(--color-brand-1)] hover:underline">{customer.name}</Link> : "-"}
                      <p className="text-xs text-[var(--color-ink-muted)]">{customer?.documentNo}</p>
                    </td>
                    <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{appliance?.model ?? "-"}<p className="text-xs text-[var(--color-ink-muted)]">{brandMap.get(appliance?.brandId ?? "")?.name} | {appliance?.documentNo}</p></td>
                    <td className="px-3 py-3 text-xs text-[var(--color-ink-secondary)]">{job.invoiceNo}</td>
                    <td className="px-3 py-3"><JobTypeBadge jobType={job.jobType} /></td>
                    <td className="px-3 py-3"><JobStatusBadge status={job.status} /></td>
                    <td className="px-3 py-3">
                      <Select value={job.technicianId ?? ""} disabled={!canAssign || job.status === "Delivered"} onChange={(event) => handleAssign(job, event.target.value)}>
                        <option value="">Assign technician...</option>
                        {eligibleTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
                      </Select>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(job.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">No job lines match your filters.</p>}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
