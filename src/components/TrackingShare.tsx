import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui";
import { bi } from "../lib/domainAr";

export function TrackingShare({ jobId }: { jobId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const base = window.location.origin + import.meta.env.BASE_URL;
  const url = `${base}track/${jobId}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: "#0b0b0b", light: "#00000000" } }).then((dataUrl) => {
      if (!cancelled) setQr(dataUrl);
    });
    return () => { cancelled = true; };
  }, [url]);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {qr && <img src={qr} alt="Tracking QR code" className="h-20 w-20 rounded-lg border [border-color:var(--color-border)] bg-white p-1" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-ink-muted)] mb-1.5">{bi("Customers can scan or click this link — no login needed.", "يمكن للعملاء مسح أو النقر على هذا الرابط — بدون تسجيل دخول.")}</p>
          <Button size="sm" variant="secondary" onClick={copyLink} className="w-full justify-center">
            {copied ? <><Check size={13} /> {bi("Copied", "تم النسخ")}</> : <><Copy size={13} /> {bi("Copy tracking link", "نسخ رابط التتبع")}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
