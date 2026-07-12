import { Wifi, WifiOff, Bell, Camera, MapPin, PenTool, ScanLine, CheckCircle2 } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Badge } from "../../components/ui";
import { JobStatusBadge } from "../../components/StatusBadge";

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[300px] rounded-[2.2rem] border-8 border-black/85 dark:border-white/20 bg-black/85 dark:bg-white/10 shadow-2xl overflow-hidden">
        <div className="h-6 bg-black/85 dark:bg-black/60 flex items-center justify-center">
          <div className="h-3 w-20 rounded-full bg-black/60" />
        </div>
        <div className="bg-[var(--color-surface-2)] h-[560px] overflow-y-auto">{children}</div>
      </div>
      <p className="text-sm font-medium text-[var(--color-ink-secondary)]">{label}</p>
    </div>
  );
}

function MobileHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--color-brand-1)] text-white px-4 py-3 flex items-center justify-between">
      <span className="font-semibold text-sm">{title}</span>
      <Bell size={16} />
    </div>
  );
}

export default function MobilePreview() {
  const { jobCards, customers, appliances, technicians } = useStore();
  const sample = jobCards.slice(0, 5);
  const custMap = new Map(customers.map((c) => [c.id, c]));
  const appMap = new Map(appliances.map((a) => [a.id, a]));
  const tech = technicians[0];

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">Mobile Apps Preview</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
          Visual blueprint of the technician and front-desk mobile experience described in the spec. This section is a UI mockup for the sales walkthrough — the production mobile apps ship separately (Flutter, per the tech stack recommendation).
        </p>
      </div>

      <div className="flex flex-wrap gap-10 justify-center py-4">
        <PhoneFrame label="Front Desk App — Job List">
          <MobileHeader title="Front Desk" />
          <div className="p-3 space-y-2">
            <div className="rounded-lg border [border-color:var(--color-border)] px-3 py-2 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              <ScanLine size={14} /> Scan serial / IMEI to receive item
            </div>
            {sample.map((j) => (
              <div key={j.id} className="rounded-lg border [border-color:var(--color-border)] p-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">{custMap.get(j.customerId)?.name}</p>
                  <JobStatusBadge status={j.status} />
                </div>
                <p className="mt-0.5 text-[10px] font-medium text-[var(--color-brand-1)]">{j.documentNo}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{appMap.get(j.applianceId)?.model}</p>
              </div>
            ))}
          </div>
        </PhoneFrame>

        <PhoneFrame label="Technician App — Job Detail">
          <MobileHeader title="My Jobs" />
          <div className="p-3 space-y-3">
            <div className="rounded-lg border [border-color:var(--color-border)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{custMap.get(sample[0]?.customerId)?.name}</p>
                <JobStatusBadge status={sample[0]?.status ?? "Received"} />
              </div>
              <p className="text-[10px] font-medium text-[var(--color-brand-1)]">{sample[0]?.documentNo}</p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                <MapPin size={12} /> {custMap.get(sample[0]?.customerId)?.address}
              </div>
              <p className="text-xs text-[var(--color-ink-secondary)]">{appMap.get(sample[0]?.applianceId)?.model}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button className="rounded-lg bg-[var(--color-brand-1)]/10 text-[var(--color-brand-2)] text-xs font-medium py-2 flex items-center justify-center gap-1"><Camera size={13} /> Upload Photo</button>
                <button className="rounded-lg bg-[var(--color-brand-1)]/10 text-[var(--color-brand-2)] text-xs font-medium py-2 flex items-center justify-center gap-1"><PenTool size={13} /> Add Parts</button>
                <button className="rounded-lg bg-[var(--color-brand-1)]/10 text-[var(--color-brand-2)] text-xs font-medium py-2 flex items-center justify-center gap-1"><CheckCircle2 size={13} /> Mark Complete</button>
                <button className="rounded-lg bg-[var(--color-brand-1)]/10 text-[var(--color-brand-2)] text-xs font-medium py-2 flex items-center justify-center gap-1"><PenTool size={13} /> Signature</button>
              </div>
            </div>
            <div className="rounded-lg border [border-color:var(--color-border)] p-3">
              <p className="text-xs font-medium mb-1">Van Stock</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{tech?.name.split(" ")[0]}'s van — 14 parts available</p>
            </div>
          </div>
        </PhoneFrame>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card interactive>
          <CardHeader title="Push notifications" />
          <p className="text-sm text-[var(--color-ink-secondary)] flex items-center gap-2"><Bell size={15} className="text-[var(--color-brand-1)]" /> New job assignments alert technicians instantly.</p>
        </Card>
        <Card interactive>
          <CardHeader title="Offline mode" />
          <p className="text-sm text-[var(--color-ink-secondary)] flex items-center gap-2">
            <WifiOff size={15} className="text-[var(--color-status-serious)]" /> Field updates queue locally
            <Wifi size={15} className="text-[var(--color-status-good)]" /> and sync on reconnect.
          </p>
          <Badge tone="warning" className="mt-2">Simulated in this demo</Badge>
        </Card>
        <Card interactive>
          <CardHeader title="Image compression" />
          <p className="text-sm text-[var(--color-ink-secondary)] flex items-center gap-2"><Camera size={15} className="text-[var(--color-brand-1)]" /> Photos are compressed client-side before upload to save bandwidth.</p>
        </Card>
      </div>
    </div>
  );
}
