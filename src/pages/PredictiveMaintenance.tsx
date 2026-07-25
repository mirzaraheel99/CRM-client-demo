import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Radar, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { Badge, Button, Card, CardHeader, StatTile } from "../components/ui";
import { appliancesByBranch, filterByBranch, predictiveMaintenanceCandidates } from "../lib/selectors";
import { relativeTime } from "../lib/utils";
import { toast } from "../lib/toast";
import { bi } from "../lib/domainAr";

export default function PredictiveMaintenance() {
  const { appliances, jobCards, brands, customers, selectedBranchId, maintenanceRemindersSent, sendMaintenanceReminder } = useStore();
  const scopedAppliances = useMemo(() => appliancesByBranch(appliances, selectedBranchId), [appliances, selectedBranchId]);
  const scopedJobs = useMemo(() => filterByBranch(jobCards, selectedBranchId), [jobCards, selectedBranchId]);
  const candidates = useMemo(() => predictiveMaintenanceCandidates(scopedAppliances, scopedJobs, brands), [scopedAppliances, scopedJobs, brands]);
  const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const latestJobByAppliance = useMemo(() => {
    const map = new Map<string, (typeof jobCards)[number]>();
    for (const job of jobCards) {
      const current = map.get(job.applianceId);
      if (!current || new Date(job.createdAt) > new Date(current.createdAt)) map.set(job.applianceId, job);
    }
    return map;
  }, [jobCards]);

  const remindersSentCount = candidates.filter((candidate) => maintenanceRemindersSent[candidate.appliance.id]).length;
  const matchStrength = (score: number) => Math.round(50 + score * 50);

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <div className="flex items-center gap-2"><Sparkles size={18} className="text-[var(--color-brand-1)]" /><h1 className="text-xl font-semibold tracking-tight">{bi("Predictive Maintenance", "الصيانة التنبؤية")}</h1></div>
        <p className="mt-0.5 max-w-2xl text-sm text-[var(--color-ink-muted)]">Proactive service opportunities flagged from repair-history patterns across similar products. The reminder uses the customer from the product's latest service-order sequence.</p>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={bi("Flagged products", "منتجات مُرصودة")} value={String(candidates.length)} icon={<Radar size={16} />} accent="var(--color-brand-1)" />
        <StatTile label={bi("Reminders sent", "التذكيرات المُرسلة")} value={String(remindersSentCount)} icon={<CheckCircle2 size={16} />} accent="var(--color-status-good)" />
        <StatTile label={bi("Avg. match strength", "متوسط قوة التطابق")} value={candidates.length ? `${Math.round(candidates.reduce((sum, candidate) => sum + matchStrength(candidate.urgencyScore), 0) / candidates.length)}%` : "-"} icon={<Sparkles size={16} />} accent="var(--color-series-5)" />
      </div>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead><tr className="border-b text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><th className="px-5 py-3 font-medium">{bi("Product", "المنتج")}</th><th className="px-3 py-3 font-medium">{bi("Latest service customer", "آخر عميل خدمة")}</th><th className="px-3 py-3 font-medium">{bi("Current age", "العمر الحالي")}</th><th className="px-3 py-3 font-medium">{bi("Cohort avg. age at first repair", "متوسط عمر الفئة عند أول إصلاح")}</th><th className="px-3 py-3 font-medium">{bi("Confidence", "الثقة")}</th><th className="px-5 py-3 font-medium">{bi("Action", "الإجراء")}</th></tr></thead>
          <tbody>
            {candidates.map(({ appliance, ageMonths, cohortAvgMonths, cohortSize, urgencyScore }) => {
              const sent = maintenanceRemindersSent[appliance.id];
              const latestJob = latestJobByAppliance.get(appliance.id);
              const customer = latestJob ? customerMap.get(latestJob.customerId) : undefined;
              return (
                <tr key={appliance.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] [border-color:var(--color-border)]">
                  <td className="px-5 py-3"><Link to={`/appliances/${appliance.id}`} className="font-medium text-[var(--color-brand-1)]">{appliance.model}</Link><p className="text-xs text-[var(--color-ink-muted)]">{appliance.documentNo} | {brandMap.get(appliance.brandId)?.name} | {appliance.category}</p></td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer?.name ?? bi("No recent customer", "لا يوجد عميل حديث")}{customer && <p className="text-xs text-[var(--color-ink-muted)]">{customer.documentNo}</p>}</td>
                  <td className="px-3 py-3 tabular-nums">{ageMonths} mo</td>
                  <td className="px-3 py-3 tabular-nums text-[var(--color-ink-secondary)]">{cohortAvgMonths} mo <span className="text-[var(--color-ink-muted)]">(n={cohortSize})</span></td>
                  <td className="px-3 py-3"><Badge tone={urgencyScore > 0.66 ? "serious" : "warning"}>{matchStrength(urgencyScore)}%</Badge></td>
                  <td className="px-5 py-3">{sent ? <span className="flex items-center gap-1 text-xs text-[var(--color-status-good)]"><CheckCircle2 size={13} /> {bi("Reminded", "تم التذكير")} {relativeTime(sent)}</span> : <div className="flex items-center gap-2"><Button size="sm" variant="secondary" disabled={!customer} onClick={() => { const result = sendMaintenanceReminder(appliance.id); toast(result.message, result.ok ? "success" : "error"); }}>{bi("Send Reminder", "إرسال تذكير")}</Button>{customer && <Link to={`/jobcards/new?customerId=${customer.id}&applianceId=${appliance.id}`}><Button size="sm">{bi("Create Service Order", "إنشاء أمر خدمة")}</Button></Link>}</div>}</td>
                </tr>
              );
            })}
            {candidates.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--color-ink-muted)]">{bi("No predictive maintenance opportunities flagged right now.", "لا توجد فرص صيانة تنبؤية مرصودة حالياً.")}</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="max-w-2xl"><CardHeader title={bi("How this works", "كيف تعمل هذه الميزة")} /><p className="text-sm text-[var(--color-ink-secondary)]">For every brand and product category with enough completed repairs, VFix estimates the typical age at first service. Products approaching that window are flagged, while customer outreach is always routed through the most recent service relationship rather than permanent product ownership.</p></Card>
    </div>
  );
}
