import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Radar, CheckCircle2, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Badge, Button, StatTile } from "../components/ui";
import { predictiveMaintenanceCandidates } from "../lib/selectors";
import { relativeTime } from "../lib/utils";
import { toast } from "../lib/toast";

export default function PredictiveMaintenance() {
  const { appliances, jobCards, brands, customers, maintenanceRemindersSent, sendMaintenanceReminder } = useStore();

  const candidates = useMemo(() => predictiveMaintenanceCandidates(appliances, jobCards, brands), [appliances, jobCards, brands]);
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const remindersSentCount = candidates.filter((c) => maintenanceRemindersSent[c.appliance.id]).length;
  // Candidates are already filtered to the plausible cohort window, so their
  // match strength is displayed on a 50-100% scale rather than 0-100%.
  const matchStrength = (score: number) => Math.round(50 + score * 50);

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--color-brand-1)]" />
          <h1 className="text-xl font-semibold tracking-tight">Predictive Maintenance</h1>
        </div>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5 max-w-2xl">
          Proactive service opportunities — flagged from real repair-history patterns across similar appliances,
          not waiting for a breakdown call. No IoT hardware required: FixFlow learns the typical age-at-first-repair
          for each brand and category, then surfaces appliances approaching that window.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        <StatTile label="Flagged appliances" value={String(candidates.length)} icon={<Radar size={16} />} accent="var(--color-brand-1)" />
        <StatTile label="Reminders sent" value={String(remindersSentCount)} icon={<CheckCircle2 size={16} />} accent="var(--color-status-good)" />
        <StatTile
          label="Avg. match strength"
          value={candidates.length ? `${Math.round(candidates.reduce((a, c) => a + matchStrength(c.urgencyScore), 0) / candidates.length)}%` : "—"}
          icon={<Sparkles size={16} />}
          accent="var(--color-series-5)"
        />
      </div>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
              <th className="px-5 py-3 font-medium">Appliance</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Current age</th>
              <th className="px-3 py-3 font-medium">Cohort avg. age at first repair</th>
              <th className="px-3 py-3 font-medium">Confidence</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(({ appliance, ageMonths, cohortAvgMonths, cohortSize, urgencyScore }) => {
              const sent = maintenanceRemindersSent[appliance.id];
              return (
                <tr key={appliance.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <Link to={`/appliances/${appliance.id}`} className="font-medium text-[var(--color-brand-1)]">{appliance.model}</Link>
                    <p className="text-xs text-[var(--color-ink-muted)]">{brandMap.get(appliance.brandId)?.name} · {appliance.category}</p>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-ink-secondary)]">{custMap.get(appliance.customerId)?.name ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{ageMonths} mo</td>
                  <td className="px-3 py-3 tabular-nums text-[var(--color-ink-secondary)]">{cohortAvgMonths} mo <span className="text-[var(--color-ink-muted)]">(n={cohortSize})</span></td>
                  <td className="px-3 py-3">
                    <Badge tone={urgencyScore > 0.66 ? "serious" : "warning"}>{matchStrength(urgencyScore)}%</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {sent ? (
                      <span className="text-xs text-[var(--color-status-good)] flex items-center gap-1"><CheckCircle2 size={13} /> Reminded {relativeTime(sent)}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { sendMaintenanceReminder(appliance.id); toast(`Maintenance reminder sent for ${appliance.model}.`); }}>Send Reminder</Button>
                        <Link to={`/jobcards/new?customerId=${appliance.customerId}&applianceId=${appliance.id}`}>
                          <Button size="sm">Create Job Card</Button>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {candidates.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--color-ink-muted)]">No predictive maintenance opportunities flagged right now.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader title="How this works" />
        <p className="text-sm text-[var(--color-ink-secondary)]">
          For every brand + appliance category with at least 3 completed repairs, FixFlow calculates the average
          appliance age at first service. Appliances of the same brand/category that haven't had a job card yet,
          and are now within ~22% of that average age, are flagged here — the same "similar units failed around
          this age" signal that IoT telemetry programs (LG ThinQ Care, Samsung SmartThings) use, derived entirely
          from job-card history already in the system. Wiring in real appliance telemetry later would sharpen this
          further without changing the workflow.
        </p>
      </Card>
    </div>
  );
}
