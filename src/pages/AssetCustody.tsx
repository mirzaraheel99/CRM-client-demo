import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PackageCheck, Search, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Select, Input, Badge, EmptyState, Pagination, Button, StatTile, Tabs } from "../components/ui";
import { relativeTime, formatDateTime } from "../lib/utils";
import { toast } from "../lib/toast";
import { bi } from "../lib/domainAr";
import type { RemovedPart } from "../lib/types";

const PAGE_SIZE = 20;
const TAB_LIST = ["In Custody", "Removed Parts"];
const TAB_LABELS: Record<string, string> = {
  "In Custody": bi("In Custody", "في العهدة"),
  "Removed Parts": bi("Removed Parts", "القطع المُزالة"),
};

function showResult(action: Promise<{ ok: boolean; message: string }>) {
  action.then((outcome) => toast(outcome.message, outcome.ok ? "success" : "error"));
}

export default function AssetCustody() {
  const { removedParts, jobCards, customers, appliances, technicians, selectedBranchId, notifyCustomerOfRemovedPart, confirmPartReturned } = useStore();
  const [tab, setTab] = useState("In Custody");
  const [status, setStatus] = useState<RemovedPart["returnStatus"] | "all">("all");
  const [search, setSearch] = useState("");
  const [custodySearch, setCustodySearch] = useState("");
  const [page, setPage] = useState(1);
  const [custodyPage, setCustodyPage] = useState(1);

  const jobMap = useMemo(() => new Map(jobCards.map((job) => [job.id, job])), [jobCards]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const applianceMap = useMemo(() => new Map(appliances.map((a) => [a.id, a])), [appliances]);
  const technicianMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const removedPartsByJob = useMemo(() => {
    const map = new Map<string, RemovedPart[]>();
    for (const rp of removedParts) map.set(rp.jobcardId, [...(map.get(rp.jobcardId) ?? []), rp]);
    return map;
  }, [removedParts]);

  const jobsInCustody = useMemo(() => {
    let list = jobCards.filter((job) => job.assetReceivedRef && !job.assetHandedOver);
    if (selectedBranchId !== "all") list = list.filter((job) => job.branchId === selectedBranchId);
    if (custodySearch.trim()) {
      const q = custodySearch.toLowerCase();
      list = list.filter((job) => {
        const customer = customerMap.get(job.customerId);
        const appliance = applianceMap.get(job.applianceId);
        return (
          (job.assetReceivedRef ?? "").toLowerCase().includes(q) ||
          job.documentNo.toLowerCase().includes(q) ||
          (customer?.name ?? "").toLowerCase().includes(q) ||
          (appliance?.model ?? "").toLowerCase().includes(q) ||
          (appliance?.serialNo ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list.sort((a, b) => +new Date(a.assetReceivedAt ?? a.createdAt) - +new Date(b.assetReceivedAt ?? b.createdAt));
  }, [jobCards, selectedBranchId, custodySearch, customerMap, applianceMap]);

  const scoped = useMemo(() => {
    if (selectedBranchId === "all") return removedParts;
    return removedParts.filter((rp) => jobMap.get(rp.jobcardId)?.branchId === selectedBranchId);
  }, [removedParts, jobMap, selectedBranchId]);

  const rows = useMemo(() => {
    let list = scoped;
    if (status !== "all") list = list.filter((rp) => rp.returnStatus === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((rp) => {
        const job = jobMap.get(rp.jobcardId);
        const customer = job ? customerMap.get(job.customerId) : undefined;
        return (
          rp.description.toLowerCase().includes(q) ||
          (rp.serialNo ?? "").toLowerCase().includes(q) ||
          (job?.documentNo ?? "").toLowerCase().includes(q) ||
          (customer?.name ?? "").toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => +new Date(b.removedAt) - +new Date(a.removedAt));
  }, [scoped, status, search, jobMap, customerMap]);

  const pendingCount = scoped.filter((rp) => rp.returnStatus === "pending").length;
  const returnedCount = scoped.filter((rp) => rp.returnStatus === "returned_to_customer").length;
  const jobsInCustodyWithBlockers = jobsInCustody.filter((job) => (removedPartsByJob.get(job.id) ?? []).some((rp) => rp.returnStatus === "pending")).length;

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const currentCustodyPage = Math.min(custodyPage, Math.max(1, Math.ceil(jobsInCustody.length / PAGE_SIZE)));
  const pagedCustodyJobs = jobsInCustody.slice((currentCustodyPage - 1) * PAGE_SIZE, currentCustodyPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">{bi("Asset Custody", "عهدة الأصول")}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
          {bi(
            "Every physical unit and part currently in our custody, across every job — from receipt through handover, so nothing owed back to a customer gets lost.",
            "كل جهاز أو قطعة حالياً في عهدتنا، عبر جميع بطاقات العمل - من الاستلام حتى التسليم، حتى لا يُفقد أي شيء مستحق للعميل."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatTile label={bi("Units in custody", "أجهزة في العهدة")} value={String(jobsInCustody.length)} icon={<ShieldCheck size={16} />} accent="var(--color-brand-1)" />
        <StatTile label={bi("Blocked from handover", "محظورة من التسليم")} value={String(jobsInCustodyWithBlockers)} icon={<AlertTriangle size={16} />} accent="var(--color-status-serious)" />
        <StatTile label={bi("Parts pending return", "قطع بانتظار الإرجاع")} value={String(pendingCount)} icon={<PackageCheck size={16} />} accent="var(--color-status-warning)" />
        <StatTile label={bi("Parts returned", "قطع تم إرجاعها")} value={String(returnedCount)} icon={<CheckCircle2 size={16} />} accent="var(--color-status-good)" />
      </div>

      <Tabs tabs={TAB_LIST} active={tab} onChange={setTab} labels={TAB_LABELS} />

      {tab === "In Custody" && (
        <Card className="space-y-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
            <Input className="pl-8" placeholder={bi("Search by custody ref, job, customer, model, or serial...", "بحث بمرجع العهدة أو رقم البطاقة أو العميل أو الموديل أو الرقم التسلسلي...")} value={custodySearch} onChange={(e) => { setCustodySearch(e.target.value); setCustodyPage(1); }} />
          </div>

          <div className="space-y-2">
            {pagedCustodyJobs.map((job) => {
              const customer = customerMap.get(job.customerId);
              const appliance = applianceMap.get(job.applianceId);
              const technician = job.assetReceivedByTechnicianId ? technicianMap.get(job.assetReceivedByTechnicianId) : undefined;
              const partsPending = (removedPartsByJob.get(job.id) ?? []).filter((rp) => rp.returnStatus === "pending");
              return (
                <div key={job.id} className="rounded-lg border p-3 text-sm [border-color:var(--color-border)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        <Link to={`/jobcards/${job.id}`} className="text-[var(--color-brand-1)] hover:underline">{job.documentNo}</Link>
                        {customer ? ` · ${customer.name}` : ""}
                        {appliance ? ` · ${appliance.model}` : ""}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">
                        {bi("Ref", "المرجع")} <span className="font-medium text-[var(--color-ink-secondary)]">{job.assetReceivedRef}</span>
                        {" · "}{bi("Received by", "استُلم بواسطة")} {technician?.name ?? job.assetReceivedBy ?? "—"}
                        {job.assetReceivedAt && ` · ${relativeTime(job.assetReceivedAt)} (${formatDateTime(job.assetReceivedAt)})`}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{bi("Current stage", "المرحلة الحالية")}: {job.currentStage}</p>
                    </div>
                    {partsPending.length > 0 ? (
                      <Badge tone="critical">{bi(`${partsPending.length} part(s) pending`, `${partsPending.length} قطعة بانتظار`)}</Badge>
                    ) : (
                      <Badge tone="good">{bi("Clear for handover", "جاهز للتسليم")}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {jobsInCustody.length === 0 && <EmptyState icon={<ShieldCheck size={18} />} title={bi("Nothing currently in custody", "لا يوجد شيء في العهدة حالياً")} subtitle={bi("Units appear here once a receipt custody reference is recorded.", "تظهر الأجهزة هنا بمجرد تسجيل مرجع عهدة الاستلام.")} />}
          <Pagination page={currentCustodyPage} pageSize={PAGE_SIZE} total={jobsInCustody.length} onPageChange={setCustodyPage} />
        </Card>
      )}

      {tab === "Removed Parts" && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
              <Input className="pl-8" placeholder={bi("Search by description, serial, job, or customer...", "بحث بالوصف أو الرقم التسلسلي أو رقم البطاقة أو العميل...")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
              <option value="all">{bi("All statuses", "كل الحالات")}</option>
              <option value="pending">{bi("Pending", "قيد الانتظار")}</option>
              <option value="returned_to_customer">{bi("Returned to customer", "تم الإرجاع للعميل")}</option>
            </Select>
          </div>

          <div className="space-y-2">
            {pagedRows.map((rp) => {
              const job = jobMap.get(rp.jobcardId);
              const customer = job ? customerMap.get(job.customerId) : undefined;
              const appliance = job ? applianceMap.get(job.applianceId) : undefined;
              return (
                <div key={rp.id} className="rounded-lg border p-3 text-sm [border-color:var(--color-border)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{rp.description}</p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">
                        {rp.serialNo ? `Serial ${rp.serialNo} · ` : ""}
                        {job ? <Link to={`/jobcards/${job.id}`} className="text-[var(--color-brand-1)] hover:underline">{job.documentNo}</Link> : "—"}
                        {customer ? ` · ${customer.name}` : ""}
                        {appliance ? ` · ${appliance.model}` : ""}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                        {bi("Removed by", "أُزيلت بواسطة")} {rp.removedBy} · {relativeTime(rp.removedAt)} ({formatDateTime(rp.removedAt)})
                      </p>
                    </div>
                    <Badge tone={rp.returnStatus === "returned_to_customer" ? "good" : rp.customerNotifiedAt ? "warning" : "neutral"}>
                      {rp.returnStatus === "returned_to_customer" ? bi("Returned to customer", "تم الإرجاع للعميل") : rp.customerNotifiedAt ? bi("Customer notified", "تم إبلاغ العميل") : bi("Pending", "قيد الانتظار")}
                    </Badge>
                  </div>
                  {rp.returnStatus === "returned_to_customer" && rp.returnConfirmedAt && (
                    <p className="text-[11px] text-[var(--color-status-good)] mt-1">{bi("Confirmed by", "تم التأكيد بواسطة")} {rp.returnConfirmedBy} · {relativeTime(rp.returnConfirmedAt)}</p>
                  )}
                  {rp.returnStatus !== "returned_to_customer" && (
                    <div className="flex gap-2 mt-2">
                      {!rp.customerNotifiedAt && (
                        <Button size="sm" variant="secondary" onClick={() => showResult(notifyCustomerOfRemovedPart(rp.id))}>
                          {bi("Notify Customer", "إبلاغ العميل")}
                        </Button>
                      )}
                      <Button size="sm" onClick={() => showResult(confirmPartReturned(rp.id))}>
                        <CheckCircle2 size={13} /> {bi("Confirm Returned", "تأكيد الإرجاع")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {rows.length === 0 && <EmptyState icon={<PackageCheck size={18} />} title={bi("No removed parts found", "لم يتم العثور على قطع مُزالة")} subtitle={bi("Nothing matches this filter.", "لا يوجد ما يطابق هذا الفلتر.")} />}
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
