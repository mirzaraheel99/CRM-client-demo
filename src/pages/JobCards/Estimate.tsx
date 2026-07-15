import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Printer, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Button, Select, Input, Field, Badge, Textarea } from "../../components/ui";
import { JobStatusBadge } from "../../components/StatusBadge";
import { formatCurrency, formatDate } from "../../lib/utils";
import { printEstimate } from "../../lib/print";
import { MESSAGE_TEMPLATES, renderTemplate } from "../../lib/templates";
import { toast } from "../../lib/toast";
import { canPerform } from "../../lib/permissions";
import { bi } from "../../lib/domainAr";
import type { ActionResult, EstimateLineKind } from "../../lib/types";

const ESTIMATE_LINE_KINDS: EstimateLineKind[] = ["labor", "part", "other", "discount"];
const ESTIMATE_KIND_LABEL: Record<EstimateLineKind, string> = {
  labor: bi("Labor", "عمالة"),
  part: bi("Part", "قطعة"),
  other: bi("Other charge", "رسوم أخرى"),
  discount: bi("Discount", "خصم"),
};
const ESTIMATE_KIND_TONE: Record<EstimateLineKind, "neutral" | "brand" | "warning" | "good"> = {
  labor: "neutral",
  part: "brand",
  other: "warning",
  discount: "good",
};

function showResult(action: ActionResult, onSuccess?: () => void) {
  toast(action.message, action.ok ? "success" : "error");
  if (action.ok) onSuccess?.();
}

function hijriDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default function EstimatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    jobCards, customers, appliances, brands, inventoryItems, estimateLineItems, role,
    addEstimateLine, updateEstimateLine, removeEstimateLine, setEstimateValidUntil, setEstimateHeader,
    approveCustomer, sendCommunication,
  } = useStore();

  const job = jobCards.find((candidate) => candidate.id === id);
  const customer = customers.find((c) => c.id === job?.customerId);
  const appliance = appliances.find((a) => a.id === job?.applianceId);
  const brand = brands.find((b) => b.id === appliance?.brandId);
  const jobEstimateLines = estimateLineItems.filter((line) => line.jobcardId === id);

  const [newLineKind, setNewLineKind] = useState<EstimateLineKind>("labor");
  const [newLineLabel, setNewLineLabel] = useState("");
  const [newLineDescriptionAr, setNewLineDescriptionAr] = useState("");
  const [newLineCatNo, setNewLineCatNo] = useState("");
  const [newLineItemId, setNewLineItemId] = useState("");
  const [newLineQty, setNewLineQty] = useState("1");
  const [newLineUnitPrice, setNewLineUnitPrice] = useState("");
  const [newLineDiscount, setNewLineDiscount] = useState("");
  const [newLineNotes, setNewLineNotes] = useState("");
  const [validUntilInput, setValidUntilInput] = useState("");
  const [headerForm, setHeaderForm] = useState({
    preparedBy: "", termsOfPayment: "", poNumber: "", notes: "",
    previousQuoteNo: "", customerRequest: "", deliveryLeadTime: "", subject: "",
  });

  useEffect(() => {
    if (!job) return;
    setValidUntilInput(job.estimateValidUntil ?? "");
    setHeaderForm({
      preparedBy: job.estimatePreparedBy ?? "",
      termsOfPayment: job.estimateTermsOfPayment ?? "",
      poNumber: job.estimatePoNumber ?? "",
      notes: job.estimateNotes ?? "",
      previousQuoteNo: job.estimatePreviousQuoteNo ?? "",
      customerRequest: job.estimateCustomerRequest ?? "",
      deliveryLeadTime: job.estimateDeliveryLeadTime ?? "",
      subject: job.estimateSubject ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[var(--color-ink-muted)]">{bi("Job card not found.", "لم يتم العثور على بطاقة العمل.")}</p>
        <Link to="/jobcards" className="text-sm text-[var(--color-brand-1)]">{bi("Back to job cards", "العودة إلى بطاقات العمل")}</Link>
      </div>
    );
  }

  if (job.jobType !== "non_warranty") {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[var(--color-ink-muted)]">{bi("Warranty jobs do not carry a customer estimate.", "لا تتضمن مهام الضمان تقديراً للعميل.")}</p>
        <Link to={`/jobcards/${job.id}`} className="text-sm text-[var(--color-brand-1)]">{bi("Back to job card", "العودة إلى بطاقة العمل")}</Link>
      </div>
    );
  }

  const editable = canPerform(role, "set_estimate");
  const canAddLine = editable && (job.currentStage === "Estimate" || job.currentStage === "Customer Approval" || (job.currentStage === "Diagnosis" && job.diagnosisNotes));
  const estimateNo = `EST-${job.documentNo}`;

  function sendEstimateWhatsapp(): ActionResult {
    if (!job || !customer) return { ok: false, message: "Customer not found." };
    const template = MESSAGE_TEMPLATES.find((t) => t.id === "estimate_document")!;
    const trackingLink = `${window.location.origin}${import.meta.env.BASE_URL}track/${job.id}`;
    const text = renderTemplate(template.body, {
      customer: customer.name.split(" ")[0],
      appliance: appliance?.model ?? "",
      jobId: job.documentNo,
      estimateNo,
      amount: job.estimateAmount == null ? "pending" : `SAR ${job.estimateAmount.toLocaleString()}`,
      validUntil: job.estimateValidUntil ? formatDate(job.estimateValidUntil) : "further notice",
      link: trackingLink,
    });
    return sendCommunication(job.id, "whatsapp", text);
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(`/jobcards/${job.id}`)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]">
        <ArrowLeft size={15} /> {bi("Back to job card", "العودة إلى بطاقة العمل")}
      </button>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 [border-color:var(--color-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{estimateNo}</h1>
            <JobStatusBadge status={job.status} />
            {job.estimateValidUntil && <Badge tone="neutral">{bi("Valid until", "صالح حتى")} {formatDate(job.estimateValidUntil)}</Badge>}
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-ink-muted)]">{job.documentNo} · {bi("Sequence", "تسلسل")} {String(job.sequenceNo).padStart(2, "0")}</p>
            <p className="text-sm font-medium">{customer?.name} · {appliance?.model}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardHeader title={bi("Estimate details", "تفاصيل التقدير")} subtitle={bi("Header information printed on the quotation", "معلومات الرأس المطبوعة على عرض السعر")} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={bi("Previous quote no.", "رقم عرض السعر السابق")}>
            <Input
              value={headerForm.previousQuoteNo}
              onChange={(event) => setHeaderForm({ ...headerForm, previousQuoteNo: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { previousQuoteNo: headerForm.previousQuoteNo }))}
              disabled={!editable}
            />
          </Field>
          <Field label={bi("Customer request", "طلب العميل")}>
            <Input
              value={headerForm.customerRequest}
              placeholder={bi("e.g. Verbal, Written", "مثال: شفهي، مكتوب")}
              onChange={(event) => setHeaderForm({ ...headerForm, customerRequest: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { customerRequest: headerForm.customerRequest }))}
              disabled={!editable}
            />
          </Field>
          <Field label={bi("Quote subject", "موضوع العرض")}>
            <Input
              value={headerForm.subject}
              placeholder={bi("e.g. Quote for AC compressor repair", "مثال: عرض سعر لإصلاح ضاغط المكيف")}
              onChange={(event) => setHeaderForm({ ...headerForm, subject: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { subject: headerForm.subject }))}
              disabled={!editable}
            />
          </Field>

          <Field label={bi("Terms of payment", "شروط الدفع")}>
            <Input
              value={headerForm.termsOfPayment}
              placeholder={bi("e.g. 50% advance", "مثال: 50% مقدماً")}
              onChange={(event) => setHeaderForm({ ...headerForm, termsOfPayment: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { termsOfPayment: headerForm.termsOfPayment }))}
              disabled={!editable}
            />
          </Field>
          <Field label={bi("Delivery / lead time", "التسليم / المدة")}>
            <Input
              value={headerForm.deliveryLeadTime}
              placeholder={bi("e.g. 3-4 days", "مثال: 3-4 أيام")}
              onChange={(event) => setHeaderForm({ ...headerForm, deliveryLeadTime: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { deliveryLeadTime: headerForm.deliveryLeadTime }))}
              disabled={!editable}
            />
          </Field>
          <Field label={bi("Customer PO / reference", "رقم أمر الشراء / المرجع")}>
            <Input
              value={headerForm.poNumber}
              onChange={(event) => setHeaderForm({ ...headerForm, poNumber: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { poNumber: headerForm.poNumber }))}
              disabled={!editable}
            />
          </Field>

          <Field label={bi("Valid until", "صالح حتى")}>
            <div className="flex gap-2">
              <Input type="date" value={validUntilInput} onChange={(event) => setValidUntilInput(event.target.value)} disabled={!editable} />
              {editable && <Button size="sm" variant="secondary" onClick={() => showResult(setEstimateValidUntil(job.id, validUntilInput))}>{bi("Save", "حفظ")}</Button>}
            </div>
          </Field>
          <Field label={bi("Prepared by (sales executive)", "أُعد بواسطة (مندوب المبيعات)")}>
            <Input
              value={headerForm.preparedBy}
              onChange={(event) => setHeaderForm({ ...headerForm, preparedBy: event.target.value })}
              onBlur={() => editable && showResult(setEstimateHeader(job.id, { preparedBy: headerForm.preparedBy }))}
              disabled={!editable}
            />
          </Field>
          <Field label={bi("Manufactured by", "الشركة المصنعة")}><Input value={brand?.name ?? "—"} disabled /></Field>

          <Field label={bi("Hijri date", "التاريخ الهجري")}><Input value={hijriDate(job.createdAt)} disabled /></Field>
          <Field label={bi("Currency", "العملة")}><Input value="Saudi Riyal (SAR)" disabled /></Field>
          <Field label={bi("Exchange rate", "سعر الصرف")}><Input value="1.0000000000" disabled /></Field>
        </div>
        <Field label={bi("Notes / terms (optional)", "ملاحظات / شروط (اختياري)")}>
          <Textarea
            rows={2}
            value={headerForm.notes}
            placeholder={bi("Visible on the printed estimate", "تظهر في التقدير المطبوع")}
            onChange={(event) => setHeaderForm({ ...headerForm, notes: event.target.value })}
            onBlur={() => editable && showResult(setEstimateHeader(job.id, { notes: headerForm.notes }))}
            disabled={!editable}
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <CardHeader title={bi("Line items", "بنود التقدير")} />

        {jobEstimateLines.length > 0 && (
          <div className="overflow-x-auto rounded-lg border [border-color:var(--color-border)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                  <th className="px-3 py-2 font-medium">{bi("Cat No", "رقم الصنف")}</th>
                  <th className="px-3 py-2 font-medium">{bi("Description", "الوصف")}</th>
                  <th className="px-3 py-2 font-medium">{bi("Tax", "الضريبة")}</th>
                  <th className="px-3 py-2 text-right font-medium">{bi("Qty", "الكمية")}</th>
                  <th className="px-3 py-2 text-right font-medium">{bi("Rate", "السعر")}</th>
                  <th className="px-3 py-2 text-right font-medium">{bi("Gross", "الإجمالي")}</th>
                  <th className="px-3 py-2 text-right font-medium">{bi("Discount", "الخصم")}</th>
                  {editable && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {jobEstimateLines.map((line) => {
                  const gross = line.qty * line.unitPrice;
                  return (
                    <tr key={line.id} className="border-t transition-colors [border-color:var(--color-border)] hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2 align-top">
                        {editable ? (
                          <input
                            defaultValue={line.catNo ?? ""}
                            placeholder="—"
                            onBlur={(event) => { const value = event.target.value.trim(); if (value !== (line.catNo ?? "")) showResult(updateEstimateLine(line.id, { catNo: value })); }}
                            className="w-20 min-w-0 rounded px-1 py-0.5 text-sm outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                          />
                        ) : (line.catNo ?? "—")}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={ESTIMATE_KIND_TONE[line.kind]}>{ESTIMATE_KIND_LABEL[line.kind]}</Badge>
                          {editable ? (
                            <input
                              defaultValue={line.label}
                              onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== line.label) showResult(updateEstimateLine(line.id, { label: value })); }}
                              className="min-w-0 flex-1 rounded px-1 py-0.5 text-sm outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                            />
                          ) : <span>{line.label}</span>}
                        </div>
                        {editable ? (
                          <input
                            dir="rtl"
                            defaultValue={line.descriptionAr ?? ""}
                            placeholder={bi("Arabic description...", "الوصف بالعربية...")}
                            onBlur={(event) => { const value = event.target.value.trim(); if (value !== (line.descriptionAr ?? "")) showResult(updateEstimateLine(line.id, { descriptionAr: value })); }}
                            className="mt-0.5 w-full rounded px-1 py-0.5 text-xs text-[var(--color-ink-muted)] outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                          />
                        ) : (line.descriptionAr && <p dir="rtl" className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{line.descriptionAr}</p>)}
                        {editable ? (
                          <input
                            defaultValue={line.notes ?? ""}
                            placeholder={bi("Add a note...", "أضف ملاحظة...")}
                            onBlur={(event) => { const value = event.target.value.trim(); if (value !== (line.notes ?? "")) showResult(updateEstimateLine(line.id, { notes: value })); }}
                            className="mt-0.5 w-full rounded px-1 py-0.5 text-xs text-[var(--color-ink-muted)] outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                          />
                        ) : (line.notes && <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{line.notes}</p>)}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-[var(--color-ink-muted)]">{line.kind === "discount" ? "—" : bi("VAT 15%", "ضريبة 15%")}</td>
                      <td className="px-3 py-2 align-top text-right">
                        {editable ? (
                          <input
                            type="number"
                            defaultValue={line.qty}
                            onBlur={(event) => { const qty = Number(event.target.value); if (Number.isFinite(qty) && qty > 0 && qty !== line.qty) showResult(updateEstimateLine(line.id, { qty })); }}
                            className="w-16 rounded px-1 py-0.5 text-right tabular-nums outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                          />
                        ) : <span className="tabular-nums">{line.qty}</span>}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        {editable ? (
                          <input
                            type="number"
                            defaultValue={line.unitPrice}
                            onBlur={(event) => { const unitPrice = Number(event.target.value); if (Number.isFinite(unitPrice) && unitPrice !== line.unitPrice) showResult(updateEstimateLine(line.id, { unitPrice })); }}
                            className="w-24 rounded px-1 py-0.5 text-right tabular-nums outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                          />
                        ) : <span className="tabular-nums">{formatCurrency(line.unitPrice)}</span>}
                      </td>
                      <td className="px-3 py-2 align-top text-right font-medium tabular-nums">{formatCurrency(gross)}</td>
                      <td className="px-3 py-2 align-top text-right">
                        {line.kind === "discount" ? (
                          "—"
                        ) : editable ? (
                          <input
                            type="number"
                            min="0"
                            defaultValue={line.discountAmount ?? 0}
                            onBlur={(event) => { const discountAmount = Number(event.target.value); if (Number.isFinite(discountAmount) && discountAmount !== (line.discountAmount ?? 0)) showResult(updateEstimateLine(line.id, { discountAmount })); }}
                            className="w-20 rounded px-1 py-0.5 text-right tabular-nums outline-none focus:bg-black/[0.04] dark:focus:bg-white/[0.06]"
                          />
                        ) : <span className="tabular-nums">{formatCurrency(line.discountAmount ?? 0)}</span>}
                      </td>
                      {editable && (
                        <td className="px-3 py-2 align-top text-right">
                          <button onClick={() => showResult(removeEstimateLine(line.id))} className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-critical)]" title="Remove line item" aria-label="Remove line item">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t [border-color:var(--color-border)]"><td colSpan={6} className="px-3 py-2 text-right text-[var(--color-ink-muted)]">{bi("Subtotal (excl. VAT)", "الإجمالي (غير شامل الضريبة)")}</td><td className="px-3 py-2 text-right tabular-nums">{formatCurrency((job.estimateAmount ?? 0) / 1.15)}</td></tr>
                <tr className="border-t [border-color:var(--color-border)]"><td colSpan={6} className="px-3 py-2 text-right text-[var(--color-ink-muted)]">{bi("VAT (15%)", "ضريبة القيمة المضافة (15%)")}</td><td className="px-3 py-2 text-right tabular-nums">{formatCurrency((job.estimateAmount ?? 0) - (job.estimateAmount ?? 0) / 1.15)}</td></tr>
                <tr className="border-t font-semibold [border-color:var(--color-border)]"><td colSpan={6} className="px-3 py-2 text-right">{bi("Net (incl. VAT)", "الصافي (شامل الضريبة)")}</td><td className="px-3 py-2 text-right tabular-nums">{formatCurrency(job.estimateAmount)}</td></tr>
              </tfoot>
            </table>
          </div>
        )}
        {jobEstimateLines.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No line items yet.", "لا توجد بنود بعد.")}</p>}

        {canAddLine && (
          <div className="space-y-3 rounded-lg border [border-color:var(--color-border)] bg-[var(--color-surface-1)] p-3">
            <p className="text-xs font-semibold text-[var(--color-ink-secondary)]">{bi("Add line item", "إضافة بند")}</p>
            <div className="grid gap-2 sm:grid-cols-[100px_130px_1fr_70px_110px_110px_auto] sm:items-end">
              <Field label={bi("Cat No", "رقم الصنف")}><Input value={newLineCatNo} onChange={(event) => setNewLineCatNo(event.target.value)} placeholder="—" /></Field>
              <Field label={bi("Type", "النوع")}>
                <Select value={newLineKind} onChange={(event) => { setNewLineKind(event.target.value as EstimateLineKind); setNewLineLabel(""); setNewLineItemId(""); setNewLineUnitPrice(""); setNewLineDiscount(""); }}>
                  {ESTIMATE_LINE_KINDS.map((kind) => <option key={kind} value={kind}>{ESTIMATE_KIND_LABEL[kind]}</option>)}
                </Select>
              </Field>
              {newLineKind === "part" ? (
                <Field label={bi("Part", "القطعة")}>
                  <Select value={newLineItemId} onChange={(event) => { const item = inventoryItems.find((candidate) => candidate.id === event.target.value); setNewLineItemId(event.target.value); setNewLineUnitPrice(item ? String(item.unitPrice) : ""); setNewLineCatNo(item?.partNo ?? ""); setNewLineDescriptionAr(item?.nameAr ?? ""); }}>
                    <option value="">{bi("Choose part...", "اختر قطعة...")}</option>
                    {inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.name}{item.nameAr ? ` · ${item.nameAr}` : ""}</option>)}
                  </Select>
                </Field>
              ) : (
                <Field label={bi("Description", "الوصف")}>
                  <Input
                    value={newLineLabel}
                    onChange={(event) => setNewLineLabel(event.target.value)}
                    placeholder={newLineKind === "labor" ? "e.g. Diagnostic & labor charge" : newLineKind === "discount" ? "e.g. Loyalty discount" : "e.g. Transport / callout fee"}
                  />
                </Field>
              )}
              <Field label={bi("Qty", "الكمية")}><Input type="number" min="1" value={newLineQty} onChange={(event) => setNewLineQty(event.target.value)} /></Field>
              <Field label={newLineKind === "discount" ? bi("Discount (SAR)", "الخصم (ريال)") : bi("Rate (SAR)", "السعر (ريال)")}><Input type="number" min="0" value={newLineUnitPrice} onChange={(event) => setNewLineUnitPrice(event.target.value)} /></Field>
              {newLineKind !== "discount" && (
                <Field label={bi("Line discount (SAR)", "خصم البند (ريال)")}><Input type="number" min="0" value={newLineDiscount} onChange={(event) => setNewLineDiscount(event.target.value)} placeholder="0" /></Field>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  const item = newLineKind === "part" ? inventoryItems.find((candidate) => candidate.id === newLineItemId) : undefined;
                  const label = newLineKind === "part" ? (item?.name ?? "Part") : newLineLabel;
                  const enteredPrice = Number(newLineUnitPrice);
                  const unitPrice = newLineKind === "discount" ? -Math.abs(enteredPrice) : enteredPrice;
                  showResult(
                    addEstimateLine(job.id, {
                      kind: newLineKind, label, catNo: newLineCatNo || undefined, descriptionAr: newLineKind === "part" ? (item?.nameAr) : (newLineDescriptionAr || undefined),
                      itemId: newLineKind === "part" ? (newLineItemId || undefined) : undefined, qty: Number(newLineQty), unitPrice,
                      discountAmount: newLineKind !== "discount" && newLineDiscount ? Number(newLineDiscount) : undefined,
                      notes: newLineNotes || undefined,
                    }),
                    () => { setNewLineLabel(""); setNewLineDescriptionAr(""); setNewLineCatNo(""); setNewLineItemId(""); setNewLineQty("1"); setNewLineUnitPrice(""); setNewLineDiscount(""); setNewLineNotes(""); }
                  );
                }}
              >
                <Plus size={14} /> {bi("Add", "إضافة")}
              </Button>
            </div>
            {newLineKind !== "part" && (
              <Field label={bi("Arabic description (optional)", "الوصف بالعربية (اختياري)")}><Input dir="rtl" value={newLineDescriptionAr} onChange={(event) => setNewLineDescriptionAr(event.target.value)} /></Field>
            )}
            <Field label={bi("Note (optional)", "ملاحظة (اختياري)")}><Input value={newLineNotes} onChange={(event) => setNewLineNotes(event.target.value)} placeholder={bi("Visible on the printed estimate", "تظهر في التقدير المطبوع")} /></Field>
          </div>
        )}
      </Card>

      {job.currentStage === "Customer Approval" && job.customerApproved !== true && canPerform(role, "record_customer_approval") && (
        <div className="flex gap-2">
          <Button onClick={() => showResult(approveCustomer(job.id, true))}><CheckCircle2 size={14} /> {bi("Approve", "موافقة")}</Button>
          {job.customerApproved == null && <Button variant="danger" onClick={() => showResult(approveCustomer(job.id, false))}><XCircle size={14} /> {bi("Decline", "رفض")}</Button>}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="secondary"
          onClick={() => printEstimate({
            job, customer, appliance, brand, estimateLines: jobEstimateLines, inventoryItems,
            onApprove: () => approveCustomer(job.id, true),
            onDecline: () => approveCustomer(job.id, false),
          })}
        >
          <Printer size={14} /> {bi("Print Estimate", "طباعة التقدير")}
        </Button>
        {customer && (
          <Button variant="secondary" onClick={() => showResult(sendEstimateWhatsapp())}>
            <MessageCircle size={14} /> {bi("Send Estimate via WhatsApp", "إرسال التقدير عبر واتساب")}
          </Button>
        )}
      </div>
    </div>
  );
}
