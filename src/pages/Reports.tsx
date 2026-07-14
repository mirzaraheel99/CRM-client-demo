import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CircleDollarSign, Clock3, Download, Gauge, Wrench } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Tabs, Button, Badge, Select } from "../components/ui";
import { DualLineChart, HorizontalBarChart, VerticalBarChart, DonutChart } from "../components/charts";
import { formatCurrency, formatDateTime, downloadCsv, tatHours, cx } from "../lib/utils";
import { filterByBranch } from "../lib/selectors";
import { PAYMENT_METHOD_LABELS } from "../lib/payments";
import { toast } from "../lib/toast";
import { stageRefPrefix } from "../lib/stageRefNo";
import { STAGE_NAME_AR, bi } from "../lib/domainAr";
import type { StageName } from "../lib/types";

const TABS = ["Job TAT", "Technician Performance", "Inventory Consumption", "Warranty Claims", "Revenue", "Workflow Stage Register"];
const TAB_LABELS: Record<string, string> = {
  "Job TAT": bi("Job TAT", "وقت إنجاز المهام"),
  "Technician Performance": bi("Technician Performance", "أداء الفنيين"),
  "Inventory Consumption": bi("Inventory Consumption", "استهلاك المخزون"),
  "Warranty Claims": bi("Warranty Claims", "مطالبات الضمان"),
  Revenue: bi("Revenue", "الإيرادات"),
  "Workflow Stage Register": bi("Workflow Stage Register", "سجل مراحل سير العمل"),
};
const RANGE_OPTIONS = [30, 90, 365];
const REGISTER_STAGES: StageName[] = ["Diagnosis", "Estimate", "Customer Approval", "Repair", "QA"];

function ReportKpi({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return (
    <Card className="flex min-h-28 flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ color: tone, background: `color-mix(in srgb, ${tone} 10%, transparent)` }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">{detail}</p>
      </div>
    </Card>
  );
}

export default function Reports() {
  const {
    jobCards, technicians, partsUsed, inventoryItems, customers, brands, appliances, payments, selectedBranchId, stageHistory,
  } = useStore();
  const [tab, setTab] = useState(TABS[0]);
  const [rangeDays, setRangeDays] = useState(90);
  const [registerStage, setRegisterStage] = useState<StageName>("Diagnosis");

  const scopedJobs = useMemo(() => filterByBranch(jobCards, selectedBranchId), [jobCards, selectedBranchId]);
  const filteredJobs = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    return scopedJobs.filter((job) => new Date(job.createdAt).getTime() >= cutoff);
  }, [scopedJobs, rangeDays]);
  const jobIds = useMemo(() => new Set(filteredJobs.map((job) => job.id)), [filteredJobs]);
  const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const applianceMap = useMemo(() => new Map(appliances.map((appliance) => [appliance.id, appliance])), [appliances]);
  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);

  const deliveredJobs = filteredJobs.filter((job) => job.status === "Delivered");
  const slaMet = deliveredJobs.filter((job) => tatHours(job.createdAt, job.updatedAt) <= 48).length;
  const slaRate = deliveredJobs.length ? Math.round((slaMet / deliveredJobs.length) * 100) : 0;

  const tatByBrand = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const job of deliveredJobs) {
      const appliance = applianceMap.get(job.applianceId);
      const name = brandMap.get(appliance?.brandId ?? "")?.name ?? "Unknown";
      const entry = map.get(name) ?? { total: 0, count: 0 };
      entry.total += tatHours(job.createdAt, job.updatedAt);
      entry.count += 1;
      map.set(name, entry);
    }
    return Array.from(map.entries())
      .map(([brand, value]) => ({ brand, avgHours: Math.round(value.total / value.count) }))
      .sort((a, b) => b.avgHours - a.avgHours);
  }, [deliveredJobs, applianceMap, brandMap]);

  const scopedTechnicians = useMemo(() => filterByBranch(technicians, selectedBranchId), [technicians, selectedBranchId]);
  const techPerf = useMemo(() => {
    return scopedTechnicians.map((technician) => {
      const jobs = filteredJobs.filter((job) => job.technicianId === technician.id);
      const delivered = jobs.filter((job) => job.status === "Delivered");
      const avgHours = delivered.length
        ? Math.round(delivered.reduce((sum, job) => sum + tatHours(job.createdAt, job.updatedAt), 0) / delivered.length)
        : 0;
      const onTime = delivered.filter((job) => tatHours(job.createdAt, job.updatedAt) <= 48).length;
      return {
        name: technician.name.split(" ")[0],
        jobs: jobs.length,
        delivered: delivered.length,
        avgHours,
        slaRate: delivered.length ? Math.round((onTime / delivered.length) * 100) : 0,
      };
    }).sort((a, b) => b.jobs - a.jobs);
  }, [scopedTechnicians, filteredJobs]);

  const consumption = useMemo(() => {
    const map = new Map<string, number>();
    for (const part of partsUsed) {
      if (!jobIds.has(part.jobcardId)) continue;
      map.set(part.itemId, (map.get(part.itemId) ?? 0) + part.qty);
    }
    return Array.from(map.entries())
      .map(([itemId, qty]) => {
        const item = inventoryItems.find((candidate) => candidate.id === itemId);
        return { item: item?.name ?? "Unknown", qty, cost: qty * (item?.unitPrice ?? 0) };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [partsUsed, jobIds, inventoryItems]);

  const scopedAppliances = useMemo(() => {
    if (selectedBranchId === "all") return appliances;
    const applianceIds = new Set(scopedJobs.map((job) => job.applianceId));
    return appliances.filter((appliance) => applianceIds.has(appliance.id));
  }, [appliances, scopedJobs, selectedBranchId]);
  const warrantyJobs = filteredJobs.filter((job) => job.jobType === "warranty");
  const warrantyByBrand = useMemo(() => {
    const claims = new Map<string, number>();
    const installed = new Map<string, number>();
    for (const appliance of scopedAppliances) {
      const name = brandMap.get(appliance.brandId)?.name ?? "Unknown";
      installed.set(name, (installed.get(name) ?? 0) + 1);
    }
    for (const job of warrantyJobs) {
      const appliance = applianceMap.get(job.applianceId);
      const name = brandMap.get(appliance?.brandId ?? "")?.name ?? "Unknown";
      claims.set(name, (claims.get(name) ?? 0) + 1);
    }
    return Array.from(claims.entries())
      .map(([brand, count]) => ({
        brand,
        claims: count,
        claimRate: Math.round((count / Math.max(1, installed.get(brand) ?? 0)) * 100),
      }))
      .sort((a, b) => b.claims - a.claims);
  }, [warrantyJobs, scopedAppliances, applianceMap, brandMap]);

  const revenueCutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const revenueJobs = scopedJobs.filter((job) => (
    job.jobType === "non_warranty"
    && job.finalAmount != null
    && new Date(job.updatedAt).getTime() >= revenueCutoff
  ));
  const revenueJobIds = new Set(revenueJobs.map((job) => job.id));
  const totalInvoiced = revenueJobs.reduce((sum, job) => sum + (job.finalAmount ?? 0), 0);
  const paidPayments = payments.filter((payment) => (
    payment.status === "paid"
    && revenueJobIds.has(payment.jobcardId)
    && new Date(payment.timestamp).getTime() >= revenueCutoff
  ));
  const totalCollected = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = Math.max(0, totalInvoiced - totalCollected);
  const collectionRate = totalInvoiced ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const revenueTrend = useMemo(() => {
    const map = new Map<string, { day: string; sort: number; invoiced: number; collected: number }>();
    const getEntry = (iso: string) => {
      const date = new Date(iso);
      const key = date.toISOString().slice(0, 10);
      const current = map.get(key) ?? {
        day: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
        sort: Date.parse(`${key}T00:00:00Z`),
        invoiced: 0,
        collected: 0,
      };
      map.set(key, current);
      return current;
    };
    for (const job of revenueJobs) getEntry(job.updatedAt).invoiced += job.finalAmount ?? 0;
    for (const payment of paidPayments) getEntry(payment.timestamp).collected += payment.amount;
    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [revenueJobs, paidPayments]);

  const registerEntries = useMemo(
    () =>
      stageHistory
        .filter((h) => h.stageName === registerStage && h.stageRefNo)
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)),
    [stageHistory, registerStage]
  );

  const paymentsByMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of paidPayments) {
      const label = PAYMENT_METHOD_LABELS[payment.method];
      map.set(label, (map.get(label) ?? 0) + payment.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [paidPayments]);

  function exportCsv() {
    if (tab === "Job TAT") downloadCsv("job-tat-report.csv", tatByBrand.map((row) => ({ Brand: row.brand, "Avg TAT (hrs)": row.avgHours })));
    if (tab === "Technician Performance") downloadCsv("technician-performance.csv", techPerf.map((row) => ({ Technician: row.name, Jobs: row.jobs, Delivered: row.delivered, "Avg TAT (hrs)": row.avgHours, "SLA Met (%)": row.slaRate })));
    if (tab === "Inventory Consumption") downloadCsv("inventory-consumption.csv", consumption.map((row) => ({ Item: row.item, "Qty Used": row.qty, "Consumption Value": row.cost })));
    if (tab === "Warranty Claims") downloadCsv("warranty-claims.csv", warrantyByBrand.map((row) => ({ Brand: row.brand, Claims: row.claims, "Claim Rate (%)": row.claimRate })));
    if (tab === "Revenue") downloadCsv("revenue-report.csv", revenueJobs.map((job) => ({ Job: job.documentNo, Invoice: job.invoiceNo, Customer: customerMap.get(job.customerId)?.name ?? "", Amount: job.finalAmount ?? 0 })));
    if (tab === "Workflow Stage Register")
      downloadCsv(
        `${registerStage.toLowerCase().replace(/\s+/g, "-")}-register.csv`,
        registerEntries.map((h) => ({ "Ref No.": h.stageRefNo ?? "", Job: h.jobcardId, "Changed By": h.changedBy, When: formatDateTime(h.timestamp), Notes: h.notes }))
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Reports", "التقارير")}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">Operational and financial reporting across the selected branch scope</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-[var(--color-surface-1)] p-0.5 [border-color:var(--color-border)]">
            <CalendarDays size={14} className="mx-2 text-[var(--color-ink-muted)]" />
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={cx(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  rangeDays === days ? "bg-[var(--color-ink-primary)] text-[var(--color-surface-1)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
                )}
              >
                {days === 365 ? "1Y" : `${days}D`}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { exportCsv(); toast(`${tab} report exported.`); }}><Download size={14} /> {bi("Export CSV", "تصدير CSV")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ReportKpi label={bi("Completed jobs", "المهام المكتملة")} value={String(deliveredJobs.length)} detail={`${filteredJobs.length} jobs in selected period`} icon={<Wrench size={16} />} tone="var(--color-series-1)" />
        <ReportKpi label={bi("SLA compliance", "الالتزام بمستوى الخدمة")} value={`${slaRate}%`} detail={`${slaMet} delivered within 48 hours`} icon={<Clock3 size={16} />} tone="var(--color-series-2)" />
        <ReportKpi label={bi("Invoiced revenue", "الإيرادات المفوترة")} value={formatCurrency(totalInvoiced)} detail={`${revenueJobs.length} non-warranty invoices`} icon={<CircleDollarSign size={16} />} tone="var(--color-series-3)" />
        <ReportKpi label={bi("Collection rate", "معدل التحصيل")} value={`${collectionRate}%`} detail={`${formatCurrency(outstanding)} outstanding`} icon={<Gauge size={16} />} tone="var(--color-series-5)" />
      </div>

      <Card padded={false}>
        <div className="px-4 pt-2"><Tabs tabs={TABS} active={tab} onChange={setTab} labels={TAB_LABELS} /></div>
        <div className="p-4">
          {tab === "Job TAT" && (
            <>
              <CardHeader title={bi("Average turnaround time by brand", "متوسط وقت الإنجاز حسب العلامة التجارية")} subtitle="Delivered jobs only; lower is better" />
              <HorizontalBarChart data={tatByBrand} dataKey="avgHours" categoryKey="brand" color="var(--color-series-1)" referenceValue={48} referenceLabel="48h SLA target" />
            </>
          )}

          {tab === "Technician Performance" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <CardHeader title={bi("Jobs handled", "المهام المنجزة")} subtitle="Throughput by assigned technician" />
                <VerticalBarChart data={techPerf} dataKey="jobs" categoryKey="name" color="var(--color-series-5)" />
              </div>
              <div className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 [border-color:var(--color-border)]">
                <CardHeader title={bi("Average turnaround time", "متوسط وقت الإنجاز")} subtitle="Delivered jobs; lower is better" />
                <HorizontalBarChart data={techPerf.filter((row) => row.avgHours > 0)} dataKey="avgHours" categoryKey="name" color="var(--color-series-1)" referenceValue={48} referenceLabel="48h SLA" />
              </div>
            </div>
          )}

          {tab === "Inventory Consumption" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <CardHeader title={bi("Top parts by units consumed", "أكثر القطع استهلاكاً")} subtitle="Issued against jobs in the selected period" />
                <HorizontalBarChart data={consumption} dataKey="qty" categoryKey="item" color="var(--color-series-8)" height={300} />
              </div>
              <div className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 [border-color:var(--color-border)]">
                <CardHeader title={bi("Consumption value", "قيمة الاستهلاك")} subtitle="Quantity used multiplied by current unit price" />
                <HorizontalBarChart data={[...consumption].sort((a, b) => b.cost - a.cost)} dataKey="cost" categoryKey="item" color="var(--color-series-3)" height={300} />
              </div>
            </div>
          )}

          {tab === "Warranty Claims" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <CardHeader title={bi("Warranty jobs by brand", "مهام الضمان حسب العلامة التجارية")} subtitle={`${warrantyJobs.length} warranty jobs in the selected period`} />
                <HorizontalBarChart data={warrantyByBrand} dataKey="claims" categoryKey="brand" color="var(--color-series-2)" />
              </div>
              <div className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 [border-color:var(--color-border)]">
                <CardHeader title={bi("Claim rate vs. installed base", "معدل المطالبات مقابل القاعدة المركبة")} subtitle="Warranty jobs per registered appliance" />
                <HorizontalBarChart data={warrantyByBrand} dataKey="claimRate" categoryKey="brand" color="var(--color-series-6)" />
              </div>
            </div>
          )}

          {tab === "Revenue" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
              <div>
                <CardHeader title={bi("Invoiced vs. collected revenue", "الإيرادات المفوترة مقابل المحصلة")} subtitle={`${formatCurrency(totalInvoiced)} invoiced · ${formatCurrency(totalCollected)} collected · ${formatCurrency(outstanding)} outstanding`} />
                {revenueTrend.length > 0 ? (
                  <DualLineChart
                    data={revenueTrend}
                    categoryKey="day"
                    primaryKey="invoiced"
                    secondaryKey="collected"
                    primaryName="Invoiced"
                    secondaryName="Collected"
                    primaryColor="var(--color-series-1)"
                    secondaryColor="var(--color-series-2)"
                    height={280}
                  />
                ) : (
                  <p className="py-16 text-center text-sm text-[var(--color-ink-muted)]">{bi("No revenue activity in this period.", "لا يوجد نشاط إيرادات في هذه الفترة.")}</p>
                )}
              </div>
              <div className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 [border-color:var(--color-border)]">
                <CardHeader title={bi("Collections by method", "التحصيلات حسب طريقة الدفع")} subtitle="Paid transactions only" />
                {paymentsByMethod.length > 0 ? (
                  <DonutChart data={paymentsByMethod} height={250} centerValue={formatCurrency(totalCollected)} centerLabel="Collected" />
                ) : (
                  <p className="py-16 text-center text-sm text-[var(--color-ink-muted)]">{bi("No payments recorded in this period.", "لا توجد مدفوعات مسجلة في هذه الفترة.")}</p>
                )}
              </div>
            </div>
          )}

          {tab === "Workflow Stage Register" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardHeader title={bi("Per-stage reference register", "سجل المراجع لكل مرحلة")} subtitle="Each stage below carries its own sequential number, independent of the invoice number" />
                <Select value={registerStage} onChange={(e) => setRegisterStage(e.target.value as StageName)} className="w-48">
                  {REGISTER_STAGES.map((s) => <option key={s} value={s}>{bi(s, STAGE_NAME_AR[s])} ({stageRefPrefix(s)})</option>)}
                </Select>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                    <th className="py-2 font-medium">{bi("Ref No.", "الرقم المرجعي")}</th>
                    <th className="py-2 font-medium">{bi("Job Card", "بطاقة العمل")}</th>
                    <th className="py-2 font-medium">{bi("Changed By", "تم التغيير بواسطة")}</th>
                    <th className="py-2 font-medium">{bi("When", "الوقت")}</th>
                    <th className="py-2 font-medium">{bi("Notes", "ملاحظات")}</th>
                  </tr>
                </thead>
                <tbody>
                  {registerEntries.map((h) => (
                    <tr key={h.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                      <td className="py-2.5"><Badge tone="brand">{h.stageRefNo}</Badge></td>
                      <td className="py-2.5 font-medium">{h.jobcardId}</td>
                      <td className="py-2.5 text-[var(--color-ink-secondary)]">{h.changedBy}</td>
                      <td className="py-2.5 text-[var(--color-ink-muted)]">{formatDateTime(h.timestamp)}</td>
                      <td className="py-2.5 text-[var(--color-ink-secondary)]">{h.notes}</td>
                    </tr>
                  ))}
                  {registerEntries.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-[var(--color-ink-muted)]">No {registerStage.toLowerCase()} entries recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
