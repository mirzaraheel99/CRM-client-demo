import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Badge } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { WhatsappVerify } from "../../components/WhatsappVerify";
import { formatDate, formatDateTime } from "../../lib/utils";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, appliances, jobCards, brands, communicationLogs, selectedBranchId } = useStore();
  const customer = customers.find((candidate) => candidate.id === id && (selectedBranchId === "all" || candidate.branchId === selectedBranchId));
  if (!customer) return <p className="text-sm text-[var(--color-ink-muted)]">Customer not found.</p>;

  const custAppliances = appliances.filter((a) => a.customerId === id);
  const custJobs = jobCards.filter((j) => j.customerId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const custComms = communicationLogs.filter((communication) => communication.customerId === customer.id).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 10);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Customer since {formatDate(customer.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Contact" />
          <div className="space-y-1.5 text-sm">
            <p><span className="text-[var(--color-ink-muted)]">Phone:</span> {customer.phone}</p>
            <p><span className="text-[var(--color-ink-muted)]">WhatsApp:</span> {customer.whatsapp}</p>
            <p><span className="text-[var(--color-ink-muted)]">Email:</span> {customer.email}</p>
            <p><span className="text-[var(--color-ink-muted)]">Address:</span> {customer.address}</p>
            <div className="pt-2 border-t [border-color:var(--color-border)]">
              <WhatsappVerify customerId={customer.id} verified={customer.whatsappVerified} />
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Appliances" subtitle={`${custAppliances.length} registered`} />
          <div className="space-y-2">
            {custAppliances.map((a) => {
              const brand = brands.find((b) => b.id === a.brandId);
              return (
                <div key={a.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 [border-color:var(--color-border)]">
                  <div>
                    <p className="font-medium">{a.model}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{brand?.name} · Serial {a.serialNo}</p>
                  </div>
                  <Badge tone={a.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{a.warrantyStatus}</Badge>
                </div>
              );
            })}
            {custAppliances.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No appliances registered.</p>}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0"><CardHeader title="Job History" /></div>
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
            {custJobs.map((j) => (
              <tr key={j.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                <td className="px-5 py-2.5"><Link to={`/jobcards/${j.id}`} className="font-medium text-[var(--color-brand-1)]">{j.id}</Link></td>
                <td className="px-3 py-2.5"><JobTypeBadge jobType={j.jobType} /></td>
                <td className="px-3 py-2.5"><JobStatusBadge status={j.status} /></td>
                <td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDate(j.createdAt)}</td>
              </tr>
            ))}
            {custJobs.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-[var(--color-ink-muted)]">No job cards yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader title="Communication Log" subtitle="Most recent messages across all jobs" />
        <div className="space-y-2">
          {custComms.map((c) => (
            <div key={c.id} className="text-sm border-b last:border-0 pb-2 [border-color:var(--color-border)]">
              <p>{c.message}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{c.channel.toUpperCase()} · {formatDateTime(c.timestamp)}</p>
            </div>
          ))}
          {custComms.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No messages sent yet.</p>}
        </div>
      </Card>
    </div>
  );
}
