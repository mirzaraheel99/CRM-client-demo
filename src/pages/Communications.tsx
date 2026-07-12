import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Mail, MessageCircle, Search, Smartphone } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Select, Input, Badge, EmptyState, Pagination } from "../components/ui";
import { formatDateTime } from "../lib/utils";
import type { Channel, CommunicationLog } from "../lib/types";
import { communicationsByBranch } from "../lib/selectors";

const PAGE_SIZE = 20;

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} className="text-[var(--color-status-good)]" />,
  sms: <Smartphone size={14} className="text-[var(--color-series-3)]" />,
  email: <Mail size={14} className="text-[var(--color-series-1)]" />,
};

export default function Communications() {
  const { communicationLogs, jobCards, customers, selectedBranchId } = useStore();
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [status, setStatus] = useState<CommunicationLog["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const scopedLogs = useMemo(() => communicationsByBranch(communicationLogs, jobCards, customers, selectedBranchId), [communicationLogs, jobCards, customers, selectedBranchId]);

  const rows = useMemo(() => {
    let list = scopedLogs;
    if (channel !== "all") list = list.filter((c) => c.channel === channel);
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.message.toLowerCase().includes(q) || (c.jobcardId ?? "").toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [scopedLogs, channel, status, search]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const counts = {
    whatsapp: scopedLogs.filter((c) => c.channel === "whatsapp").length,
    sms: scopedLogs.filter((c) => c.channel === "sms").length,
    email: scopedLogs.filter((c) => c.channel === "email").length,
  };
  const successfullyDelivered = scopedLogs.filter((message) => message.status === "delivered" || message.status === "read").length;
  const deliveryRate = scopedLogs.length ? Math.round((successfullyDelivered / scopedLogs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">Communication Logs</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Every WhatsApp, SMS, and email trigger fired by the workflow engine</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:max-w-4xl">
        <Card interactive className="flex items-center gap-2"><MessageCircle size={16} className="text-[var(--color-status-good)]" /><span className="text-sm font-semibold tabular-nums">{counts.whatsapp}</span><span className="text-xs text-[var(--color-ink-muted)]">WhatsApp</span></Card>
        <Card interactive className="flex items-center gap-2"><Smartphone size={16} className="text-[var(--color-series-3)]" /><span className="text-sm font-semibold tabular-nums">{counts.sms}</span><span className="text-xs text-[var(--color-ink-muted)]">SMS</span></Card>
        <Card interactive className="flex items-center gap-2"><Mail size={16} className="text-[var(--color-series-1)]" /><span className="text-sm font-semibold tabular-nums">{counts.email}</span><span className="text-xs text-[var(--color-ink-muted)]">Email</span></Card>
        <Card interactive className="flex items-center gap-2"><CheckCheck size={16} className="text-[var(--color-series-2)]" /><span className="text-sm font-semibold tabular-nums">{deliveryRate}%</span><span className="text-xs text-[var(--color-ink-muted)]">Delivered</span></Card>
      </div>

      <Card className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input placeholder="Search message or job ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
        <div className="w-40">
          <Select value={channel} onChange={(e) => { setChannel(e.target.value as Channel | "all"); setPage(1); }}>
            <option value="all">All channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </Select>
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value as CommunicationLog["status"] | "all"); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
      </Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((message) => {
            const customer = custMap.get(message.customerId);
            return (
              <div key={message.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {CHANNEL_ICON[message.channel]}
                    {message.jobcardId ? <Link to={`/jobcards/${message.jobcardId}`} className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{message.jobcardId}</Link> : <span className="truncate text-sm font-semibold">Maintenance</span>}
                  </div>
                  <Badge tone={message.status === "failed" ? "critical" : message.status === "read" ? "good" : "neutral"}>{message.status}</Badge>
                </div>
                <p className="mt-2 truncate text-xs font-medium text-[var(--color-ink-secondary)]">{customer?.name ?? "Unknown customer"}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-ink-muted)]">{message.message}</p>
                <p className="mt-2 text-right text-xs tabular-nums text-[var(--color-ink-muted)]">{formatDateTime(message.timestamp)}</p>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
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
              {pagedRows.map((c) => {
                const cust = custMap.get(c.customerId);
                return (
                  <tr key={c.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-2.5">{CHANNEL_ICON[c.channel]}</td>
                    <td className="px-3 py-2.5">{c.jobcardId ? <Link to={`/jobcards/${c.jobcardId}`} className="font-medium text-[var(--color-brand-1)]">{c.jobcardId}</Link> : <span className="text-[var(--color-ink-secondary)]">Maintenance</span>}</td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{cust?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-secondary)] max-w-xs truncate">{c.message}</td>
                    <td className="px-3 py-2.5"><Badge tone={c.status === "failed" ? "critical" : c.status === "read" ? "good" : "neutral"}>{c.status}</Badge></td>
                    <td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDateTime(c.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<MessageCircle size={18} />} title="No messages found" subtitle="Try a different search or channel filter." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
