import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Tabs, Button } from "../components/ui";
import { HorizontalBarChart, VerticalBarChart, TrendAreaChart, DonutChart } from "../components/charts";
import { formatCurrency, downloadCsv, tatHours } from "../lib/utils";
import { tatTrend } from "../lib/selectors";
import { PAYMENT_METHOD_LABELS } from "../lib/payments";
import { toast } from "../lib/toast";

const TABS = ["Job TAT", "Technician Performance", "Inventory Consumption", "Warranty Claims", "Revenue"];

export default function Reports() {
  const { jobCards, technicians, partsUsed, inventoryItems, customers, brands, appliances, payments } = useStore();
  const [tab, setTab] = useState(TABS[0]);

  const tatByBrand = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const j of jobCards.filter((j) => j.status === "Delivered")) {
      const appliance = appliances.find((a) => a.id === j.applianceId);
      const brand = brands.find((b) => b.id === appliance?.brandId);
      const name = brand?.name ?? "Unknown";
      const entry = map.get(name) ?? { total: 0, count: 0 };
      entry.total += tatHours(j.createdAt, j.updatedAt);
      entry.count += 1;
      map.set(name, entry);
    }
    return Array.from(map.entries()).map(([brand, v]) => ({ brand, avgHours: Math.round(v.total / v.count) })).sort((a, b) => b.avgHours - a.avgHours);
  }, [jobCards, appliances, brands]);

  const techPerf = useMemo(() => {
    return technicians.map((t) => {
      const jobs = jobCards.filter((j) => j.technicianId === t.id);
      const delivered = jobs.filter((j) => j.status === "Delivered");
      const avgHours = delivered.length ? Math.round(delivered.reduce((acc, j) => acc + tatHours(j.createdAt, j.updatedAt), 0) / delivered.length) : 0;
      return { name: t.name.split(" ")[0], jobs: jobs.length, delivered: delivered.length, avgHours };
    }).sort((a, b) => b.jobs - a.jobs);
  }, [technicians, jobCards]);

  const consumption = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of partsUsed) map.set(p.itemId, (map.get(p.itemId) ?? 0) + p.qty);
    return Array.from(map.entries())
      .map(([itemId, qty]) => ({ item: inventoryItems.find((i) => i.id === itemId)?.name ?? "Unknown", qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [partsUsed, inventoryItems]);

  const warrantyJobs = jobCards.filter((j) => j.jobType === "warranty");
  const warrantyByBrand = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of warrantyJobs) {
      const appliance = appliances.find((a) => a.id === j.applianceId);
      const brand = brands.find((b) => b.id === appliance?.brandId);
      const name = brand?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([brand, claims]) => ({ brand, claims })).sort((a, b) => b.claims - a.claims);
  }, [warrantyJobs, appliances, brands]);

  const revenueJobs = jobCards.filter((j) => j.jobType === "non_warranty" && j.finalAmount);
  const totalRevenue = revenueJobs.reduce((acc, j) => acc + (j.finalAmount ?? 0), 0);
  const revenueTrend = tatTrend(jobCards).map((d) => ({ day: d.day, avgHours: d.avgHours }));

  const paidPayments = payments.filter((p) => p.status === "paid");
  const totalCollected = paidPayments.reduce((acc, p) => acc + p.amount, 0);
  const paymentsByMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of paidPayments) map.set(PAYMENT_METHOD_LABELS[p.method], (map.get(PAYMENT_METHOD_LABELS[p.method]) ?? 0) + p.amount);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [paidPayments]);

  function exportCsv() {
    if (tab === "Job TAT") downloadCsv("job-tat-report.csv", tatByBrand.map((r) => ({ Brand: r.brand, "Avg TAT (hrs)": r.avgHours })));
    if (tab === "Technician Performance") downloadCsv("technician-performance.csv", techPerf.map((r) => ({ Technician: r.name, Jobs: r.jobs, Delivered: r.delivered, "Avg TAT (hrs)": r.avgHours })));
    if (tab === "Inventory Consumption") downloadCsv("inventory-consumption.csv", consumption.map((r) => ({ Item: r.item, "Qty Used": r.qty })));
    if (tab === "Warranty Claims") downloadCsv("warranty-claims.csv", warrantyByBrand.map((r) => ({ Brand: r.brand, Claims: r.claims })));
    if (tab === "Revenue") downloadCsv("revenue-report.csv", revenueJobs.map((j) => ({ Job: j.id, Customer: customers.find((c) => c.id === j.customerId)?.name ?? "", Amount: j.finalAmount ?? 0 })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Operational and financial reporting across branches</p>
        </div>
        <Button variant="secondary" onClick={() => { exportCsv(); toast(`${tab} report exported.`); }}><Download size={14} /> Export CSV</Button>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
        <div className="p-5">
          {tab === "Job TAT" && (
            <>
              <CardHeader title="Average turnaround time by brand" subtitle="Delivered jobs only, hours from receipt to handover" />
              <HorizontalBarChart data={tatByBrand} dataKey="avgHours" categoryKey="brand" color="var(--color-series-1)" />
            </>
          )}
          {tab === "Technician Performance" && (
            <>
              <CardHeader title="Jobs handled per technician" />
              <VerticalBarChart data={techPerf} dataKey="jobs" categoryKey="name" color="var(--color-series-5)" />
            </>
          )}
          {tab === "Inventory Consumption" && (
            <>
              <CardHeader title="Top consumed spare parts" />
              <HorizontalBarChart data={consumption} dataKey="qty" categoryKey="item" color="var(--color-series-8)" height={300} />
            </>
          )}
          {tab === "Warranty Claims" && (
            <>
              <CardHeader title="Warranty claims by brand" subtitle={`${warrantyJobs.length} total warranty jobs`} />
              <HorizontalBarChart data={warrantyByBrand} dataKey="claims" categoryKey="brand" color="var(--color-series-2)" />
            </>
          )}
          {tab === "Revenue" && (
            <div className="space-y-6">
              <div>
                <CardHeader title="Non-warranty revenue" subtitle={`Invoiced: ${formatCurrency(totalRevenue)} · Collected: ${formatCurrency(totalCollected)}`} />
                <TrendAreaChart data={revenueTrend} dataKey="avgHours" categoryKey="day" color="var(--color-series-3)" />
                <p className="text-xs text-[var(--color-ink-muted)] mt-2">Chart shows daily average TAT as a proxy trend; export CSV for the full per-job revenue ledger.</p>
              </div>
              <div className="border-t pt-6 [border-color:var(--color-border)]">
                <CardHeader title="Payments collected by method" subtitle="mada, STC Pay, Apple Pay, and BNPL (Tabby/Tamara) split" />
                {paymentsByMethod.length > 0 ? (
                  <DonutChart data={paymentsByMethod} height={260} centerValue={formatCurrency(totalCollected)} centerLabel="Collected" />
                ) : (
                  <p className="text-sm text-[var(--color-ink-muted)]">No payments recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
