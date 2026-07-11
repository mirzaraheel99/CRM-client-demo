import type { PaymentMethod } from "./types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mada: "mada",
  apple_pay: "Apple Pay",
  stc_pay: "STC Pay",
  tabby: "Tabby (Pay in installments)",
  tamara: "Tamara (Split in installments)",
  cash: "Cash",
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  mada: "var(--color-series-1)",
  apple_pay: "var(--color-ink-primary)",
  stc_pay: "var(--color-series-6)",
  tabby: "var(--color-series-8)",
  tamara: "var(--color-series-2)",
  cash: "var(--color-ink-muted)",
};

export const BNPL_METHODS: PaymentMethod[] = ["tabby", "tamara"];
