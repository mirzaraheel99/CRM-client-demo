import { ShieldAlert } from "lucide-react";
import type { LicenseStatus } from "../lib/store";

export function LicenseBlocker({ status }: { status: LicenseStatus }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-page)] p-4">
      <div className="w-full max-w-sm rounded-xl border bg-[var(--color-surface-1)] p-6 text-center [border-color:var(--color-border)]">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-status-serious)]/[0.1] text-[var(--color-status-serious)]">
          <ShieldAlert size={20} />
        </div>
        <h1 className="text-base font-semibold">License Required</h1>
        <p className="mt-1.5 text-sm text-[var(--color-ink-secondary)]">
          {status.reason ?? "This installation's license is not valid."}
        </p>
        {status.customerName && (
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            Licensed to: {status.customerName}
            {status.expiresAt && <> &middot; Expired {new Date(status.expiresAt).toLocaleDateString()}</>}
          </p>
        )}
        <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
          Contact your VFix account representative to renew this license.
        </p>
      </div>
    </div>
  );
}
