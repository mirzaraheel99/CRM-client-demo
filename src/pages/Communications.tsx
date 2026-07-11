import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Smartphone, Mail } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Select, Input, Badge } from "../components/ui";
import { formatDateTime } from "../lib/utils";
import type { Channel } from "../lib/types";

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} className="text-[var(--color-status-good)]" />,
  sms: <Smartphone size={14} className="text-[var(--color-series-3)]" />,
  email: <Mail size={14} className="text-[var(--color-series-1)]" />,
};

export default function Communications() {
  const { communicationLogs, jobCards, customers } = useStore();
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [search, setSearch] = useState("");

  const jobMap = useMemo(() => new Map(jobCards.map((j) => [j.id, j])), [jobCards]);
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const rows = useMemo(() => {
    let list = communicationLogs;
    if (channel !== "all") list = list.filter((c) => c.channel === channel);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.message.toLowerCase().includes(q) || c.jobcardId.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 200);
  }, [communicationLogs, channel, search]);

  const counts = {
    whatsapp: communicationLogs.filter((c) => c.channel === "whatsapp").length,
    sms: communicationLogs.filter((c) => c.channel === "sms").length,
    email: communicationLogs.filter((c) => c.channel === "email").length,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Communication Logs</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Every WhatsApp, SMS, and email trigger fired by the workflow engine</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-xl">
        <Card className="flex items-center gap-2"><MessageCircle size={16} className="text-[var(--color-status-good)]" /><span className="text-sm font-semibold tabular-nums">{counts.whatsapp}</span><span className="text-xs text-[var(--color-ink-muted)]">WhatsApp</span></Card>
        <Card className="flex items-center gap-2"><Smartphone size={16} className="text-[var(--color-series-3)]" /><span className="text-sm font-semibold tabular-nums">{counts.sms}</span><span className="text-xs text-[var(--color-ink-muted)]">SMS</span></Card>
        <Card className="flex items-center gap-2"><Mail size={16} className="text-[var(--color-series-1)]" /><span className="text-sm font-semibold tabular-nums">{counts.email}</span><span className="text-xs text-[var(--color-ink-muted)]">Email</span></Card>
      </div>

      <Card className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search message or job ID…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="w-40">
          <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel | "all")}>
            <option value="all">All channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </Select>
        </div>
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
              <th className="px-5 py-3 font-medium">Channel</th>
              <th className="px-3 py-3 font-medium">Job</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Message</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Sent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const job = jobMap.get(c.jobcardId);
              const cust = job ? custMap.get(job.customerId) : undefined;
              return (
                <tr key={c.id} className="border-b last:border-0 [border-color:var(--color-border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-2.5">{CHANNEL_ICON[c.channel]}</td>
                  <td className="px-3 py-2.5"><Link to={`/jobcards/${c.jobcardId}`} className="font-medium text-[var(--color-brand-1)]">{c.jobcardId}</Link></td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{cust?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-secondary)] max-w-xs truncate">{c.message}</td>
                  <td className="px-3 py-2.5"><Badge tone={c.status === "failed" ? "critical" : c.status === "read" ? "good" : "neutral"}>{c.status}</Badge></td>
                  <td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDateTime(c.timestamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
