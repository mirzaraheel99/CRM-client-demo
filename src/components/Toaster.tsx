import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { useToastStore, type ToastTone } from "../lib/toast";
import { cx } from "../lib/utils";

const TONE_ICON: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-[var(--color-status-good)]" />,
  info: <Info size={16} className="text-[var(--color-series-1)]" />,
  error: <XCircle size={16} className="text-[var(--color-status-critical)]" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:w-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "animate-rise-in flex items-start gap-2.5 rounded-xl border bg-[var(--color-surface-2)] px-3.5 py-3 text-sm shadow-[var(--shadow-lg)] [border-color:var(--color-border)]"
          )}
        >
          <span className="mt-0.5 shrink-0">{TONE_ICON[t.tone]}</span>
          <span className="flex-1 text-[var(--color-ink-primary)]">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
