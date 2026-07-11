import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Smartphone, Mail, CheckCircle2, XCircle, ImagePlus, Printer, Sparkles } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Tabs, Button, Select, Textarea, Badge, Avatar } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { PartsGrid } from "../../components/PartsGrid";
import { TrackingShare } from "../../components/TrackingShare";
import { formatCurrency, formatDateTime, relativeTime } from "../../lib/utils";
import { totalStockByItem } from "../../lib/selectors";
import { MESSAGE_TEMPLATES, renderTemplate } from "../../lib/templates";
import { printEstimate } from "../../lib/print";
import { printTaxInvoice } from "../../lib/zatca";
import { suggestDiagnosis } from "../../lib/diagnosisAI";
import type { StageName, Channel } from "../../lib/types";

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
    jobCards, customers, appliances, brands, technicians, workflows,
    stageHistory, attachments, partsUsed, communicationLogs, inventoryItems, inventoryStock, purchaseBills,
    role, advanceStage, assignTechnician, setEstimate, approveCustomer, addPartUsed, addAttachment, sendCommunication,
  } = useStore();

  const [tab, setTab] = useState("Timeline");
  const [techSelect, setTechSelect] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [templateId, setTemplateId] = useState("received");
  const [message, setMessage] = useState("");
  const [estimateInput, setEstimateInput] = useState("");

  const job = jobCards.find((j) => j.id === id);

  const workflow = useMemo(() => workflows.find((w) => w.jobType === job?.jobType), [workflows, job]);
  const jobHistory = useMemo(() => stageHistory.filter((h) => h.jobcardId === id), [stageHistory, id]);
  const jobAttachments = useMemo(() => attachments.filter((a) => a.jobcardId === id), [attachments, id]);
  const jobParts = useMemo(() => partsUsed.filter((p) => p.jobcardId === id), [partsUsed, id]);
  const jobComms = useMemo(() => communicationLogs.filter((c) => c.jobcardId === id), [communicationLogs, id]);
  const bill = useMemo(() => purchaseBills.find((b) => b.jobcardId === id), [purchaseBills, id]);
  const stockByItem = useMemo(() => totalStockByItem(inventoryStock), [inventoryStock]);
  const diagnosisSuggestions = useMemo(() => suggestDiagnosis(job?.problemDescription ?? ""), [job?.problemDescription]);

  useEffect(() => {
    if (job) applyTemplate("received");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

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
  const canApprove = ["supervisor", "manager", "admin"].includes(role);

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
    advanceStage(job!.id, nextStep.stepName as StageName, `Advanced to ${nextStep.stepName}`, "You");
  }

  function handleSend() {
    if (!message.trim()) return;
    sendCommunication(job!.id, channel, message.trim());
    setMessage("");
  }

  const partsTotal = jobParts.reduce((acc, p) => acc + p.totalPrice, 0);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold">{job.id}</h1>
          <JobStatusBadge status={job.status} />
          <JobTypeBadge jobType={job.jobType} />
          {job.oemClaimNo && <Badge tone="brand">OEM {job.oemClaimNo}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-5 items-start">
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
                            onClick={() => addAttachment(job.id, h.stageName, `${h.stageName} photo`)}
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
                {job.jobType === "non_warranty" && (
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
                      onClick={() => { const n = Number(estimateInput); if (n > 0) { setEstimate(job.id, n); setEstimateInput(""); } }}
                    >
                      Save Estimate
                    </Button>
                  </div>
                )}
                {job.currentStage === "Customer Approval" && job.customerApproved == null && (
                  <div className="border-t pt-4 [border-color:var(--color-border)] flex gap-2">
                    <Button onClick={() => approveCustomer(job.id, true)}><CheckCircle2 size={14} /> Approve</Button>
                    <Button variant="danger" onClick={() => approveCustomer(job.id, false)}><XCircle size={14} /> Decline</Button>
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
              </div>
            )}

            {tab === "Parts" && (
              <div className="space-y-5">
                {diagnosisSuggestions.length > 0 && (
                  <Card className="!bg-[var(--color-brand-1)]/[0.04]">
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
                                  onClick={() => addPartUsed(job.id, item.id, 1)}
                                  className="rounded-full border px-2.5 py-1 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-brand-1)] hover:border-[var(--color-brand-1)] [border-color:var(--color-border)]"
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
                <PartsGrid
                  items={inventoryItems}
                  stockByItem={stockByItem}
                  onAdd={(selections) => selections.forEach((s) => addPartUsed(job.id, s.itemId, s.qty))}
                />
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--color-ink-muted)] border-y [border-color:var(--color-border)]">
                      <th className="py-2 font-medium">Part</th>
                      <th className="py-2 font-medium">Qty</th>
                      <th className="py-2 font-medium">Unit Price</th>
                      <th className="py-2 font-medium">Total</th>
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
                        </tr>
                      );
                    })}
                    {jobParts.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-[var(--color-ink-muted)]">No parts recorded yet.</td></tr>}
                  </tbody>
                  {jobParts.length > 0 && (
                    <tfoot>
                      <tr><td colSpan={3} className="py-2 pr-4 text-right font-medium">Parts total</td><td className="py-2 font-semibold tabular-nums">{formatCurrency(partsTotal)}</td></tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {tab === "Attachments" && (
              <div className="space-y-3">
                <Button variant="secondary" onClick={() => addAttachment(job.id, job.currentStage, `${job.currentStage} photo`)}>
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
          <Card className="space-y-3">
            <CardHeader title="Customer Tracking" subtitle="Self-service link — no login required" />
            <TrackingShare jobId={job.id} />
          </Card>

          <Card className="space-y-3">
            <CardHeader title="Workflow" />
            <p className="text-xs text-[var(--color-ink-muted)]">Current stage</p>
            <p className="text-sm font-medium">{job.currentStage}</p>
            {nextStep ? (
              <>
                <p className="text-xs text-[var(--color-ink-muted)]">Next: {nextStep.stepName}{nextStep.approvalRequired ? ` (needs ${nextStep.approverRole} approval)` : ""}</p>
                <Button
                  className="w-full justify-center"
                  onClick={handleAdvance}
                  disabled={nextStep.approvalRequired && !canApprove}
                >
                  Advance to {nextStep.stepName}
                </Button>
                {nextStep.approvalRequired && !canApprove && (
                  <p className="text-[11px] text-[var(--color-status-serious)]">Switch role to Supervisor/Manager/Admin to approve this stage.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--color-status-good)] font-medium">Job complete — delivered.</p>
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
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.zone}</option>)}
            </Select>
            <Button variant="secondary" className="w-full justify-center" disabled={!techSelect} onClick={() => { assignTechnician(job.id, techSelect); setTechSelect(""); }}>
              Assign
            </Button>
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
