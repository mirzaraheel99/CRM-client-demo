import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Smartphone, Mail, CheckCircle2, Circle, XCircle, ImagePlus, Printer, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Tabs, Button, Select, Textarea, Input, Field, Badge, Avatar, WorkflowStepper } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { PartsGrid } from "../../components/PartsGrid";
import { TrackingShare } from "../../components/TrackingShare";
import { formatCurrency, formatDate, formatDateTime, formatSequence, relativeTime } from "../../lib/utils";
import { inventoryStockByBranch, totalStockByItem } from "../../lib/selectors";
import { MESSAGE_TEMPLATES, renderTemplate } from "../../lib/templates";
import { printEstimate } from "../../lib/print";
import { printTaxInvoice } from "../../lib/zatca";
import { suggestDiagnosis, suggestFromTelemetry } from "../../lib/diagnosisAI";
import { PaymentPanel } from "../../components/PaymentPanel";
import { WhatsappVerify } from "../../components/WhatsappVerify";
import { toast } from "../../lib/toast";
import { Wifi } from "lucide-react";
import { canPerform } from "../../lib/permissions";
import { stageAccessBlocker, stageRequirements } from "../../lib/workflow";
import { STAGE_NAME_AR, CHANNEL_AR, COMM_STATUS_AR, bi } from "../../lib/domainAr";
import type { StageName, Channel, ActionResult } from "../../lib/types";

const TAB_LIST = ["Timeline", "Details", "Parts", "Attachments", "Communication"];
const TAB_LABELS: Record<string, string> = {
  Timeline: bi("Timeline", "الجدول الزمني"),
  Details: bi("Details", "التفاصيل"),
  Parts: bi("Parts", "القطع"),
  Attachments: bi("Attachments", "المرفقات"),
  Communication: bi("Communication", "التواصل"),
};

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} />,
  sms: <Smartphone size={14} />,
  email: <Mail size={14} />,
};

const COMM_STATUS_TONE: Record<string, "neutral" | "good" | "critical"> = {
  sent: "neutral",
  delivered: "good",
  read: "good",
  failed: "critical",
};

function StagePhotoUpload({ label, onFile, compact = false }: { label: string; onFile: (file: File) => void; compact?: boolean }) {
  return (
    <label className={compact
      ? "flex cursor-pointer items-center gap-1 rounded-md border border-dashed px-2 py-1 text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-brand-1)] hover:border-[var(--color-brand-1)] [border-color:var(--color-border)]"
      : "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] [border-color:var(--color-border)]"}
    >
      <ImagePlus size={compact ? 12 : 14} /> {label}
      <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} />
    </label>
  );
}

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    jobCards, serviceOrders, customers, appliances, applianceTelemetry, brands, technicians, workflows,
    stageHistory, attachments, partsUsed, communicationLogs, inventoryItems, inventoryLocations, inventoryStock, purchaseBills, payments, removedParts,
    role, selectedBranchId, advanceStage, assignTechnician, setDiagnosis, setEstimate, approveCustomer, setRepairNotes, setQaApproved,
    setFinalAmount, captureCustomerSignature, savePurchaseBill, addPartUsed, removePartUsed, addAttachment, sendCommunication,
    logRemovedPart, notifyCustomerOfRemovedPart, confirmPartReturned,
  } = useStore();
  const [removedDesc, setRemovedDesc] = useState("");
  const [removedSerial, setRemovedSerial] = useState("");

  const [tab, setTab] = useState("Timeline");
  const [techSelect, setTechSelect] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [templateId, setTemplateId] = useState("received");
  const [message, setMessage] = useState("");
  const [estimateInput, setEstimateInput] = useState("");
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [repairInput, setRepairInput] = useState("");
  const [finalAmountInput, setFinalAmountInput] = useState("");
  const [signatureInput, setSignatureInput] = useState("");
  const [billForm, setBillForm] = useState({ billNo: "", billDate: new Date().toISOString().slice(0, 10), vendorName: "" });

  const job = jobCards.find((candidate) => candidate.id === id && (selectedBranchId === "all" || candidate.branchId === selectedBranchId));
  const serviceOrder = serviceOrders.find((candidate) => candidate.id === job?.serviceOrderId);
  const siblingJobs = useMemo(() => jobCards.filter((candidate) => candidate.serviceOrderId === job?.serviceOrderId).sort((a, b) => a.sequenceNo - b.sequenceNo), [jobCards, job?.serviceOrderId]);

  const workflow = useMemo(() => workflows.find((w) => w.jobType === job?.jobType), [workflows, job]);
  const jobHistory = useMemo(() => stageHistory.filter((h) => h.jobcardId === id), [stageHistory, id]);
  const jobAttachments = useMemo(() => attachments.filter((a) => a.jobcardId === id), [attachments, id]);
  const jobParts = useMemo(() => partsUsed.filter((p) => p.jobcardId === id), [partsUsed, id]);
  const jobComms = useMemo(() => communicationLogs.filter((c) => c.jobcardId === id), [communicationLogs, id]);
  const bill = useMemo(() => purchaseBills.find((b) => b.jobcardId === id), [purchaseBills, id]);
  const branchStock = useMemo(() => inventoryStockByBranch(inventoryStock, inventoryLocations, job?.branchId ?? "all"), [inventoryStock, inventoryLocations, job?.branchId]);
  const stockByItem = useMemo(() => totalStockByItem(branchStock), [branchStock]);
  const jobPayments = useMemo(() => payments.filter((p) => p.jobcardId === id), [payments, id]);
  const jobRemovedParts = useMemo(() => removedParts.filter((p) => p.jobcardId === id), [removedParts, id]);
  const telemetry = useMemo(() => applianceTelemetry.find((t) => t.applianceId === job?.applianceId), [applianceTelemetry, job?.applianceId]);
  const diagnosisSuggestions = useMemo(() => {
    const base = suggestDiagnosis(job?.problemDescription ?? "");
    const telemetrySuggestion = telemetry?.lastErrorCode && telemetry.lastErrorDescription
      ? suggestFromTelemetry(telemetry.lastErrorCode, telemetry.lastErrorDescription)
      : null;
    return telemetrySuggestion ? [telemetrySuggestion, ...base] : base;
  }, [job?.problemDescription, telemetry]);

  useEffect(() => {
    if (job) applyTemplate("received");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  useEffect(() => {
    setDiagnosisInput(job?.diagnosisNotes ?? "");
    setRepairInput(job?.repairNotes ?? "");
    setFinalAmountInput(job?.finalAmount?.toString() ?? "");
    setSignatureInput(job?.customerSignature ?? "");
    setBillForm({
      billNo: bill?.billNo ?? "",
      billDate: bill?.billDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      vendorName: bill?.vendorName ?? "",
    });
  }, [job?.id, job?.diagnosisNotes, job?.repairNotes, job?.finalAmount, job?.customerSignature, bill?.id, bill?.billNo, bill?.billDate, bill?.vendorName]);

  const timelineEntries = useMemo(() => {
    const stageEntries = jobHistory.map((h) => ({ kind: "stage" as const, id: h.id, timestamp: h.timestamp, data: h }));
    const commEntries = jobComms.map((c) => ({ kind: "comm" as const, id: c.id, timestamp: c.timestamp, data: c }));
    return [...stageEntries, ...commEntries].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [jobHistory, jobComms]);

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[var(--color-ink-muted)]">{bi("Job card not found.", "لم يتم العثور على بطاقة العمل.")}</p>
        <Link to="/jobcards" className="text-sm text-[var(--color-brand-1)]">{bi("Back to job cards", "العودة إلى بطاقات العمل")}</Link>
      </div>
    );
  }

  const customer = customers.find((c) => c.id === job.customerId);
  const appliance = appliances.find((a) => a.id === job.applianceId);
  const brand = brands.find((b) => b.id === appliance?.brandId);
  const technician = technicians.find((t) => t.id === job.technicianId);

  const currentStepIdx = workflow?.steps.findIndex((s) => s.stepName === job.currentStage) ?? -1;
  const nextStep = workflow && currentStepIdx >= 0 ? workflow.steps[currentStepIdx + 1] : undefined;
  const requirements = stageRequirements(job, { payments: jobPayments, purchaseBill: bill });
  const accessBlocker = stageAccessBlocker(job, role);
  const blockers = requirements.filter((requirement) => !requirement.met).map((requirement) => requirement.label);
  const eligibleTechnicians = technicians.filter((candidate) => candidate.branchId === job.branchId && candidate.status !== "Off Duty" && (!appliance || candidate.skills.includes(appliance.category)));
  const canEditParts = canPerform(role, "add_part") && (job.currentStage === "Diagnosis" || job.currentStage === "Repair");

  const availableTemplates = MESSAGE_TEMPLATES.filter((t) => t.channels.includes(channel));
  const selectedTemplate = availableTemplates.find((t) => t.id === templateId) ?? availableTemplates[0];

  function applyTemplate(tid: string) {
    const tpl = MESSAGE_TEMPLATES.find((t) => t.id === tid);
    setTemplateId(tid);
    if (!tpl || tpl.id === "custom") { setMessage(""); return; }
    setMessage(
      renderTemplate(tpl.body, {
        customer: customer?.name.split(" ")[0] ?? "there",
        appliance: appliance?.model ?? "item",
        jobId: job!.documentNo,
        amount: formatCurrency(job!.estimateAmount),
      })
    );
  }

  function handleAdvance() {
    if (!nextStep) return;
    showResult(advanceStage(job!.id, nextStep.stepName as StageName, `Completed ${job!.currentStage}`, "You"));
  }

  function handleSend() {
    if (!message.trim()) return;
    showResult(sendCommunication(job!.id, channel, message.trim()), () => setMessage(""));
  }

  function showResult(action: ActionResult, onSuccess?: () => void) {
    toast(action.message, action.ok ? "success" : "error");
    if (action.ok) onSuccess?.();
  }

  function uploadPhoto(stageName: StageName, file: File) {
    if (file.size > 1_500_000) {
      toast("Choose an image smaller than 1.5 MB for this browser demo.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => showResult(addAttachment(job!.id, stageName, file.name, String(reader.result)));
    reader.onerror = () => toast("The selected image could not be read.", "error");
    reader.readAsDataURL(file);
  }

  const partsTotal = jobParts.reduce((acc, p) => acc + p.totalPrice, 0);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]">
        <ArrowLeft size={15} /> {bi("Back", "رجوع")}
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold tracking-tight">{job.documentNo}</h1>
          <JobStatusBadge status={job.status} />
          <JobTypeBadge jobType={job.jobType} />
          {job.oemClaimNo && <Badge tone="brand">OEM {job.oemClaimNo}</Badge>}
        </div>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 [border-color:var(--color-border)]">
          <div><p className="text-xs text-[var(--color-ink-muted)]">{bi("Parent service order", "أمر الخدمة الرئيسي")}</p><p className="font-semibold">{serviceOrder?.documentNo ?? job.serviceOrderId}</p></div>
          <div className="text-right"><p className="text-xs text-[var(--color-ink-muted)]">{bi("Customer", "العميل")}</p><p className="text-sm font-medium">{customer?.documentNo} | {siblingJobs.length} {siblingJobs.length === 1 ? "product" : "products"}</p></div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 py-3">
          {siblingJobs.map((line) => {
            const lineProduct = appliances.find((candidate) => candidate.id === line.applianceId);
            return <Link key={line.id} to={`/jobcards/${line.id}`} className={`min-w-48 rounded-md border px-3 py-2 text-sm [border-color:var(--color-border)] ${line.id === job.id ? "bg-[var(--color-brand-soft)] ring-1 ring-[var(--color-brand-1)]" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold">{bi("Sequence", "تسلسل")} {formatSequence(line.sequenceNo)}</span><JobStatusBadge status={line.status} /></div><p className="mt-1 truncate text-xs text-[var(--color-ink-secondary)]">{lineProduct?.model}</p><p className="text-[11px] text-[var(--color-ink-muted)]">{line.documentNo}</p></Link>;
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-5 items-start animate-rise-in" style={{ animationDelay: "40ms" }}>
        {/* Left panel */}
        <Card className="space-y-4">
          <div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Customer", "العميل")}</p>
            <p className="text-sm font-medium">{customer ? <Link to={`/customers/${customer.id}`} className="text-[var(--color-brand-1)] hover:underline">{customer.name}</Link> : "-"}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">{customer?.documentNo}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{customer?.phone}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{customer?.address}</p>
            {customer && <div className="mt-2"><WhatsappVerify customerId={customer.id} verified={customer.whatsappVerified} /></div>}
          </div>
          <div className="border-t pt-3 [border-color:var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Product sequence", "تسلسل المنتج")} {formatSequence(job.sequenceNo)}</p>
            <p className="text-sm font-medium">{appliance?.model}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">{appliance?.documentNo} | Purchased {formatDate(appliance?.purchaseDate)}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{brand?.name} · {appliance?.category}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">Serial {appliance?.serialNo}</p>
            {appliance?.imeiNo && <p className="text-xs text-[var(--color-ink-secondary)]">IMEI {appliance.imeiNo}</p>}
          </div>
          {appliance?.isSmartConnected && (
            <div className="border-t pt-3 [border-color:var(--color-border)]">
              <div className="flex items-center gap-1.5 mb-1">
                <Wifi size={13} className="text-[var(--color-status-good)]" />
                <p className="text-xs font-medium">{bi("Smart Diagnostics", "التشخيص الذكي")}</p>
              </div>
              {telemetry?.lastErrorCode ? (
                <>
                  <Badge tone="serious">{bi("Error", "خطأ")} {telemetry.lastErrorCode}</Badge>
                  <p className="text-xs text-[var(--color-ink-secondary)] mt-1">{telemetry.lastErrorDescription}</p>
                </>
              ) : (
                <p className="text-xs text-[var(--color-ink-secondary)]">{bi("No errors reported", "لا توجد أخطاء مسجلة")}</p>
              )}
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                {telemetry?.cycleCount.toLocaleString()} cycles · synced {telemetry ? relativeTime(telemetry.lastSyncAt) : "—"}
              </p>
            </div>
          )}
          <div className="border-t pt-3 [border-color:var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Warranty", "الضمان")}</p>
            <Badge tone={appliance?.warrantyStatus === "In Warranty" ? "good" : "neutral"}>
              {bi(appliance?.warrantyStatus ?? "", appliance?.warrantyStatus === "In Warranty" ? "ساري الضمان" : "خارج الضمان")}
            </Badge>
            {bill && <p className="text-xs text-[var(--color-ink-secondary)] mt-2">{bi("Bill", "الفاتورة")} {bill.billNo} · {bill.vendorName}</p>}
          </div>
          <div className="border-t pt-3 [border-color:var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Problem reported", "المشكلة المُبلّغ عنها")}</p>
            <p className="text-sm text-[var(--color-ink-secondary)]">{job.problemDescription}</p>
          </div>
        </Card>

        {/* Center tabs */}
        <Card padded={false}>
          <div className="px-5 pt-4"><Tabs tabs={TAB_LIST} active={tab} onChange={setTab} labels={TAB_LABELS} /></div>
          <div className="p-5">
            {tab === "Timeline" && (
              <ol className="relative border-l ml-2 [border-color:var(--color-border)]">
                {timelineEntries.map((entry) => {
                  if (entry.kind === "stage") {
                    const h = entry.data;
                    const stagePhotos = jobAttachments.filter((a) => a.stageName === h.stageName);
                    return (
                      <li key={entry.id} className="mb-6 ml-4">
                        <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[var(--color-brand-1)]" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{bi(h.stageName, STAGE_NAME_AR[h.stageName])}</p>
                          {h.stageRefNo && <Badge tone="brand">{h.stageRefNo}</Badge>}
                          <span className="text-xs text-[var(--color-ink-muted)]">{relativeTime(h.timestamp)}</span>
                        </div>
                        <p className="text-xs text-[var(--color-ink-secondary)]">{h.notes}</p>
                        <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">by {h.changedBy} · {formatDateTime(h.timestamp)}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {stagePhotos.map((attachment) => (
                            <div key={attachment.id} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-black/[0.05] dark:bg-white/[0.08]" title={attachment.label}>
                              {attachment.fileUrl !== "#" ? <img src={attachment.fileUrl} alt={attachment.label} className="h-full w-full object-cover" /> : <ImagePlus size={14} className="text-[var(--color-ink-muted)]" />}
                            </div>
                          ))}
                          <StagePhotoUpload compact label={bi("Add photo", "إضافة صورة")} onFile={(file) => uploadPhoto(h.stageName, file)} />
                        </div>
                      </li>
                    );
                  }
                  const c = entry.data;
                  return (
                    <li key={entry.id} className="mb-6 ml-4">
                      <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[var(--color-surface-2)] border-2 [border-color:var(--color-brand-1)]" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[var(--color-brand-1)]">{CHANNEL_ICON[c.channel]}</span>
                        <p className="text-sm font-medium">{bi(`${c.channel.toUpperCase()} sent`, `تم الإرسال عبر ${CHANNEL_AR[c.channel]}`)}</p>
                        <Badge tone={COMM_STATUS_TONE[c.status]}>{bi(c.status, COMM_STATUS_AR[c.status as keyof typeof COMM_STATUS_AR])}</Badge>
                        <span className="text-xs text-[var(--color-ink-muted)]">{relativeTime(c.timestamp)}</span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-secondary)]">{c.message}</p>
                    </li>
                  );
                })}
                {timelineEntries.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No activity yet.", "لا يوجد نشاط بعد.")}</p>}
              </ol>
            )}

            {tab === "Details" && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{bi("Estimate amount", "مبلغ التقدير")}</p>
                    <p className="font-medium tabular-nums">{formatCurrency(job.estimateAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{bi("Final amount", "المبلغ النهائي")}</p>
                    <p className="font-medium tabular-nums">{formatCurrency(job.finalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{bi("Customer approval", "موافقة العميل")}</p>
                    <p className="font-medium">{job.customerApproved == null ? bi("Pending", "قيد الانتظار") : job.customerApproved ? bi("Approved", "تمت الموافقة") : bi("Declined", "مرفوض")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{bi("Created", "تاريخ الإنشاء")}</p>
                    <p className="font-medium">{formatDateTime(job.createdAt)}</p>
                  </div>
                </div>
                {job.jobType === "non_warranty" && canPerform(role, "set_estimate") && (
                  <div className="border-t pt-4 [border-color:var(--color-border)] flex items-end gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Set / update estimate (SAR)", "تحديد / تحديث التقدير (ريال)")}</p>
                      <input
                        value={estimateInput}
                        onChange={(e) => setEstimateInput(e.target.value)}
                        placeholder="e.g. 350"
                        className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)]"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => showResult(setEstimate(job.id, Number(estimateInput)), () => setEstimateInput(""))}
                    >
                      {bi("Save Estimate", "حفظ التقدير")}
                    </Button>
                  </div>
                )}
                {job.currentStage === "Customer Approval" && job.customerApproved !== true && canPerform(role, "record_customer_approval") && (
                  <div className="border-t pt-4 [border-color:var(--color-border)] flex gap-2">
                    <Button onClick={() => showResult(approveCustomer(job.id, true))}><CheckCircle2 size={14} /> {bi("Approve", "موافقة")}</Button>
                    {job.customerApproved == null && <Button variant="danger" onClick={() => showResult(approveCustomer(job.id, false))}><XCircle size={14} /> {bi("Decline", "رفض")}</Button>}
                  </div>
                )}
                <div className="border-t pt-4 [border-color:var(--color-border)] flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={() => printEstimate({ job, customer, appliance, brand, parts: jobParts, inventoryItems })}
                  >
                    <Printer size={14} /> {bi("Print Estimate", "طباعة التقدير")}
                  </Button>
                  {job.finalAmount != null && (
                    <Button
                      variant="secondary"
                      onClick={() => printTaxInvoice({ job, customer, appliance, brand, parts: jobParts, inventoryItems })}
                    >
                      <Printer size={14} /> {bi("Print Tax Invoice (ZATCA)", "طباعة الفاتورة الضريبية")}
                    </Button>
                  )}
                </div>
                {job.jobType === "non_warranty" && (job.finalAmount != null || jobPayments.length > 0) && (
                  <div className="border-t pt-4 [border-color:var(--color-border)]">
                    <p className="text-xs text-[var(--color-ink-muted)] mb-2">{bi("Payment", "الدفع")}</p>
                    <PaymentPanel jobcardId={job.id} amount={job.finalAmount} payments={jobPayments} />
                  </div>
                )}
              </div>
            )}

            {tab === "Parts" && (
              <div className="space-y-5">
                {diagnosisSuggestions.length > 0 && (
                  <Card interactive className="!bg-[var(--color-brand-1)]/[0.04]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={14} className="text-[var(--color-brand-1)]" />
                      <p className="text-sm font-semibold">{bi("AI Diagnosis Assistant", "مساعد التشخيص الذكي")}</p>
                    </div>
                    <div className="space-y-3">
                      {diagnosisSuggestions.map((s, i) => (
                        <div key={i} className={i > 0 ? "border-t pt-3 [border-color:var(--color-border)]" : ""}>
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <p className="text-sm text-[var(--color-ink-primary)]">{s.cause}</p>
                            <Badge tone="brand">{Math.round(s.confidence * 100)}% match</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.partNames.map((name) => {
                              const item = inventoryItems.find((i) => i.name === name);
                              if (!item) return null;
                              return (
                                <button
                                  key={name}
                                  disabled={!canEditParts}
                                  onClick={() => showResult(addPartUsed(job.id, item.id, 1))}
                                  className="rounded-full border px-2.5 py-1 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-brand-1)] hover:border-[var(--color-brand-1)] disabled:cursor-not-allowed disabled:opacity-45 [border-color:var(--color-border)]"
                                >
                                  + {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <p className="text-[11px] text-[var(--color-ink-muted)]">Suggested from symptom pattern-matching against historical repairs, not a live model call.</p>
                    </div>
                  </Card>
                )}
                {canEditParts && <PartsGrid
                  items={inventoryItems}
                  stockByItem={stockByItem}
                  onAdd={(selections) => {
                    const results = selections.map((selection) => addPartUsed(job.id, selection.itemId, selection.qty));
                    const failed = results.find((result) => !result.ok);
                    if (failed) toast(failed.message, "error");
                    else if (results.length > 0) toast(`${results.length} part${results.length > 1 ? "s" : ""} issued to this job.`);
                  }}
                />}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--color-ink-muted)] border-y [border-color:var(--color-border)]">
                      <th className="py-2 font-medium">{bi("Part", "القطعة")}</th>
                      <th className="py-2 font-medium">{bi("Qty", "الكمية")}</th>
                      <th className="py-2 font-medium">{bi("Unit Price", "سعر الوحدة")}</th>
                      <th className="py-2 font-medium">{bi("Total", "الإجمالي")}</th>
                      <th className="py-2 font-medium text-right">{bi("Action", "الإجراء")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobParts.map((p) => {
                      const item = inventoryItems.find((i) => i.id === p.itemId);
                      return (
                        <tr key={p.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                          <td className="py-2">
                            {item?.name}
                            {item?.nameAr && <span dir="rtl" className="block text-[11px] text-[var(--color-ink-muted)]">{item.nameAr}</span>}
                          </td>
                          <td className="py-2 tabular-nums">{p.qty}</td>
                          <td className="py-2 tabular-nums">{formatCurrency(p.unitPrice)}</td>
                          <td className="py-2 tabular-nums">{formatCurrency(p.totalPrice)}</td>
                          <td className="py-2 text-right">
                            {canEditParts && (
                              <button type="button" title="Return part to inventory" onClick={() => showResult(removePartUsed(p.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-black/5 hover:text-[var(--color-status-critical)] dark:hover:bg-white/10">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {jobParts.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[var(--color-ink-muted)]">{bi("No parts recorded yet.", "لم يتم تسجيل أي قطع بعد.")}</td></tr>}
                  </tbody>
                  {jobParts.length > 0 && (
                    <tfoot>
                      <tr><td colSpan={3} className="py-2 pr-4 text-right font-medium">{bi("Parts total", "إجمالي القطع")}</td><td className="py-2 font-semibold tabular-nums">{formatCurrency(partsTotal)}</td><td /></tr>
                    </tfoot>
                  )}
                </table>

                <Card className="space-y-3">
                  <CardHeader title={bi("Removed Parts / Asset Custody", "القطع المُزالة / عهدة الأصول")} subtitle={bi("Old or faulty parts must be handed back to the customer — track that chain here", "يجب إعادة القطع القديمة أو التالفة للعميل — تتبع ذلك هنا")} />
                  <div className="space-y-2">
                    {jobRemovedParts.map((rp) => (
                      <div key={rp.id} className="rounded-lg border p-3 text-sm [border-color:var(--color-border)]">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-medium">{rp.description}</p>
                            <p className="text-[11px] text-[var(--color-ink-muted)]">
                              {rp.serialNo ? `Serial ${rp.serialNo} · ` : ""}Removed by {rp.removedBy} · {relativeTime(rp.removedAt)}
                            </p>
                          </div>
                          <Badge tone={rp.returnStatus === "returned_to_customer" ? "good" : rp.customerNotifiedAt ? "warning" : "neutral"}>
                            {rp.returnStatus === "returned_to_customer" ? bi("Returned to customer", "تم الإرجاع للعميل") : rp.customerNotifiedAt ? bi("Customer notified", "تم إبلاغ العميل") : bi("Pending", "قيد الانتظار")}
                          </Badge>
                        </div>
                        {rp.returnStatus === "returned_to_customer" && rp.returnConfirmedAt && (
                          <p className="text-[11px] text-[var(--color-status-good)] mt-1">Confirmed by {rp.returnConfirmedBy} · {relativeTime(rp.returnConfirmedAt)}</p>
                        )}
                        {rp.returnStatus !== "returned_to_customer" && (
                          <div className="flex gap-2 mt-2">
                            {!rp.customerNotifiedAt && (
                              <Button size="sm" variant="secondary" onClick={() => { notifyCustomerOfRemovedPart(rp.id); toast("Customer notified about removed part."); }}>
                                {bi("Notify Customer", "إبلاغ العميل")}
                              </Button>
                            )}
                            <Button size="sm" onClick={() => { confirmPartReturned(rp.id, "You"); toast("Marked as returned to customer."); }}>
                              <CheckCircle2 size={13} /> {bi("Confirm Returned", "تأكيد الإرجاع")}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {jobRemovedParts.length === 0 && <p className="text-sm text-[var(--color-ink-muted)] py-2">{bi("No removed parts logged yet.", "لم يتم تسجيل أي قطع مُزالة بعد.")}</p>}
                  </div>
                  <div className="border-t pt-3 [border-color:var(--color-border)] flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-40">
                      <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Part description", "وصف القطعة")}</p>
                      <input
                        value={removedDesc}
                        onChange={(e) => setRemovedDesc(e.target.value)}
                        placeholder="e.g. Old compressor (faulty)"
                        className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)]"
                      />
                    </div>
                    <div className="w-32">
                      <p className="text-xs text-[var(--color-ink-muted)] mb-1">{bi("Serial (optional)", "الرقم التسلسلي")}</p>
                      <input
                        value={removedSerial}
                        onChange={(e) => setRemovedSerial(e.target.value)}
                        placeholder="SN…"
                        className="w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none [border-color:var(--color-border)]"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      disabled={!removedDesc.trim()}
                      onClick={() => {
                        logRemovedPart(job.id, removedDesc.trim(), removedSerial.trim() || undefined, "You");
                        setRemovedDesc("");
                        setRemovedSerial("");
                        toast("Removed part logged.");
                      }}
                    >
                      {bi("Log Removed Part", "تسجيل قطعة مُزالة")}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {tab === "Attachments" && (
              <div className="space-y-3">
                <StagePhotoUpload label={bi(`Upload to ${job.currentStage}`, `رفع إلى ${STAGE_NAME_AR[job.currentStage]}`)} onFile={(file) => uploadPhoto(job.currentStage, file)} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {jobAttachments.map((a) => (
                    <div key={a.id} className="rounded-lg border [border-color:var(--color-border)] p-3">
                      <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-md bg-black/[0.04] dark:bg-white/[0.06]">
                        {a.fileUrl !== "#" ? <img src={a.fileUrl} alt={a.label} className="h-full w-full object-cover" /> : <ImagePlus size={20} className="text-[var(--color-ink-muted)]" />}
                      </div>
                      <p className="text-xs font-medium truncate">{a.label}</p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">{a.stageName} · {relativeTime(a.timestamp)}</p>
                    </div>
                  ))}
                  {jobAttachments.length === 0 && <p className="col-span-full text-sm text-[var(--color-ink-muted)] py-6 text-center">{bi("No attachments yet.", "لا توجد مرفقات بعد.")}</p>}
                </div>
              </div>
            )}

            {tab === "Communication" && (
              <div className="space-y-3">
                {jobComms.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-sm border-b pb-3 last:border-0 [border-color:var(--color-border)]">
                    <span className="mt-0.5 text-[var(--color-brand-1)]">{CHANNEL_ICON[c.channel]}</span>
                    <div className="flex-1">
                      <p>{c.message}</p>
                      <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{c.channel.toUpperCase()} · {relativeTime(c.timestamp)}</p>
                    </div>
                    <Badge tone={COMM_STATUS_TONE[c.status]}>{bi(c.status, COMM_STATUS_AR[c.status as keyof typeof COMM_STATUS_AR])}</Badge>
                  </div>
                ))}
                {jobComms.length === 0 && <p className="text-sm text-[var(--color-ink-muted)] py-6 text-center">{bi("No messages sent yet.", "لم يتم إرسال أي رسائل بعد.")}</p>}
              </div>
            )}
          </div>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          <Card interactive className="space-y-3">
            <CardHeader title={bi("Customer Tracking", "تتبع العميل")} subtitle={bi("Self-service link — no login required", "رابط ذاتي — بدون تسجيل دخول")} />
            <TrackingShare jobId={serviceOrder?.id ?? job.id} />
          </Card>

          {job.currentStage !== "Delivered" && (
            <Card className="space-y-3">
              <CardHeader title={bi(job.currentStage, STAGE_NAME_AR[job.currentStage])} subtitle={bi("Complete the stage requirements below", "أكمل متطلبات المرحلة أدناه")} />

              {requirements.length > 0 && (
                <div className="space-y-1.5">
                  {requirements.map((requirement) => (
                    <div key={requirement.label} className="flex items-start gap-2 text-xs">
                      {requirement.met ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--color-status-good)]" /> : <Circle size={14} className="mt-0.5 shrink-0 text-[var(--color-ink-muted)]" />}
                      <span className={requirement.met ? "text-[var(--color-ink-secondary)]" : "font-medium"}>{requirement.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {job.currentStage === "Warranty Validation" && canPerform(role, "create_job") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Field label={bi("Purchase bill number", "رقم فاتورة الشراء")}><Input value={billForm.billNo} onChange={(event) => setBillForm({ ...billForm, billNo: event.target.value })} /></Field>
                  <Field label={bi("Vendor", "المورد")}><Input value={billForm.vendorName} onChange={(event) => setBillForm({ ...billForm, vendorName: event.target.value })} /></Field>
                  <Field label={bi("Bill date", "تاريخ الفاتورة")}><Input type="date" value={billForm.billDate} onChange={(event) => setBillForm({ ...billForm, billDate: event.target.value })} /></Field>
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(savePurchaseBill(job.id, billForm))}>{bi("Save Purchase Bill", "حفظ فاتورة الشراء")}</Button>
                </div>
              )}

              {job.currentStage === "Diagnosis" && canPerform(role, "set_diagnosis") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Textarea rows={4} value={diagnosisInput} onChange={(event) => setDiagnosisInput(event.target.value)} placeholder="Record fault, checks, and likely cause..." />
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setDiagnosis(job.id, diagnosisInput))}>{bi("Save Diagnosis", "حفظ التشخيص")}</Button>
                </div>
              )}

              {job.currentStage === "Estimate" && canPerform(role, "set_estimate") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Field label={bi("Estimate amount (SAR)", "مبلغ التقدير (ريال)")}><Input type="number" min={partsTotal} value={estimateInput} onChange={(event) => setEstimateInput(event.target.value)} /></Field>
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setEstimate(job.id, Number(estimateInput)), () => setEstimateInput(""))}>{bi("Save Estimate", "حفظ التقدير")}</Button>
                </div>
              )}

              {job.currentStage === "Customer Approval" && job.customerApproved !== true && canPerform(role, "record_customer_approval") && (
                <div className="grid grid-cols-2 gap-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Button onClick={() => showResult(approveCustomer(job.id, true))}><CheckCircle2 size={14} /> {bi("Approve", "موافقة")}</Button>
                  {job.customerApproved == null && <Button variant="danger" onClick={() => showResult(approveCustomer(job.id, false))}><XCircle size={14} /> {bi("Decline", "رفض")}</Button>}
                </div>
              )}

              {job.currentStage === "Repair" && canPerform(role, "set_repair_notes") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Textarea rows={4} value={repairInput} onChange={(event) => setRepairInput(event.target.value)} placeholder="Record work completed and parts fitted..." />
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setRepairNotes(job.id, repairInput))}>{bi("Save Repair Notes", "حفظ ملاحظات الإصلاح")}</Button>
                </div>
              )}

              {job.currentStage === "QA" && canPerform(role, "approve_qa") && (
                <div className="border-t pt-3 [border-color:var(--color-border)]">
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setQaApproved(job.id, true))}><CheckCircle2 size={14} /> {bi("Approve QA", "اعتماد فحص الجودة")}</Button>
                </div>
              )}

              {job.currentStage === "Ready for Handover" && (
                <div className="space-y-3 border-t pt-3 [border-color:var(--color-border)]">
                  {job.jobType === "non_warranty" && canPerform(role, "finalize_job") && (
                    <div className="space-y-2">
                      <Field label={bi("Final amount (SAR)", "المبلغ النهائي (ريال)")}><Input type="number" min={partsTotal} value={finalAmountInput} onChange={(event) => setFinalAmountInput(event.target.value)} /></Field>
                      <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setFinalAmount(job.id, Number(finalAmountInput)))}>{bi("Confirm Final Amount", "تأكيد المبلغ النهائي")}</Button>
                    </div>
                  )}
                  {canPerform(role, "capture_signature") && (
                    <div className="space-y-2">
                      <Field label={bi("Customer signature / name", "توقيع / اسم العميل")}><Input value={signatureInput} onChange={(event) => setSignatureInput(event.target.value)} /></Field>
                      <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(captureCustomerSignature(job.id, signatureInput))}>{bi("Capture Signature", "تسجيل التوقيع")}</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {job.currentStage === "Ready for Handover" && job.jobType === "non_warranty" && (
            <PaymentPanel jobcardId={job.id} amount={job.finalAmount} payments={jobPayments} />
          )}

          <Card className="space-y-3">
            <CardHeader title={bi("Workflow", "سير العمل")} subtitle={workflow ? `${workflow.steps.length}-step ${job.jobType.replace("_", " ")} flow` : undefined} />
            {workflow && <WorkflowStepper steps={workflow.steps} currentIdx={currentStepIdx} orientation="vertical" />}
            {nextStep ? (
              <div className="border-t pt-3 [border-color:var(--color-border)] space-y-2">
                <p className="text-xs text-[var(--color-ink-muted)]">{bi("Next", "التالي")}: <span className="font-medium text-[var(--color-ink-secondary)]">{bi(nextStep.stepName, STAGE_NAME_AR[nextStep.stepName as StageName])}</span></p>
                <Button
                  className="w-full justify-center"
                  onClick={handleAdvance}
                  disabled={Boolean(accessBlocker) || blockers.length > 0}
                >
                  {bi(`Complete ${job.currentStage}`, `إكمال ${STAGE_NAME_AR[job.currentStage]}`)}
                </Button>
                {accessBlocker && <p className="flex items-start gap-1.5 text-[11px] text-[var(--color-status-serious)]"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{accessBlocker}</p>}
                {!accessBlocker && blockers.length > 0 && <p className="text-[11px] text-[var(--color-ink-muted)]">Complete {blockers.join(" and ").toLowerCase()} before advancing.</p>}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-status-good)] font-medium border-t pt-3 [border-color:var(--color-border)]">{bi("Job complete — delivered.", "اكتملت المهمة — تم التسليم.")}</p>
            )}
          </Card>

          <Card className="space-y-3">
            <CardHeader title={bi("Technician", "الفني")} />
            <div className="flex items-center gap-2">
              {technician ? <Avatar name={technician.name} color={technician.avatarColor} size={28} /> : <div className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10" />}
              <span className="text-sm">{technician?.name ?? bi("Unassigned", "غير مسند")}</span>
            </div>
            <Select value={techSelect} onChange={(e) => setTechSelect(e.target.value)}>
              <option value="">{bi("Reassign to…", "إعادة الإسناد إلى…")}</option>
              {eligibleTechnicians.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} - {candidate.zone} - {candidate.status}</option>)}
            </Select>
            <Button variant="secondary" className="w-full justify-center" disabled={!techSelect || !canPerform(role, "assign_technician")} onClick={() => showResult(assignTechnician(job.id, techSelect), () => setTechSelect(""))}>
              {bi("Assign", "إسناد")}
            </Button>
            {eligibleTechnicians.length === 0 && <p className="text-[11px] text-[var(--color-status-serious)]">No on-duty technician in this branch has the required {appliance?.category} skill.</p>}
          </Card>

          <Card className="space-y-3">
            <CardHeader title={bi("Send Message", "إرسال رسالة")} />
            <Select
              value={channel}
              onChange={(e) => {
                const ch = e.target.value as Channel;
                setChannel(ch);
                const stillValid = MESSAGE_TEMPLATES.find((t) => t.id === templateId && t.channels.includes(ch));
                applyTemplate(stillValid ? templateId : MESSAGE_TEMPLATES.find((t) => t.channels.includes(ch))!.id);
              }}
            >
              <option value="whatsapp">{bi("WhatsApp", CHANNEL_AR.whatsapp)}</option>
              <option value="sms">{bi("SMS", CHANNEL_AR.sms)}</option>
              <option value="email">{bi("Email", CHANNEL_AR.email)}</option>
            </Select>
            <Select value={selectedTemplate?.id} onChange={(e) => applyTemplate(e.target.value)}>
              {availableTemplates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to customer…" />
            <Button className="w-full justify-center" onClick={handleSend} disabled={!message.trim()}>{bi("Send", "إرسال")}</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
