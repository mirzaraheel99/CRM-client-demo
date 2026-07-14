import { formatCurrency, formatDate } from "./utils";
import type { Customer, Appliance, Brand, JobCard, JobCardPartUsed, InventoryItem } from "./types";

export function printEstimate({
  job, customer, appliance, brand, parts, inventoryItems,
}: {
  job: JobCard;
  customer?: Customer;
  appliance?: Appliance;
  brand?: Brand;
  parts: JobCardPartUsed[];
  inventoryItems: InventoryItem[];
}) {
  const partsRows = parts
    .map((p) => {
      const item = inventoryItems.find((i) => i.id === p.itemId);
      const nameCell = item?.nameAr
        ? `${item.name}<div class="ar" dir="rtl">${item.nameAr}</div>`
        : (item?.name ?? "—");
      return `<tr><td>${nameCell}</td><td class="num">${p.qty}</td><td class="num">${formatCurrency(p.unitPrice)}</td><td class="num">${formatCurrency(p.totalPrice)}</td></tr>`;
    })
    .join("");
  const partsTotal = parts.reduce((acc, p) => acc + p.totalPrice, 0);
  const laborEstimate = Math.max(0, (job.estimateAmount ?? 0) - partsTotal);
  const estimateNo = `EST-${job.documentNo}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Estimate - ${estimateNo}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0b0b0b; padding: 40px; max-width: 720px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #c2410c; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 700; color: #c2410c; }
  .brand-sub { font-size: 12px; color: #666; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .box { border: 1px solid #e1e0d9; border-radius: 8px; padding: 12px; }
  .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #898781; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th, td { padding: 8px; border-bottom: 1px solid #e1e0d9; text-align: left; }
  th { color: #898781; font-size: 11px; text-transform: uppercase; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .ar { color: #666; font-size: 12px; }
  tfoot td { font-weight: 700; border-top: 2px solid #0b0b0b; border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #898781; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div class="header">
    <div><div class="brand">FixFlow</div><div class="brand-sub">Appliance Service Estimate</div></div>
    <div style="text-align:right"><h1>${estimateNo}</h1><p class="muted">${job.documentNo} | ${formatDate(job.createdAt)}</p></div>
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
  </div>
  <table>
    <thead><tr><th>Part</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr></thead>
    <tbody>${partsRows || '<tr><td colspan="4" class="muted">No parts recorded yet</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="3">Parts subtotal</td><td class="num">${formatCurrency(partsTotal)}</td></tr>
      <tr><td colspan="3">Labor / service charge</td><td class="num">${formatCurrency(laborEstimate)}</td></tr>
      <tr><td colspan="3">Estimated Total</td><td class="num">${formatCurrency(job.estimateAmount)}</td></tr>
    </tfoot>
  </table>
  <p class="footer">This is a system-generated estimate from FixFlow and is subject to change after diagnosis. Approval required before repair proceeds on non-warranty jobs.</p>
</body></html>`;

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
