import { formatCurrency, formatDate } from "./utils";
import type { ActionResult, Customer, Appliance, Brand, JobCard, JobCardEstimateLine, InventoryItem } from "./types";

function hijriDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function printEstimate({
  job, customer, appliance, brand, estimateLines, inventoryItems, onApprove, onDecline,
}: {
  job: JobCard;
  customer?: Customer;
  appliance?: Appliance;
  brand?: Brand;
  estimateLines: JobCardEstimateLine[];
  inventoryItems: InventoryItem[];
  onApprove?: () => Promise<ActionResult>;
  onDecline?: () => Promise<ActionResult>;
}) {
  const KIND_LABEL: Record<JobCardEstimateLine["kind"], string> = { labor: "Labor", part: "", other: "Other", discount: "Discount" };
  const lineRows = estimateLines
    .map((line) => {
      const item = line.itemId ? inventoryItems.find((i) => i.id === line.itemId) : undefined;
      const arabicDescription = line.descriptionAr ?? item?.nameAr;
      const nameCell = arabicDescription
        ? `${line.label}<div class="ar" dir="rtl">${arabicDescription}</div>`
        : line.label;
      const kindTag = KIND_LABEL[line.kind] ? `<span class="tag">${KIND_LABEL[line.kind]}</span>` : "";
      const notesRow = line.notes ? `<div class="line-note">${line.notes}</div>` : "";
      const taxCell = line.kind === "discount" ? "—" : "VAT 15%";
      const gross = line.qty * line.unitPrice;
      const discountCell = line.kind === "discount" ? "—" : formatCurrency(line.discountAmount ?? 0);
      return `<tr><td>${line.catNo ?? item?.partNo ?? ""}</td><td>${nameCell}${kindTag}${notesRow}</td><td>${taxCell}</td><td class="num">${line.qty}</td><td class="num">${formatCurrency(line.unitPrice)}</td><td class="num">${formatCurrency(gross)}</td><td class="num">${discountCell}</td></tr>`;
    })
    .join("");
  const total = job.estimateAmount ?? 0;
  const subtotal = total / 1.15;
  const vatTotal = total - subtotal;
  const estimateNo = `EST-${job.documentNo}`;
  const needsApproval = (job.estimateAmount ?? 0) > 0 && job.customerApproved !== true;
  const showDecision = needsApproval && Boolean(onApprove || onDecline);

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Estimate - ${estimateNo}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0b0b0b; padding: 40px; max-width: 720px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #c2410c; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 700; color: #c2410c; }
  .brand-sub { font-size: 12px; color: #666; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 12px; }
  .badge { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; border-radius: 999px; padding: 3px 8px; margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
  .box { border: 1px solid #e1e0d9; border-radius: 8px; padding: 12px; }
  .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #898781; }
  .diagnosis { border: 1px solid #e1e0d9; border-left: 3px solid #c2410c; border-radius: 8px; padding: 12px; margin: 16px 0; background: #fafaf8; }
  .diagnosis h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #898781; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th, td { padding: 8px; border-bottom: 1px solid #e1e0d9; text-align: left; }
  th { color: #898781; font-size: 11px; text-transform: uppercase; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .ar { color: #666; font-size: 12px; }
  .tag { margin-left: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #898781; border: 1px solid #e1e0d9; border-radius: 999px; padding: 1px 6px; }
  .line-note { margin-top: 2px; font-size: 11px; color: #898781; font-style: italic; }
  tfoot td { border-bottom: none; }
  tfoot tr:last-child td { font-weight: 700; border-top: 2px solid #0b0b0b; padding-top: 10px; }
  .validity { margin: 16px 0; font-size: 12px; color: #c2410c; font-weight: 600; }
  .quickfacts { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 0 16px; font-size: 11px; color: #898781; }
  .decision { margin: 20px 0; border: 1px solid #e1e0d9; border-radius: 8px; padding: 16px; text-align: center; }
  .decision button { font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; margin: 0 6px; }
  .decision .approve { background: #c2410c; color: #fff; }
  .decision .decline { background: transparent; color: #b91c1c; border: 1px solid #fca5a5; }
  .decision button:disabled { opacity: 0.5; cursor: default; }
  #fixflow-decision-status { margin-top: 10px; font-size: 12px; color: #666; min-height: 16px; }
  .terms { margin-top: 24px; font-size: 11px; color: #898781; }
  .terms ul { margin: 6px 0 0; padding-left: 18px; }
  @media print { body { padding: 0; } .decision { display: none; } }
</style>
</head><body>
  <div class="header">
    <div><div class="brand">VFix</div><div class="brand-sub">Appliance Service Estimate</div></div>
    <div style="text-align:right"><h1>${estimateNo}</h1><p class="muted">${job.documentNo} | ${formatDate(job.createdAt)}</p></div>
  </div>
  <span class="badge">Estimate — Not a Tax Invoice</span>
  ${job.estimateSubject ? `<p class="muted" style="margin-top:6px;font-weight:600;">${job.estimateSubject}</p>` : ""}
  ${job.estimateValidUntil ? `<p class="validity">Valid until ${formatDate(job.estimateValidUntil)}</p>` : ""}
  <div class="quickfacts">
    ${job.estimatePreviousQuoteNo ? `<span>Previous quote: ${job.estimatePreviousQuoteNo}</span>` : ""}
    ${job.estimateDeliveryLeadTime ? `<span>Delivery: ${job.estimateDeliveryLeadTime}</span>` : ""}
    <span>Hijri date: ${hijriDate(job.createdAt)}</span>
    <span>Currency: Saudi Riyal (SAR)</span>
    <span>Exchange rate: 1.0000000000</span>
  </div>
  <div class="grid">
    <div class="box">
      <h3>Customer</h3>
      <p>${customer?.customerType === "corporate" && customer?.companyName ? customer.companyName : (customer?.name ?? "—")}</p>
      ${customer?.customerType === "corporate" && customer?.companyName ? `<p class="muted">Contact: ${customer.name}</p>` : ""}
      <p class="muted">${customer?.documentNo ?? ""}</p>
      <p class="muted">${customer?.phone ?? ""}</p>
      <p class="muted">${customer?.address ?? ""}</p>
    </div>
    <div class="box">
      <h3>Appliance</h3>
      <p>${appliance?.model ?? "—"}</p>
      <p class="muted">${brand?.name ?? ""} · Serial ${appliance?.serialNo ?? "—"}</p>
      <p class="muted">${appliance?.documentNo ?? ""} | Sequence ${String(job.sequenceNo).padStart(2, "0")}</p>
      <p class="muted">${job.jobType === "warranty" ? "Warranty job" : "Non-warranty job"}</p>
    </div>
    <div class="box">
      <h3>Estimate Details</h3>
      <p class="muted">Prepared by: ${job.estimatePreparedBy ?? "—"}</p>
      <p class="muted">Customer request: ${job.estimateCustomerRequest ?? "—"}</p>
      <p class="muted">Terms of payment: ${job.estimateTermsOfPayment ?? "—"}</p>
      <p class="muted">Customer PO / reference: ${job.estimatePoNumber ?? "—"}</p>
      <p class="muted">Manufactured by: ${brand?.name ?? "—"}</p>
    </div>
  </div>
  ${job.diagnosisNotes ? `<div class="diagnosis"><h3>Diagnosis & Recommended Work</h3><p>${job.diagnosisNotes}</p></div>` : ""}
  <table>
    <thead><tr><th>Cat No</th><th>Item</th><th>Tax</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Gross</th><th class="num">Discount</th></tr></thead>
    <tbody>${lineRows || '<tr><td colspan="7" class="muted">No estimate items recorded yet</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="6">Subtotal (excl. VAT)</td><td class="num">${formatCurrency(subtotal)}</td></tr>
      <tr><td colspan="6">VAT (15%)</td><td class="num">${formatCurrency(vatTotal)}</td></tr>
      <tr><td colspan="6">Estimated Total (incl. VAT)</td><td class="num">${formatCurrency(total)}</td></tr>
    </tfoot>
  </table>
  ${job.estimateNotes ? `<div class="terms"><h3 style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#898781;">Notes</h3><p>${job.estimateNotes}</p></div>` : ""}
  ${showDecision ? `
  <div class="decision">
    <p style="margin:0 0 10px;font-size:13px;font-weight:600;">Please approve or decline this estimate to proceed</p>
    <button id="fixflow-approve-btn" class="approve">Approve Estimate</button>
    <button id="fixflow-decline-btn" class="decline">Decline</button>
    <p id="fixflow-decision-status"></p>
  </div>` : ""}
  <div class="terms">
    <p>This estimate is subject to change if additional faults are found once the unit is opened for repair. Approval is required before repair work begins whenever the estimate includes a charge.</p>
    <ul>
      <li>Prices shown are in Saudi Riyals (SAR) and include 15% VAT unless noted otherwise.</li>
      <li>Parts listed are the technician's best assessment prior to teardown; the final invoice reflects parts actually installed.</li>
      ${job.estimateValidUntil ? `<li>This estimate is valid until ${formatDate(job.estimateValidUntil)}; a revised estimate may be issued after that date.</li>` : ""}
    </ul>
  </div>
</body></html>`;

  const win = window.open("", "_blank", "width=800,height=950");
  if (!win) return;
  win.document.write(html);
  win.document.close();

  if (showDecision) {
    const approveBtn = win.document.getElementById("fixflow-approve-btn") as HTMLButtonElement | null;
    const declineBtn = win.document.getElementById("fixflow-decline-btn") as HTMLButtonElement | null;
    const status = win.document.getElementById("fixflow-decision-status");
    const handleDecision = async (action: (() => Promise<ActionResult>) | undefined) => {
      if (!action) return;
      const outcome = await action();
      if (status) status.textContent = outcome.message;
      if (outcome.ok) {
        approveBtn?.setAttribute("disabled", "true");
        declineBtn?.setAttribute("disabled", "true");
        setTimeout(() => win.close(), 1200);
      }
    };
    approveBtn?.addEventListener("click", () => handleDecision(onApprove));
    declineBtn?.addEventListener("click", () => handleDecision(onDecline));
  }

  win.focus();
  // Skip the auto-print dialog when Approve/Decline is on-screen — popping a
  // browser print sheet over the decision buttons would block interaction.
  if (!showDecision) setTimeout(() => win.print(), 300);
}
