import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { Badge, Button, Input } from "./ui";
import { useStore } from "../lib/store";
import { toast } from "../lib/toast";
import { bi } from "../lib/domainAr";

export function WhatsappVerify({ customerId, verified }: { customerId: string; verified: boolean }) {
  const verifyWhatsapp = useStore((s) => s.verifyWhatsapp);
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);

  if (verified) {
    return <Badge tone="good" icon={<ShieldCheck size={11} />}>{bi("WhatsApp Verified", "واتساب موثّق")}</Badge>;
  }

  if (!otpSent) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="warning">{bi("WhatsApp Unverified", "واتساب غير موثّق")}</Badge>
        <Button size="sm" variant="secondary" onClick={() => setOtpSent(true)}>
          <MessageCircle size={12} /> {bi("Send verification code", "إرسال رمز التحقق")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--color-ink-muted)]">
        {bi("Demo OTP sent via WhatsApp:", "تم إرسال رمز تجريبي عبر واتساب:")} <span className="font-mono font-semibold text-[var(--color-ink-primary)]">{demoCode}</span>
        <span className="italic"> (simulated — a real gateway would text this to the customer)</span>
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={entered}
          onChange={(e) => { setEntered(e.target.value); setError(false); }}
          placeholder="Enter 4-digit code"
          className="max-w-[160px]"
        />
        <Button
          size="sm"
          onClick={() => {
            if (entered === demoCode) { verifyWhatsapp(customerId); toast("WhatsApp number verified."); }
            else setError(true);
          }}
        >
          {bi("Confirm", "تأكيد")}
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--color-status-critical)]">{bi("Code doesn't match — check and try again.", "الرمز غير مطابق — تحقق وحاول مرة أخرى.")}</p>}
    </div>
  );
}
