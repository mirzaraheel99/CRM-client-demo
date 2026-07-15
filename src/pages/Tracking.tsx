import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ImagePlus, Mail, MessageCircle, Smartphone, Wrench, XCircle } from "lucide-react";
import { useStore } from "../lib/store";
import { Badge, Button, Card, WorkflowStepper } from "../components/ui";
import { JobStatusBadge } from "../components/StatusBadge";
import { PaymentPanel } from "../components/PaymentPanel";
import { Toaster } from "../components/Toaster";
import { toast } from "../lib/toast";
import { formatCurrency, formatDate, formatSequence } from "../lib/utils";
import { STAGE_NAME_AR, WARRANTY_STATUS_AR, COMM_STATUS_AR, bi } from "../lib/domainAr";
import type { Channel, StageName } from "../lib/types";

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageCircle size={13} />,
  sms: <Smartphone size={13} />,
  email: <Mail size={13} />,
};

export default function TrackingPage() {
  const { jobId } = useParams();
  const { jobCards, serviceOrders, customers, appliances, brands, technicians, workflows, stageHistory, attachments, communicationLogs, approveCustomer, payments } = useStore();
  const directJob = jobCards.find((job) => job.id === jobId);
  const serviceOrder = serviceOrders.find((order) => order.id === jobId) ?? serviceOrders.find((order) => order.id === directJob?.serviceOrderId);
  const orderJobs = jobCards.filter((job) => job.serviceOrderId === serviceOrder?.id).sort((a, b) => a.sequenceNo - b.sequenceNo);
  const [selectedLineId, setSelectedLineId] = useState("");

  const job = orderJobs.find((line) => line.id === selectedLineId) ?? directJob ?? orderJobs[0];
  if (!job || !serviceOrder) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-page)] p-6 text-[var(--color-ink-primary)]"><div className="text-center"><p className="text-lg font-semibold">{bi("Tracking link not found", "لم يتم العثور على رابط التتبع")}</p><p className="mt-1 text-sm text-[var(--color-ink-muted)]">{bi("Double-check the link your service center sent you.", "تحقق من الرابط الذي أرسله لك مركز الخدمة.")}</p></div></div>;
  }

  const customer = customers.find((candidate) => candidate.id === serviceOrder.customerId);
  const appliance = appliances.find((candidate) => candidate.id === job.applianceId);
  const brand = brands.find((candidate) => candidate.id === appliance?.brandId);
  const technician = technicians.find((candidate) => candidate.id === job.technicianId);
  const workflow = workflows.find((candidate) => candidate.jobType === job.jobType);
  const history = stageHistory.filter((entry) => entry.jobcardId === job.id).sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  const photos = attachments.filter((attachment) => attachment.jobcardId === job.id);
  const comms = communicationLogs.filter((communication) => communication.jobcardId === job.id).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  const jobPayments = payments.filter((payment) => payment.jobcardId === job.id);
  const stepIdx = workflow?.steps.findIndex((step) => step.stepName === job.currentStage) ?? -1;
  const needsApproval = job.currentStage === "Customer Approval" && job.customerApproved !== true;
  const canPay = job.jobType === "non_warranty" && (job.status === "Ready" || job.status === "Delivered") && job.finalAmount != null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-page)] text-[var(--color-ink-primary)]">
      <header className="flex h-16 items-center gap-2 border-b bg-[var(--color-surface-1)] px-6 [border-color:var(--color-border)]"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-1)] text-white"><Wrench size={16} /></div><div><p className="text-sm font-semibold">FixFlow</p><p className="text-[11px] text-[var(--color-ink-muted)]">{bi("Customer tracking | no login required", "تتبع العميل | بدون تسجيل دخول")}</p></div></header>

      <main className="mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-medium text-[var(--color-ink-muted)]">{bi("Service order", "أمر الخدمة")}</p><h1 className="text-xl font-semibold">{serviceOrder.documentNo}</h1><p className="text-sm text-[var(--color-ink-muted)]">Hi {customer?.name.split(" ")[0]}, track all {orderJobs.length} {orderJobs.length === 1 ? "product" : "products"} received under this order.</p></div>
          <div className="text-right"><p className="text-xs text-[var(--color-ink-muted)]">{bi("Customer No.", "رقم العميل")}</p><p className="text-sm font-medium">{customer?.documentNo}</p></div>
        </div>

        {orderJobs.length > 1 && (
          <Card>
            <p className="mb-3 text-sm font-semibold">{bi("Product sequences", "تسلسل المنتجات")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {orderJobs.map((line) => {
                const product = appliances.find((candidate) => candidate.id === line.applianceId);
                return <button key={line.id} type="button" onClick={() => setSelectedLineId(line.id)} className={`rounded-md border p-3 text-left [border-color:var(--color-border)] ${line.id === job.id ? "ring-2 ring-[var(--color-brand-1)] bg-black/[0.02] dark:bg-white/[0.04]" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{bi("Sequence", "التسلسل")} {formatSequence(line.sequenceNo)}</span><JobStatusBadge status={line.status} /></div><p className="mt-1 truncate text-xs text-[var(--color-ink-secondary)]">{product?.model}</p><p className="text-[11px] text-[var(--color-ink-muted)]">{line.documentNo} | {formatDate(line.createdAt)}</p></button>;
              })}
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-[var(--color-ink-muted)]">{bi("Selected product line", "بند المنتج المحدد")}</p><h2 className="text-lg font-semibold">{job.documentNo}</h2><p className="text-xs text-[var(--color-ink-muted)]">{bi("Invoice No.", "رقم الفاتورة")} {job.invoiceNo}</p></div><JobStatusBadge status={job.status} /></div>

        {workflow && <Card><WorkflowStepper steps={workflow.steps} currentIdx={stepIdx} orientation="horizontal" /></Card>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card><p className="mb-1 text-xs text-[var(--color-ink-muted)]">{bi("Product", "المنتج")}</p><p className="text-sm font-medium">{appliance?.model}</p><p className="text-xs text-[var(--color-ink-secondary)]">{appliance?.documentNo} | {brand?.name} | Serial {appliance?.serialNo}</p><p className="mt-1 text-xs text-[var(--color-ink-muted)]">Purchased {formatDate(appliance?.purchaseDate)}</p><div className="mt-2"><Badge tone={appliance?.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance?.warrantyStatus ? bi(appliance.warrantyStatus, WARRANTY_STATUS_AR[appliance.warrantyStatus]) : ""}</Badge></div></Card>
          <Card><p className="mb-1 text-xs text-[var(--color-ink-muted)]">{bi("Technician", "الفني")}</p><p className="text-sm font-medium">{technician?.name ?? bi("Being assigned", "قيد الإسناد")}</p>{job.estimateAmount != null && <><p className="mt-2 text-xs text-[var(--color-ink-muted)]">{bi("Estimate", "التقدير")}</p><p className="text-sm font-semibold tabular-nums">{formatCurrency(job.estimateAmount)}</p></>}</Card>
        </div>

        {needsApproval && <Card className="border-2 [border-color:var(--color-brand-1)]"><p className="mb-1 text-sm font-medium">{job.customerApproved === false ? bi("You declined this estimate", "لقد رفضت هذا التقدير") : bi("Your approval is needed to proceed", "موافقتك مطلوبة للمتابعة")}</p><p className="mb-3 text-xs text-[var(--color-ink-secondary)]">{bi("Estimated cost:", "التكلفة المقدرة:")} <span className="font-semibold">{formatCurrency(job.estimateAmount)}</span> for this product sequence.</p><div className="flex gap-2"><Button onClick={async () => { const result = await approveCustomer(job.id, true, "customer"); toast(result.message, result.ok ? "success" : "error"); }}><CheckCircle2 size={14} /> {bi("Approve", "موافقة")}</Button>{job.customerApproved == null && <Button variant="danger" onClick={async () => { const result = await approveCustomer(job.id, false, "customer"); toast(result.message, result.ok ? "info" : "error"); }}><XCircle size={14} /> {bi("Decline", "رفض")}</Button>}</div></Card>}
        {job.currentStage === "Customer Approval" && job.customerApproved === true && <Card><Badge tone="good">{bi("You approved this product estimate", "لقد وافقت على تقدير هذا المنتج")}</Badge></Card>}
        {canPay && <PaymentPanel jobcardId={job.id} amount={job.finalAmount} payments={jobPayments} source="customer" />}

        <Card>
          <p className="mb-3 text-sm font-semibold">{bi("Progress timeline", "الجدول الزمني للتقدم")}</p>
          <ol className="relative ml-2 border-l [border-color:var(--color-border)]">
            {history.map((entry) => {
              const stagePhotos = photos.filter((photo) => photo.stageName === entry.stageName);
              return <li key={entry.id} className="mb-5 ml-4"><span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[var(--color-brand-1)]" /><p className="text-sm font-medium">{bi(entry.stageName, STAGE_NAME_AR[entry.stageName as StageName])}</p><p className="text-xs text-[var(--color-ink-muted)]">{formatDate(entry.timestamp)}</p>{stagePhotos.length > 0 && <div className="mt-1.5 flex gap-1.5">{stagePhotos.map((photo) => <div key={photo.id} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-black/[0.05] dark:bg-white/[0.08]" title={photo.label}>{photo.fileUrl !== "#" ? <img src={photo.fileUrl} alt={photo.label} className="h-full w-full object-cover" /> : <ImagePlus size={13} className="text-[var(--color-ink-muted)]" />}</div>)}</div>}</li>;
            })}
          </ol>
        </Card>

        {comms.length > 0 && <Card><p className="mb-3 text-sm font-semibold">{bi("Messages sent to you", "الرسائل المرسلة إليك")}</p><div className="space-y-2.5">{comms.slice(0, 5).map((communication) => <div key={communication.id} className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-[var(--color-brand-1)]">{CHANNEL_ICON[communication.channel]}</span><div className="flex-1"><p>{communication.message}</p><p className="text-[11px] text-[var(--color-ink-muted)]">{formatDate(communication.timestamp)} | {bi(communication.status, COMM_STATUS_AR[communication.status as keyof typeof COMM_STATUS_AR])}</p></div></div>)}</div></Card>}
        <p className="pb-6 text-center text-[11px] text-[var(--color-ink-muted)]">Powered by FixFlow</p>
      </main>
      <Toaster />
    </div>
  );
}
