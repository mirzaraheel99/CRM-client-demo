import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock, ShieldCheck, PackageX, Users, Sparkles, ArrowRight, PackageCheck, AlertTriangle } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, StatTile, Button, EmptyState, LiveIndicator } from "../components/ui";
import { HorizontalBarChart, VerticalBarChart, DonutChart, ComboChart, Sparkline } from "../components/charts";
import { JobStatusBadge } from "../components/StatusBadge";
import {
  appliancesByBranch, filterByBranch, jobsByStatus, technicianWorkload, warrantyRatio, inventoryAlerts, avgTat,
  predictiveMaintenanceCandidates, jobVolumeAndTat, activeJobsTrend, warrantyShareTrend, weekComparison, unassignedActiveJobs,
} from "../lib/selectors";
import { formatDate, cx } from "../lib/utils";
import { t } from "../lib/i18n";
import { canPerform } from "../lib/permissions";

export default function Dashboard() {
  const {
    jobCards, technicians, customers, appliances, brands, inventoryItems, inventoryLocations, inventoryStock,
    selectedBranchId, lang, role,
  } = useStore();

  const scopedJobs = filterByBranch(jobCards, selectedBranchId);
  const scopedTechs = filterByBranch(technicians, selectedBranchId);
  const scopedAppliances = appliancesByBranch(appliances, customers, selectedBranchId);
  const activeJobs = scopedJobs.filter((j) => j.status !== "Delivered");
  const alerts = inventoryAlerts(inventoryItems, inventoryLocations, inventoryStock, selectedBranchId);
  const maintenanceCandidates = predictiveMaintenanceCandidates(scopedAppliances, scopedJobs, brands);
  const riskyJobs = unassignedActiveJobs(scopedJobs);
  const custMap = new Map(customers.map((c) => [c.id, c]));
  const appMap = new Map(appliances.map((a) => [a.id, a]));
  const techMap = new Map(technicians.map((tc) => [tc.id, tc]));

  const latest = [...scopedJobs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
  const warrantyPct = scopedJobs.length ? Math.round((scopedJobs.filter((j) => j.jobType === "warranty").length / scopedJobs.length) * 100) : 0;
  const availableTechs = scopedTechs.filter((tc) => tc.status === "Available").length;

  const [rangeDays, setRangeDays] = useState(14);
  const sparkData = (arr: number[]) => arr.map((v, i) => ({ i, v }));
  const volumeTrend = jobVolumeAndTat(scopedJobs, rangeDays);
  const wow = weekComparison(scopedJobs);

  function pctDelta(now: number, prev: number) {
    if (prev === 0) return now === 0 ? null : { text: "New this week", tone: "neutral" as const };
    const pct = Math.round(((now - prev) / prev) * 100);
    if (pct === 0) return { text: "Flat vs last wk", tone: "neutral" as const };
    return { text: `${pct > 0 ? "+" : ""}${pct}% vs last wk`, tone: "neutral" as const };
  }
  const activeDelta = pctDelta(wow.activeJobsNow, wow.activeJobsWeekAgo);
  const tatDeltaPts = wow.avgTatLastWeek === 0 ? null : wow.avgTatThisWeek - wow.avgTatLastWeek;
  const tatDelta = tatDeltaPts == null ? null : {
    text: `${tatDeltaPts > 0 ? "+" : ""}${tatDeltaPts}h vs last wk`,
    tone: tatDeltaPts <= 0 ? ("good" as const) : ("critical" as const),
  };
  const warrantyDeltaPts = wow.warrantyPctThisWeek - wow.warrantyPctLastWeek;
  const warrantyDelta = wow.warrantyPctLastWeek === 0 && wow.warrantyPctThisWeek === 0 ? null : {
    text: `${warrantyDeltaPts > 0 ? "+" : ""}${warrantyDeltaPts}pts vs last wk`,
    tone: "neutral" as const,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{t(lang, "welcomeBack")}</h1>
            <LiveIndicator />
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{t(lang, "overviewToday")}</p>
        </div>
        {canPerform(role, "create_job") && <Link to="/jobcards/new">
          <Button>+ {t(lang, "newJobCard")}</Button>
        </Link>}
      </div>

      {(maintenanceCandidates.length > 0 || riskyJobs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {maintenanceCandidates.length > 0 && (
            <Link to="/predictive-maintenance" className="block animate-rise-in" style={{ animationDelay: "40ms" }}>
              <Card interactive className="h-full !p-3.5 !bg-[var(--color-brand-1)]/[0.05] hover:!bg-[var(--color-brand-1)]/[0.08]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={18} className="text-[var(--color-brand-1)] shrink-0" />
                    <p className="text-sm">
                      <span className="font-semibold">{maintenanceCandidates.length} predictive maintenance opportunities</span>
                      <span className="text-[var(--color-ink-muted)]"> flagged from repair-history patterns.</span>
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-brand-1)] flex items-center gap-1 shrink-0">View <ArrowRight size={13} /></span>
                </div>
              </Card>
            </Link>
          )}
          {riskyJobs.length > 0 && (
            <Link to="/jobcards" className="block animate-rise-in" style={{ animationDelay: "80ms" }}>
              <Card interactive className="h-full !p-3.5 !bg-[var(--color-status-serious)]/[0.06] hover:!bg-[var(--color-status-serious)]/[0.1]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={18} className="text-[var(--color-status-serious)] shrink-0" />
                    <p className="text-sm">
                      <span className="font-semibold">{riskyJobs.length} active job{riskyJobs.length > 1 ? "s" : ""} unassigned</span>
                      <span className="text-[var(--color-ink-muted)]"> waiting on a technician to be assigned.</span>
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-status-serious)] flex items-center gap-1 shrink-0">Review <ArrowRight size={13} /></span>
                </div>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          <StatTile
            key="active" label="Active Jobs" value={String(activeJobs.length)} icon={<ClipboardList size={16} />} accent="var(--color-series-1)"
            delta={activeDelta?.text} deltaTone={activeDelta?.tone}
            sparkline={<Sparkline data={sparkData(activeJobsTrend(scopedJobs, rangeDays))} dataKey="v" color="var(--color-series-1)" />}
          />,
          <StatTile
            key="tat" label="Avg. Turnaround Time" value={`${avgTat(scopedJobs)}h`} icon={<Clock size={16} />} accent="var(--color-series-3)"
            delta={tatDelta?.text} deltaTone={tatDelta?.tone}
            sparkline={<Sparkline data={volumeTrend} dataKey="avgHours" color="var(--color-series-3)" />}
          />,
          <StatTile
            key="warranty" label="Warranty Share" value={`${warrantyPct}%`} icon={<ShieldCheck size={16} />} accent="var(--color-series-2)"
            delta={warrantyDelta?.text} deltaTone={warrantyDelta?.tone}
            sparkline={<Sparkline data={sparkData(warrantyShareTrend(scopedJobs, rangeDays))} dataKey="v" color="var(--color-series-2)" />}
          />,
          <StatTile key="stock" label="Low Stock Alerts" value={String(alerts.length)} icon={<PackageX size={16} />} accent="var(--color-status-critical)" delta={alerts.length > 0 ? "Needs attention" : undefined} deltaTone="critical" />,
          <StatTile key="techs" label="Technicians Available" value={`${availableTechs}/${scopedTechs.length}`} icon={<Users size={16} />} accent="var(--color-series-5)" />,
        ].map((tile, i) => (
          <div key={tile.key} className={cx("animate-rise-in", i === 4 && "col-span-2 xl:col-span-1")} style={{ animationDelay: `${i * 40}ms` }}>
            {tile}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" interactive>
          <CardHeader title={t(lang, "jobsByStatus")} subtitle="Live count across the selected branch scope" />
          <HorizontalBarChart data={jobsByStatus(scopedJobs)} dataKey="count" categoryKey="status" color="var(--color-series-1)" />
        </Card>
        <Card interactive>
          <CardHeader title={t(lang, "warrantyRatio")} />
          <DonutChart data={warrantyRatio(scopedJobs)} centerValue={`${warrantyPct}%`} centerLabel="Warranty" />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" interactive>
          <CardHeader
            title={t(lang, "tatTrend")}
            subtitle={`Daily job volume (bars) vs. average turnaround hours (line), last ${rangeDays} days`}
            action={
              <div className="flex rounded-lg border p-0.5 [border-color:var(--color-border)]">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRangeDays(d)}
                    className={cx(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      rangeDays === d ? "bg-[var(--color-brand-1)] text-white" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"
                    )}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            }
          />
          <ComboChart
            data={volumeTrend} categoryKey="day" barKey="jobs" lineKey="avgHours"
            barColor="var(--color-series-1)" lineColor="var(--color-series-3)"
            referenceValue={48} referenceLabel="48h SLA target"
          />
        </Card>
        <Card interactive>
          <CardHeader title={t(lang, "technicianWorkload")} subtitle="Open jobs assigned" />
          <VerticalBarChart data={technicianWorkload(scopedJobs, scopedTechs)} dataKey="jobs" categoryKey="name" color="var(--color-series-5)" height={240} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-x-auto" padded={false}>
          <div className="p-5 pb-0">
            <CardHeader title={t(lang, "latestJobs")} action={<Link to="/jobcards" className="text-xs font-medium text-[var(--color-brand-1)] hover:text-[var(--color-brand-2)] transition-colors">View all →</Link>} />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-muted)] border-y [border-color:var(--color-border)]">
                <th className="px-5 py-2 font-medium">Job ID</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Appliance</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Technician</th>
                <th className="px-5 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((j) => (
                <tr key={j.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-2.5">
                    <Link to={`/jobcards/${j.id}`} className="font-medium text-[var(--color-brand-1)] hover:text-[var(--color-brand-2)] transition-colors">{j.id}</Link>
                  </td>
                  <td className="px-3 py-2.5">{custMap.get(j.customerId)?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{appMap.get(j.applianceId)?.model ?? "—"}</td>
                  <td className="px-3 py-2.5"><JobStatusBadge status={j.status} /></td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{j.technicianId ? techMap.get(j.technicianId)?.name : "Unassigned"}</td>
                  <td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDate(j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title={t(lang, "inventoryAlerts")} subtitle="At or below reorder level" />
          {alerts.length === 0 ? (
            <EmptyState icon={<PackageCheck size={18} />} title="All stock levels healthy" subtitle="Nothing at or below its reorder level." />
          ) : (
            <div className="space-y-3">
              {alerts.map(({ item, total }) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{item.partNo} · reorder at {item.reorderLevel}</p>
                  </div>
                  <span className="tabular-nums font-semibold text-[var(--color-status-critical)]">{total} left</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
