import QRCode from "qrcode";
import { formatDate } from "./utils";
import type { Customer, Appliance, Brand, JobCard, JobCardPartUsed, InventoryItem } from "./types";

// Simulated ZATCA (Saudi tax authority) Phase-2 Simplified Tax Invoice QR payload.
// Real certification requires a cryptographic stamp signed by a ZATCA-issued
// certificate via the Fatoora onboarding API — this demo builds the same
// Tag-Length-Value structure (seller name, VAT number, timestamp, total, VAT
// total) the QR must encode, so the printed layout and code are shaped exactly
// like what ZATCA expects once wired to a real compliance CSID.
const SELLER_NAME = "FixFlow Home Services LLC";
const SELLER_VAT_NUMBER = "310123456700003";

function tlvField(tag: number, value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array([tag, bytes.length, ...bytes]);
}

function buildZatcaQrBase64(timestamp: string, totalWithVat: string, vatTotal: string): string {
  const fields = [
    tlvField(1, SELLER_NAME),
    tlvField(2, SELLER_VAT_NUMBER),
    tlvField(3, timestamp),
    tlvField(4, totalWithVat),
    tlvField(5, vatTotal),
  ];
  const size = fields.reduce((acc, f) => acc + f.length, 0);
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const f of fields) {
    combined.set(f, offset);
    offset += f.length;
  }
  let binary = "";
  combined.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export async function printTaxInvoice({
  job, customer, appliance, brand, parts, inventoryItems,
}: {
  job: JobCard;
  customer?: Customer;
  appliance?: Appliance;
  brand?: Brand;
  parts: JobCardPartUsed[];
  inventoryItems: InventoryItem[];
}) {
  const VAT_RATE = 0.15;
  const totalWithVat = job.finalAmount ?? job.estimateAmount ?? 0;
  const subtotal = totalWithVat / (1 + VAT_RATE);
  const vatTotal = totalWithVat - subtotal;
  const timestamp = new Date().toISOString();
  const invoiceNo = `INV-${job.id.replace(/^job-/, "")}`;

  const qrBase64 = buildZatcaQrBase64(timestamp, totalWithVat.toFixed(2), vatTotal.toFixed(2));
  const qrDataUrl = await QRCode.toDataURL(qrBase64, { margin: 1, width: 140 });

  const fmt = (n: number) => `SAR ${n.toFixed(2)}`;
  const partsRows = parts
    .map((p) => {
      const item = inventoryItems.find((i) => i.id === p.itemId);
      return `<tr><td>${item?.name ?? "—"}</td><td class="num">${p.qty}</td><td class="num">${fmt(p.unitPrice)}</td><td class="num">${fmt(p.totalPrice)}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Tax Invoice — ${invoiceNo}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0b0b0b; padding: 40px; max-width: 720px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #c2410c; padding-bottom: 16px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 700; color: #c2410c; }
  .brand-sub { font-size: 12px; color: #666; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 12px; }
  .badge { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; background: #ecfdf3; color: #0ca30c; border: 1px solid #b7ebc6; border-radius: 999px; padding: 3px 8px; margin-bottom: 12px; }
  .qr-block { display: flex; align-items: center; gap: 14px; border: 1px solid #e1e0d9; border-radius: 8px; padding: 14px; margin: 16px 0; }
  .qr-block img { width: 110px; height: 110px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .box { border: 1px solid #e1e0d9; border-radius: 8px; padding: 12px; }
  .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #898781; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { padding: 8px; border-bottom: 1px solid #e1e0d9; text-align: left; }
  th { color: #898781; font-size: 11px; text-transform: uppercase; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; border-top: 2px solid #0b0b0b; border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #898781; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div class="header">
    <div>
      <div class="brand">FixFlow</div>
      <div class="brand-sub">${SELLER_NAME} · VAT ${SELLER_VAT_NUMBER}</div>
    </div>
    <div style="text-align:right"><h1>${invoiceNo}</h1><p class="muted">${formatDate(timestamp)}</p></div>
  </div>
  <span class="badge">ZATCA-format Simplified Tax Invoice</span>
  <div class="qr-block">
    <img src="${qrDataUrl}" alt="ZATCA QR code" />
    <div>
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;">Scan to verify</p>
      <p class="muted" style="margin:0;">Encodes seller name, VAT number, timestamp, invoice total, and VAT total per ZATCA's TLV schema — the same fields a certified e-invoice must carry.</p>
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <h3>Bill To</h3>
      <p>${customer?.name ?? "—"}</p>
      <p class="muted">${customer?.phone ?? ""}</p>
      <p class="muted">${customer?.address ?? ""}</p>
    </div>
    <div class="box">
      <h3>Appliance / Job</h3>
      <p>${appliance?.model ?? "—"}</p>
      <p class="muted">${brand?.name ?? ""} · Serial ${appliance?.serialNo ?? "—"}</p>
      <p class="muted">${job.id} · ${job.jobType === "warranty" ? "Warranty" : "Non-warranty"}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr></thead>
    <tbody>${partsRows || '<tr><td colspan="4" class="muted">Service charge only — no parts recorded</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="3">Subtotal (excl. VAT)</td><td class="num">${fmt(subtotal)}</td></tr>
      <tr><td colspan="3">VAT (15%)</td><td class="num">${fmt(vatTotal)}</td></tr>
      <tr><td colspan="3">Total (incl. VAT)</td><td class="num">${fmt(totalWithVat)}</td></tr>
    </tfoot>
  </table>
  <p class="footer">This demo invoice is structured to match ZATCA's Simplified Tax Invoice (Phase 2) schema for illustration. Production use requires onboarding with a ZATCA-issued compliance certificate (CSID) and live Fatoora portal integration.</p>
</body></html>`;

  const win = window.open("", "_blank", "width=800,height=950");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
