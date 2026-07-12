import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Wifi } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Badge } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { formatDate, relativeTime } from "../../lib/utils";

export default function ApplianceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appliances, applianceTelemetry, customers, brands, jobCards } = useStore();
  const appliance = appliances.find((a) => a.id === id);
  if (!appliance) return <p className="text-sm text-[var(--color-ink-muted)]">Appliance not found.</p>;

  const customer = customers.find((c) => c.id === appliance.customerId);
  const brand = brands.find((b) => b.id === appliance.brandId);
  const telemetry = applianceTelemetry.find((t) => t.applianceId === appliance.id);
  const history = jobCards.filter((j) => j.applianceId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="animate-rise-in">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{appliance.model}</h1>
          {appliance.isSmartConnected && <Badge tone="good" icon={<Wifi size={11} />}>Smart Connected</Badge>}
        </div>
        <p className="text-sm text-[var(--color-ink-muted)]">Owned by {customer ? <Link to={`/customers/${customer.id}`} className="text-[var(--color-brand-1)]">{customer.name}</Link> : "—"}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-[var(--color-ink-muted)]">Brand</p>
          <p className="text-sm font-medium mt-1">{brand?.name}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--color-ink-muted)]">Category</p>
          <p className="text-sm font-medium mt-1">{appliance.category}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--color-ink-muted)]">Serial / IMEI</p>
          <p className="text-sm font-medium mt-1">{appliance.serialNo}{appliance.imeiNo ? ` / ${appliance.imeiNo}` : ""}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--color-ink-muted)]">Warranty Status</p>
          <div className="mt-1"><Badge tone={appliance.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance.warrantyStatus}</Badge></div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Warranty rules" subtitle={brand?.name} />
        <p className="text-sm text-[var(--color-ink-secondary)]">{brand?.rules}</p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-2">Purchased {formatDate(appliance.purchaseDate)} · {brand?.warrantyMonths} month warranty period</p>
      </Card>

      {appliance.isSmartConnected && (
        <Card>
          <CardHeader title="Smart Diagnostics" subtitle="Simulated telemetry — production would call the brand's IoT service API" />
          <div className="flex items-center gap-6 flex-wrap text-sm">
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">Last error</p>
              {telemetry?.lastErrorCode ? (
                <div className="flex items-center gap-1.5 mt-1"><Badge tone="serious">{telemetry.lastErrorCode}</Badge><span>{telemetry.lastErrorDescription}</span></div>
              ) : <p className="font-medium mt-1">None reported</p>}
            </div>
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">Cycle count</p>
              <p className="font-medium mt-1 tabular-nums">{telemetry?.cycleCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">Last synced</p>
              <p className="font-medium mt-1">{telemetry ? relativeTime(telemetry.lastSyncAt) : "—"}</p>
            </div>
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="p-5 pb-0"><CardHeader title="Service history" /></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-ink-muted)] border-y [border-color:var(--color-border)]">
              <th className="px-5 py-2 font-medium">Job ID</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {history.map((j) => (
              <tr key={j.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                <td className="px-5 py-2.5"><Link to={`/jobcards/${j.id}`} className="font-medium text-[var(--color-brand-1)]">{j.id}</Link></td>
                <td className="px-3 py-2.5"><JobTypeBadge jobType={j.jobType} /></td>
                <td className="px-3 py-2.5"><JobStatusBadge status={j.status} /></td>
                <td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDate(j.createdAt)}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-[var(--color-ink-muted)]">No service history.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
