import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Wifi } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Card, CardHeader } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { formatDate, relativeTime } from "../../lib/utils";

export default function ApplianceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appliances, applianceTelemetry, customers, brands, jobCards, selectedBranchId } = useStore();
  const history = jobCards.filter((job) => job.applianceId === id && (selectedBranchId === "all" || job.branchId === selectedBranchId)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const appliance = appliances.find((candidate) => candidate.id === id && (selectedBranchId === "all" || history.length > 0));
  if (!appliance) return <p className="text-sm text-[var(--color-ink-muted)]">Product not found for this branch.</p>;

  const brand = brands.find((candidate) => candidate.id === appliance.brandId);
  const telemetry = applianceTelemetry.find((candidate) => candidate.applianceId === appliance.id);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"><ArrowLeft size={15} /> Back</button>
      <div className="animate-rise-in">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{appliance.model}</h1>
          {appliance.isSmartConnected && <Badge tone="good" icon={<Wifi size={11} />}>Smart Connected</Badge>}
        </div>
        <p className="text-sm text-[var(--color-ink-muted)]">Product No. {appliance.documentNo} | Customer association is recorded per service order.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs text-[var(--color-ink-muted)]">Brand</p><p className="mt-1 text-sm font-medium">{brand?.name}</p></Card>
        <Card><p className="text-xs text-[var(--color-ink-muted)]">Category</p><p className="mt-1 text-sm font-medium">{appliance.category}</p></Card>
        <Card><p className="text-xs text-[var(--color-ink-muted)]">Serial / IMEI</p><p className="mt-1 text-sm font-medium">{appliance.serialNo}{appliance.imeiNo ? ` / ${appliance.imeiNo}` : ""}</p></Card>
        <Card><p className="text-xs text-[var(--color-ink-muted)]">Warranty Status</p><div className="mt-1"><Badge tone={appliance.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance.warrantyStatus}</Badge></div></Card>
      </div>

      <Card>
        <CardHeader title="Warranty record" subtitle={brand?.name} />
        <p className="text-sm text-[var(--color-ink-secondary)]">{brand?.rules}</p>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Purchased {formatDate(appliance.purchaseDate)} | {brand?.warrantyMonths} month warranty period</p>
      </Card>

      {appliance.isSmartConnected && (
        <Card>
          <CardHeader title="Smart Diagnostics" subtitle="Simulated telemetry; production would call the brand's IoT service API" />
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div><p className="text-xs text-[var(--color-ink-muted)]">Last error</p>{telemetry?.lastErrorCode ? <div className="mt-1 flex items-center gap-1.5"><Badge tone="serious">{telemetry.lastErrorCode}</Badge><span>{telemetry.lastErrorDescription}</span></div> : <p className="mt-1 font-medium">None reported</p>}</div>
            <div><p className="text-xs text-[var(--color-ink-muted)]">Cycle count</p><p className="mt-1 font-medium tabular-nums">{telemetry?.cycleCount.toLocaleString()}</p></div>
            <div><p className="text-xs text-[var(--color-ink-muted)]">Last synced</p><p className="mt-1 font-medium">{telemetry ? relativeTime(telemetry.lastSyncAt) : "-"}</p></div>
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="p-5 pb-0"><CardHeader title="Service history" subtitle={`${history.length} sequenced job lines`} /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-y text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><th className="px-5 py-2 font-medium">Service order / sequence</th><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Invoice No.</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Status</th><th className="px-5 py-2 font-medium">Job date</th></tr></thead>
            <tbody>
              {history.map((job) => {
                const customer = customers.find((candidate) => candidate.id === job.customerId);
                return <tr key={job.id} className="border-b last:border-0 [border-color:var(--color-border)]"><td className="px-5 py-2.5"><Link to={`/jobcards/${job.id}`} className="font-medium text-[var(--color-brand-1)]">{job.documentNo}</Link></td><td className="px-3 py-2.5">{customer?.name ?? "-"}<p className="text-xs text-[var(--color-ink-muted)]">{customer?.documentNo}</p></td><td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{job.invoiceNo}</td><td className="px-3 py-2.5"><JobTypeBadge jobType={job.jobType} /></td><td className="px-3 py-2.5"><JobStatusBadge status={job.status} /></td><td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDate(job.createdAt)}</td></tr>;
              })}
              {history.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-[var(--color-ink-muted)]">No service history.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
