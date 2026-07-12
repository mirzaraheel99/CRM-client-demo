import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Smartphone, Mail, CheckCircle2, Circle, XCircle, ImagePlus, Printer, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Tabs, Button, Select, Textarea, Input, Field, Badge, Avatar, WorkflowStepper } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { PartsGrid } from "../../components/PartsGrid";
import { TrackingShare } from "../../components/TrackingShare";
import { formatCurrency, formatDateTime, relativeTime } from "../../lib/utils";
import { inventoryStockByBranch, totalStockByItem } from "../../lib/selectors";
import { MESSAGE_TEMPLATES, renderTemplate } from "../../lib/templates";
import { printEstimate } from "../../lib/print";
import { printTaxInvoice } from "../../lib/zatca";
import { suggestDiagnosis, suggestFromTelemetry } from "../../lib/diagnosisAI";
import { PaymentPanel } from "../../components/PaymentPanel";
import { toast } from "../../lib/toast";
import { Wifi } from "lucide-react";
import { canPerform } from "../../lib/permissions";
import { stageAccessBlocker, stageRequirements } from "../../lib/workflow";
import type { StageName, Channel, ActionResult } from "../../lib/types";

const TAB_LIST = ["Timeline", "Details", "Parts", "Attachments", "Communication"];

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

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    jobCards, customers, appliances, applianceTelemetry, brands, technicians, workflows,
    stageHistory, attachments, partsUsed, communicationLogs, inventoryItems, inventoryLocations, inventoryStock, purchaseBills, payments,
    role, selectedBranchId, advanceStage, assignTechnician, setDiagnosis, setEstimate, approveCustomer, setRepairNotes, setQaApproved,
    setFinalAmount, captureCustomerSignature, savePurchaseBill, addPartUsed, removePartUsed, addAttachment, sendCommunication,
  } = useStore();

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

  const workflow = useMemo(() => workflows.find((w) => w.jobType === job?.jobType), [workflows, job]);
  const jobHistory = useMemo(() => stageHistory.filter((h) => h.jobcardId === id), [stageHistory, id]);
  const jobAttachments = useMemo(() => attachments.filter((a) => a.jobcardId === id), [attachments, id]);
  const jobParts = useMemo(() => partsUsed.filter((p) => p.jobcardId === id), [partsUsed, id]);
  const jobComms = useMemo(() => communicationLogs.filter((c) => c.jobcardId === id), [communicationLogs, id]);
  const bill = useMemo(() => purchaseBills.find((b) => b.jobcardId === id), [purchaseBills, id]);
  const branchStock = useMemo(() => inventoryStockByBranch(inventoryStock, inventoryLocations, job?.branchId ?? "all"), [inventoryStock, inventoryLocations, job?.branchId]);
  const stockByItem = useMemo(() => totalStockByItem(branchStock), [branchStock]);
  const jobPayments = useMemo(() => payments.filter((p) => p.jobcardId === id), [payments, id]);
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
        <p className="text-sm text-[var(--color-ink-muted)]">Job card not found.</p>
        <Link to="/jobcards" className="text-sm text-[var(--color-brand-1)]">Back to job cards</Link>
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
        jobId: job!.id,
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

  const partsTotal = jobParts.reduce((acc, p) => acc + p.totalPrice, 0);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold tracking-tight">{job.id}</h1>
          <JobStatusBadge status={job.status} />
          <JobTypeBadge jobType={job.jobType} />
          {job.oemClaimNo && <Badge tone="brand">OEM {job.oemClaimNo}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-5 items-start animate-rise-in" style={{ animationDelay: "40ms" }}>
        {/* Left panel */}
        <Card className="space-y-4">
          <div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">Customer</p>
            <p className="text-sm font-medium">{customer?.name}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{customer?.phone}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{customer?.address}</p>
            <div className="mt-1.5">
              <Badge tone={customer?.whatsappVerified ? "good" : "warning"}>
                WhatsApp {customer?.whatsappVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </div>
          <div className="border-t pt-3 [border-color:var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">Appliance</p>
            <p className="text-sm font-medium">{appliance?.model}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">{brand?.name} · {appliance?.category}</p>
            <p className="text-xs text-[var(--color-ink-secondary)]">Serial {appliance?.serialNo}</p>
            {appliance?.imeiNo && <p className="text-xs text-[var(--color-ink-secondary)]">IMEI {appliance.imeiNo}</p>}
          </div>
          {appliance?.isSmartConnected && (
            <div className="border-t pt-3 [border-color:var(--color-border)]">
              <div className="flex items-center gap-1.5 mb-1">
                <Wifi size={13} className="text-[var(--color-status-good)]" />
                <p className="text-xs font-medium">Smart Diagnostics</p>
              </div>
              {telemetry?.lastErrorCode ? (
                <>
                  <Badge tone="serious">Error {telemetry.lastErrorCode}</Badge>
                  <p className="text-xs text-[var(--color-ink-secondary)] mt-1">{telemetry.lastErrorDescription}</p>
                </>
              ) : (
                <p className="text-xs text-[var(--color-ink-secondary)]">No errors reported</p>
              )}
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                {telemetry?.cycleCount.toLocaleString()} cycles · synced {telemetry ? relativeTime(telemetry.lastSyncAt) : "—"}
              </p>
            </div>
          )}
          <div className="border-t pt-3 [border-color:var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">Warranty</p>
            <Badge tone={appliance?.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{appliance?.warrantyStatus}</Badge>
            {bill && <p className="text-xs text-[var(--color-ink-secondary)] mt-2">Bill {bill.billNo} · {bill.vendorName}</p>}
          </div>
          <div className="border-t pt-3 [border-color:var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)] mb-1">Problem reported</p>
            <p className="text-sm text-[var(--color-ink-secondary)]">{job.problemDescription}</p>
          </div>
        </Card>

        {/* Center tabs */}
        <Card padded={false}>
          <div className="px-5 pt-4"><Tabs tabs={TAB_LIST} active={tab} onChange={setTab} /></div>
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
                          <p className="text-sm font-medium">{h.stageName}</p>
                          <span className="text-xs text-[var(--color-ink-muted)]">{relativeTime(h.timestamp)}</span>
                        </div>
                        <p className="text-xs text-[var(--color-ink-secondary)]">{h.notes}</p>
                        <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">by {h.changedBy} · {formatDateTime(h.timestamp)}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {stagePhotos.map((a) => (
                            <div key={a.id} className="h-10 w-10 rounded-md bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center" title={a.label}>
                              <ImagePlus size={14} className="text-[var(--color-ink-muted)]" />
                            </div>
                          ))}
                          <button
                            onClick={() => showResult(addAttachment(job.id, h.stageName, `${h.stageName} photo`))}
                            className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-brand-1)] hover:border-[var(--color-brand-1)] [border-color:var(--color-border)]"
                          >
                            <ImagePlus size={12} /> Add photo
                          </button>
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
                        <p className="text-sm font-medium">{c.channel.toUpperCase()} sent</p>
                        <Badge tone={COMM_STATUS_TONE[c.status]}>{c.status}</Badge>
                        <span className="text-xs text-[var(--color-ink-muted)]">{relativeTime(c.timestamp)}</span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-secondary)]">{c.message}</p>
                    </li>
                  );
                })}
                {timelineEntries.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No activity yet.</p>}
              </ol>
            )}

            {tab === "Details" && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Estimate amount</p>
                    <p className="font-medium tabular-nums">{formatCurrency(job.estimateAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Final amount</p>
                    <p className="font-medium tabular-nums">{formatCurrency(job.finalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Customer approval</p>
                    <p className="font-medium">{job.customerApproved == null ? "Pending" : job.customerApproved ? "Approved" : "Declined"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Created</p>
                    <p className="font-medium">{formatDateTime(job.createdAt)}</p>
                  </div>
                </div>
                {job.jobType === "non_warranty" && canPerform(role, "set_estimate") && (
                  <div className="border-t pt-4 [border-color:var(--color-border)] flex items-end gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-[var(--color-ink-muted)] mb-1">Set / update estimate (SAR)</p>
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
                      Save Estimate
                    </Button>
                  </div>
                )}
                {job.currentStage === "Customer Approval" && job.customerApproved !== true && canPerform(role, "record_customer_approval") && (
                  <div className="border-t pt-4 [border-color:var(--color-border)] flex gap-2">
                    <Button onClick={() => showResult(approveCustomer(job.id, true))}><CheckCircle2 size={14} /> Approve</Button>
                    {job.customerApproved == null && <Button variant="danger" onClick={() => showResult(approveCustomer(job.id, false))}><XCircle size={14} /> Decline</Button>}
                  </div>
                )}
                <div className="border-t pt-4 [border-color:var(--color-border)] flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={() => printEstimate({ job, customer, appliance, brand, parts: jobParts, inventoryItems })}
                  >
                    <Printer size={14} /> Print Estimate
                  </Button>
                  {job.finalAmount != null && (
                    <Button
                      variant="secondary"
                      onClick={() => printTaxInvoice({ job, customer, appliance, brand, parts: jobParts, inventoryItems })}
                    >
                      <Printer size={14} /> Print Tax Invoice (ZATCA)
                    </Button>
                  )}
                </div>
                {job.jobType === "non_warranty" && (job.finalAmount != null || jobPayments.length > 0) && (
                  <div className="border-t pt-4 [border-color:var(--color-border)]">
                    <p className="text-xs text-[var(--color-ink-muted)] mb-2">Payment</p>
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
                      <p className="text-sm font-semibold">AI Diagnosis Assistant</p>
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
                      <th className="py-2 font-medium">Part</th>
                      <th className="py-2 font-medium">Qty</th>
                      <th className="py-2 font-medium">Unit Price</th>
                      <th className="py-2 font-medium">Total</th>
                      <th className="py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobParts.map((p) => {
                      const item = inventoryItems.find((i) => i.id === p.itemId);
                      return (
                        <tr key={p.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                          <td className="py-2">{item?.name}</td>
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
                    {jobParts.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[var(--color-ink-muted)]">No parts recorded yet.</td></tr>}
                  </tbody>
                  {jobParts.length > 0 && (
                    <tfoot>
                      <tr><td colSpan={3} className="py-2 pr-4 text-right font-medium">Parts total</td><td className="py-2 font-semibold tabular-nums">{formatCurrency(partsTotal)}</td><td /></tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {tab === "Attachments" && (
              <div className="space-y-3">
                <Button variant="secondary" onClick={() => showResult(addAttachment(job.id, job.currentStage, `${job.currentStage} photo`))}>
                  <ImagePlus size={14} /> Upload photo (simulated)
                </Button>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {jobAttachments.map((a) => (
                    <div key={a.id} className="rounded-lg border [border-color:var(--color-border)] p-3">
                      <div className="h-20 rounded-md bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-2">
                        <ImagePlus size={20} className="text-[var(--color-ink-muted)]" />
                      </div>
                      <p className="text-xs font-medium truncate">{a.label}</p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">{a.stageName} · {relativeTime(a.timestamp)}</p>
                    </div>
                  ))}
                  {jobAttachments.length === 0 && <p className="col-span-full text-sm text-[var(--color-ink-muted)] py-6 text-center">No attachments yet.</p>}
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
                    <Badge tone={COMM_STATUS_TONE[c.status]}>{c.status}</Badge>
                  </div>
                ))}
                {jobComms.length === 0 && <p className="text-sm text-[var(--color-ink-muted)] py-6 text-center">No messages sent yet.</p>}
              </div>
            )}
          </div>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          <Card interactive className="space-y-3">
            <CardHeader title="Customer Tracking" subtitle="Self-service link — no login required" />
            <TrackingShare jobId={job.id} />
          </Card>

          {job.currentStage !== "Delivered" && (
            <Card className="space-y-3">
              <CardHeader title={job.currentStage} subtitle="Complete the stage requirements below" />

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
                  <Field label="Purchase bill number"><Input value={billForm.billNo} onChange={(event) => setBillForm({ ...billForm, billNo: event.target.value })} /></Field>
                  <Field label="Vendor"><Input value={billForm.vendorName} onChange={(event) => setBillForm({ ...billForm, vendorName: event.target.value })} /></Field>
                  <Field label="Bill date"><Input type="date" value={billForm.billDate} onChange={(event) => setBillForm({ ...billForm, billDate: event.target.value })} /></Field>
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(savePurchaseBill(job.id, billForm))}>Save Purchase Bill</Button>
                </div>
              )}

              {job.currentStage === "Diagnosis" && canPerform(role, "set_diagnosis") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Textarea rows={4} value={diagnosisInput} onChange={(event) => setDiagnosisInput(event.target.value)} placeholder="Record fault, checks, and likely cause..." />
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setDiagnosis(job.id, diagnosisInput))}>Save Diagnosis</Button>
                </div>
              )}

              {job.currentStage === "Estimate" && canPerform(role, "set_estimate") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Field label="Estimate amount (SAR)"><Input type="number" min={partsTotal} value={estimateInput} onChange={(event) => setEstimateInput(event.target.value)} /></Field>
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setEstimate(job.id, Number(estimateInput)), () => setEstimateInput(""))}>Save Estimate</Button>
                </div>
              )}

              {job.currentStage === "Customer Approval" && job.customerApproved !== true && canPerform(role, "record_customer_approval") && (
                <div className="grid grid-cols-2 gap-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Button onClick={() => showResult(approveCustomer(job.id, true))}><CheckCircle2 size={14} /> Approve</Button>
                  {job.customerApproved == null && <Button variant="danger" onClick={() => showResult(approveCustomer(job.id, false))}><XCircle size={14} /> Decline</Button>}
                </div>
              )}

              {job.currentStage === "Repair" && canPerform(role, "set_repair_notes") && (
                <div className="space-y-2 border-t pt-3 [border-color:var(--color-border)]">
                  <Textarea rows={4} value={repairInput} onChange={(event) => setRepairInput(event.target.value)} placeholder="Record work completed and parts fitted..." />
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setRepairNotes(job.id, repairInput))}>Save Repair Notes</Button>
                </div>
              )}

              {job.currentStage === "QA" && canPerform(role, "approve_qa") && (
                <div className="border-t pt-3 [border-color:var(--color-border)]">
                  <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setQaApproved(job.id, true))}><CheckCircle2 size={14} /> Approve QA</Button>
                </div>
              )}

              {job.currentStage === "Ready for Handover" && (
                <div className="space-y-3 border-t pt-3 [border-color:var(--color-border)]">
                  {job.jobType === "non_warranty" && canPerform(role, "finalize_job") && (
                    <div className="space-y-2">
                      <Field label="Final amount (SAR)"><Input type="number" min={partsTotal} value={finalAmountInput} onChange={(event) => setFinalAmountInput(event.target.value)} /></Field>
                      <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(setFinalAmount(job.id, Number(finalAmountInput)))}>Confirm Final Amount</Button>
                    </div>
                  )}
                  {canPerform(role, "capture_signature") && (
                    <div className="space-y-2">
                      <Field label="Customer signature / name"><Input value={signatureInput} onChange={(event) => setSignatureInput(event.target.value)} /></Field>
                      <Button variant="secondary" className="w-full justify-center" onClick={() => showResult(captureCustomerSignature(job.id, signatureInput))}>Capture Signature</Button>
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
            <CardHeader title="Workflow" subtitle={workflow ? `${workflow.steps.length}-step ${job.jobType.replace("_", " ")} flow` : undefined} />
            {workflow && <WorkflowStepper steps={workflow.steps} currentIdx={currentStepIdx} orientation="vertical" />}
            {nextStep ? (
              <div className="border-t pt-3 [border-color:var(--color-border)] space-y-2">
                <p className="text-xs text-[var(--color-ink-muted)]">Next: <span className="font-medium text-[var(--color-ink-secondary)]">{nextStep.stepName}</span></p>
                <Button
                  className="w-full justify-center"
                  onClick={handleAdvance}
                  disabled={Boolean(accessBlocker) || blockers.length > 0}
                >
                  Complete {job.currentStage}
                </Button>
                {accessBlocker && <p className="flex items-start gap-1.5 text-[11px] text-[var(--color-status-serious)]"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{accessBlocker}</p>}
                {!accessBlocker && blockers.length > 0 && <p className="text-[11px] text-[var(--color-ink-muted)]">Complete {blockers.join(" and ").toLowerCase()} before advancing.</p>}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-status-good)] font-medium border-t pt-3 [border-color:var(--color-border)]">Job complete — delivered.</p>
            )}
          </Card>

          <Card className="space-y-3">
            <CardHeader title="Technician" />
            <div className="flex items-center gap-2">
              {technician ? <Avatar name={technician.name} color={technician.avatarColor} size={28} /> : <div className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10" />}
              <span className="text-sm">{technician?.name ?? "Unassigned"}</span>
            </div>
            <Select value={techSelect} onChange={(e) => setTechSelect(e.target.value)}>
              <option value="">Reassign to…</option>
              {eligibleTechnicians.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} - {candidate.zone} - {candidate.status}</option>)}
            </Select>
            <Button variant="secondary" className="w-full justify-center" disabled={!techSelect || !canPerform(role, "assign_technician")} onClick={() => showResult(assignTechnician(job.id, techSelect), () => setTechSelect(""))}>
              Assign
            </Button>
            {eligibleTechnicians.length === 0 && <p className="text-[11px] text-[var(--color-status-serious)]">No on-duty technician in this branch has the required {appliance?.category} skill.</p>}
          </Card>

          <Card className="space-y-3">
            <CardHeader title="Send Message" />
            <Select
              value={channel}
              onChange={(e) => {
                const ch = e.target.value as Channel;
                setChannel(ch);
                const stillValid = MESSAGE_TEMPLATES.find((t) => t.id === templateId && t.channels.includes(ch));
                applyTemplate(stillValid ? templateId : MESSAGE_TEMPLATES.find((t) => t.channels.includes(ch))!.id);
              }}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </Select>
            <Select value={selectedTemplate?.id} onChange={(e) => applyTemplate(e.target.value)}>
              {availableTemplates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to customer…" />
            <Button className="w-full justify-center" onClick={handleSend} disabled={!message.trim()}>Send</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
