import { useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { Card, Button, Badge } from "./ui";
import { useStore } from "../lib/store";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { PAYMENT_METHOD_LABELS, BNPL_METHODS } from "../lib/payments";
import type { Payment, PaymentMethod } from "../lib/types";

const METHODS: PaymentMethod[] = ["mada", "apple_pay", "stc_pay", "tabby", "tamara", "cash"];

export function PaymentPanel({ jobcardId, amount, payments }: { jobcardId: string; amount: number | null; payments: Payment[] }) {
  const recordPayment = useStore((s) => s.recordPayment);
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  const paid = payments.find((p) => p.status === "paid");

  if (paid) {
    return (
      <Card className="space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[var(--color-status-good)]" />
          <p className="text-sm font-medium">Paid via {PAYMENT_METHOD_LABELS[paid.method]}</p>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          {formatCurrency(paid.amount)}{paid.installments ? ` · ${paid.installments} installments` : ""} · {formatDateTime(paid.timestamp)}
        </p>
      </Card>
    );
  }

  if (amount == null) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-ink-muted)]">Payment opens once the final amount is set.</p>
      </Card>
    );
  }

  function pay() {
    if (!selected) return;
    setProcessing(true);
    setTimeout(() => {
      recordPayment(jobcardId, selected, amount!, BNPL_METHODS.includes(selected) ? (selected === "tabby" ? 4 : 3) : undefined);
      setProcessing(false);
    }, 900);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-[var(--color-brand-1)]" />
        <p className="text-sm font-semibold">Pay {formatCurrency(amount)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <button
            key={m}
            onClick={() => setSelected(m)}
            className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors [border-color:var(--color-border)] ${selected === m ? "border-[var(--color-brand-1)] bg-[var(--color-brand-1)]/[0.06] font-medium" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"}`}
          >
            {PAYMENT_METHOD_LABELS[m]}
            {BNPL_METHODS.includes(m) && (
              <span className="block text-[10px] text-[var(--color-ink-muted)] mt-0.5">
                {m === "tabby" ? "4 payments" : "3 payments"} of {formatCurrency(amount / (m === "tabby" ? 4 : 3))}
              </span>
            )}
          </button>
        ))}
      </div>
      <Button className="w-full justify-center" disabled={!selected || processing} onClick={pay}>
        {processing ? "Processing…" : "Confirm Payment"}
      </Button>
      {payments.some((p) => p.status === "failed") && <Badge tone="critical">A previous attempt failed — try again</Badge>}
    </Card>
  );
}
