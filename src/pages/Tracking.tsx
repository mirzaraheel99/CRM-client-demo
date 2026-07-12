import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Wrench, ImagePlus, MessageCircle, Smartphone, Mail } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Badge, Button, WorkflowStepper } from "../components/ui";
import { JobStatusBadge } from "../components/StatusBadge";
import { PaymentPanel } from "../components/PaymentPanel";
import { formatCurrency, formatDate } from "../lib/utils";
import type { Channel } from "../lib/types";

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageCircle size={13} />,
  sms: <Smartphone size={13} />,
  email: <Mail size={13} />,
};

export default function TrackingPage() {
  const { jobId } = useParams();
  const {
    jobCards, customers, appliances, brands, technicians, workflows,
    stageHistory, attachments, communicationLogs, approveCustomer, payments,
  } = useStore();

  const job = jobCards.find((j) => j.id === jobId);

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-page)] text-[var(--color-ink-primary)] p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Tracking link not found</p>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">Double-check the link your service center sent you.</p>
        </div>
      </div>
    );
  }

  const customer = customers.find((c) => c.id === job.customerId);
  const appliance = appliances.find((a) => a.id === job.applianceId);
  const brand = brands.find((b) => b.id === appliance?.brandId);
  const technician = technicians.find((t) => t.id === job.technicianId);
  const workflow = workflows.find((w) => w.jobType === job.jobType);
  const history = stageHistory.filter((h) => h.jobcardId === job.id).sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  const photos = attachments.filter((a) => a.jobcardId === job.id);
  const comms = communicationLogs.filter((c) => c.jobcardId === job.id).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  const jobPayments = payments.filter((p) => p.jobcardId === job.id);

  const stepIdx = workflow?.steps.findIndex((s) => s.stepName === job.currentStage) ?? -1;
  const needsApproval = job.currentStage === "Customer Approval" && job.customerApproved == null;
  const canPay = job.jobType === "non_warranty" && (job.status === "Ready" || job.status === "Delivered") && job.finalAmount != null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-page)] text-[var(--color-ink-primary)]">
      <header className="flex items-center gap-2 px-6 h-16 border-b [border-color:var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-1)] text-white">
          <Wrench size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold">FixFlow</p>
          <p className="text-[11px] text-[var(--color-ink-muted)]">Customer tracking — no login required</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-5 sm:p-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold">{job.id}</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">Hi {customer?.name.split(" ")[0]}, here's the latest on your {appliance?.category.toLowerCase()}.</p>
          </div>
          <JobStatusBadge status={job.status} />
        </div>

        {workflow && (
          <Card>
            <WorkflowStepper steps={workflow.steps} currentIdx={stepIdx} orientation="horizontal" />
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">Appliance</p>
            <p className="text-sm font-medium">{appliance?.model}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{brand?.name} · Serial {appliance?.serialNo}</p>
            <div className="mt-2"><Badge tone={appliance?.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance?.warrantyStatus}</Badge></div>
          </Card>
          <Card>
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">Technician</p>
            <p className="text-sm font-medium">{technician?.name ?? "Being assigned"}</p>
            {job.estimateAmount != null && (
              <>
                <p className="text-xs text-[var(--color-ink-muted)] mt-2">Estimate</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(job.estimateAmount)}</p>
              </>
            )}
          </Card>
        </div>

        {needsApproval && (
          <Card className="border-2 [border-color:var(--color-brand-1)]">
            <p className="text-sm font-medium mb-1">Your approval is needed to proceed</p>
            <p className="text-xs text-[var(--color-ink-secondary)] mb-3">
              Estimated cost: <span className="font-semibold">{formatCurrency(job.estimateAmount)}</span> for parts + labor.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => approveCustomer(job.id, true)}><CheckCircle2 size={14} /> Approve</Button>
              <Button variant="danger" onClick={() => approveCustomer(job.id, false)}><XCircle size={14} /> Decline</Button>
            </div>
          </Card>
        )}
        {job.currentStage === "Customer Approval" && job.customerApproved != null && (
          <Card>
            <Badge tone={job.customerApproved ? "good" : "critical"}>{job.customerApproved ? "You approved this estimate" : "You declined this estimate"}</Badge>
          </Card>
        )}

        {canPay && <PaymentPanel jobcardId={job.id} amount={job.finalAmount} payments={jobPayments} />}

        <Card>
          <p className="text-sm font-semibold mb-3">Progress timeline</p>
          <ol className="relative border-l ml-2 [border-color:var(--color-border)]">
            {history.map((h) => {
              const stagePhotos = photos.filter((p) => p.stageName === h.stageName);
              return (
                <li key={h.id} className="mb-5 ml-4">
                  <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[var(--color-brand-1)]" />
                  <p className="text-sm font-medium">{h.stageName}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{formatDate(h.timestamp)}</p>
                  {stagePhotos.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {stagePhotos.map((p) => (
                        <div key={p.id} className="h-9 w-9 rounded-md bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center" title={p.label}>
                          <ImagePlus size={13} className="text-[var(--color-ink-muted)]" />
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        {comms.length > 0 && (
          <Card>
            <p className="text-sm font-semibold mb-3">Messages sent to you</p>
            <div className="space-y-2.5">
              {comms.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-[var(--color-brand-1)]">{CHANNEL_ICON[c.channel]}</span>
                  <div className="flex-1"><p>{c.message}</p><p className="text-[11px] text-[var(--color-ink-muted)]">{formatDate(c.timestamp)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-center text-[11px] text-[var(--color-ink-muted)] pb-6">Powered by FixFlow</p>
      </main>
    </div>
  );
}
