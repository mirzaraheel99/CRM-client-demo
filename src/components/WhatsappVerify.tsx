import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { Badge, Button, Input } from "./ui";
import { useStore } from "../lib/store";

export function WhatsappVerify({ customerId, verified }: { customerId: string; verified: boolean }) {
  const verifyWhatsapp = useStore((s) => s.verifyWhatsapp);
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);

  if (verified) {
    return <Badge tone="good" icon={<ShieldCheck size={11} />}>WhatsApp Verified</Badge>;
  }

  if (!otpSent) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="warning">WhatsApp Unverified</Badge>
        <Button size="sm" variant="secondary" onClick={() => setOtpSent(true)}>
          <MessageCircle size={12} /> Send verification code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--color-ink-muted)]">
        Demo OTP sent via WhatsApp: <span className="font-mono font-semibold text-[var(--color-ink-primary)]">{demoCode}</span>
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
            if (entered === demoCode) verifyWhatsapp(customerId);
            else setError(true);
          }}
        >
          Confirm
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--color-status-critical)]">Code doesn't match — check and try again.</p>}
    </div>
  );
}
