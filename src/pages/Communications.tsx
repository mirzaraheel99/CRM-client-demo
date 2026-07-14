import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Mail, MessageCircle, Search, Smartphone } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Select, Input, Badge, EmptyState, Pagination } from "../components/ui";
import { formatDateTime } from "../lib/utils";
import type { Channel, CommunicationLog } from "../lib/types";
import { communicationsByBranch } from "../lib/selectors";
import { CHANNEL_AR, COMM_STATUS_AR, bi } from "../lib/domainAr";

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
  const jobMap = useMemo(() => new Map(jobCards.map((job) => [job.id, job])), [jobCards]);
  const scopedLogs = useMemo(() => communicationsByBranch(communicationLogs, jobCards, customers, selectedBranchId), [communicationLogs, jobCards, customers, selectedBranchId]);

  const rows = useMemo(() => {
    let list = scopedLogs;
    if (channel !== "all") list = list.filter((c) => c.channel === channel);
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.message.toLowerCase().includes(q) || (c.jobcardId ?? "").toLowerCase().includes(q) || (c.jobcardId ? jobMap.get(c.jobcardId)?.documentNo.toLowerCase().includes(q) : false));
    }
    return [...list].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [scopedLogs, channel, status, search, jobMap]);

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
        <h1 className="text-xl font-semibold tracking-tight">{bi("Communication Logs", "سجلات التواصل")}</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Every WhatsApp, SMS, and email trigger fired by the workflow engine</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:max-w-4xl">
        <Card interactive className="flex items-center gap-2"><MessageCircle size={16} className="text-[var(--color-status-good)]" /><span className="text-sm font-semibold tabular-nums">{counts.whatsapp}</span><span className="text-xs text-[var(--color-ink-muted)]">{bi("WhatsApp", CHANNEL_AR.whatsapp)}</span></Card>
        <Card interactive className="flex items-center gap-2"><Smartphone size={16} className="text-[var(--color-series-3)]" /><span className="text-sm font-semibold tabular-nums">{counts.sms}</span><span className="text-xs text-[var(--color-ink-muted)]">{bi("SMS", CHANNEL_AR.sms)}</span></Card>
        <Card interactive className="flex items-center gap-2"><Mail size={16} className="text-[var(--color-series-1)]" /><span className="text-sm font-semibold tabular-nums">{counts.email}</span><span className="text-xs text-[var(--color-ink-muted)]">{bi("Email", CHANNEL_AR.email)}</span></Card>
        <Card interactive className="flex items-center gap-2"><CheckCheck size={16} className="text-[var(--color-series-2)]" /><span className="text-sm font-semibold tabular-nums">{deliveryRate}%</span><span className="text-xs text-[var(--color-ink-muted)]">{bi("Delivered", "تم التوصيل")}</span></Card>
      </div>

      <Card className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <Input placeholder="Search message or job ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
        <div className="w-40">
          <Select value={channel} onChange={(e) => { setChannel(e.target.value as Channel | "all"); setPage(1); }}>
            <option value="all">{bi("All channels", "جميع القنوات")}</option>
            <option value="whatsapp">{bi("WhatsApp", CHANNEL_AR.whatsapp)}</option>
            <option value="sms">{bi("SMS", CHANNEL_AR.sms)}</option>
            <option value="email">{bi("Email", CHANNEL_AR.email)}</option>
          </Select>
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value as CommunicationLog["status"] | "all"); setPage(1); }}>
            <option value="all">{bi("All statuses", "جميع الحالات")}</option>
            <option value="sent">{bi("Sent", COMM_STATUS_AR.sent)}</option>
            <option value="delivered">{bi("Delivered", COMM_STATUS_AR.delivered)}</option>
            <option value="read">{bi("Read", COMM_STATUS_AR.read)}</option>
            <option value="failed">{bi("Failed", COMM_STATUS_AR.failed)}</option>
          </Select>
        </div>
      </Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((message) => {
            const customer = custMap.get(message.customerId);
            return (
              <div key={message.id} className="p-4">
                <p className="mb-1 text-[10px] font-medium text-[var(--color-ink-muted)]">{message.id.toUpperCase()}</p>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {CHANNEL_ICON[message.channel]}
                    {message.jobcardId ? <Link to={`/jobcards/${message.jobcardId}`} className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{jobMap.get(message.jobcardId)?.documentNo ?? message.jobcardId}</Link> : <span className="truncate text-sm font-semibold">{bi("Maintenance", "الصيانة")}</span>}
                  </div>
                  <Badge tone={message.status === "failed" ? "critical" : message.status === "read" ? "good" : "neutral"}>{bi(message.status, COMM_STATUS_AR[message.status as keyof typeof COMM_STATUS_AR])}</Badge>
                </div>
                <p className="mt-2 truncate text-xs font-medium text-[var(--color-ink-secondary)]">{customer?.name ?? bi("Unknown customer", "عميل غير معروف")}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-ink-muted)]">{message.message}</p>
                <p className="mt-2 text-right text-xs tabular-nums text-[var(--color-ink-muted)]">{formatDateTime(message.timestamp)}</p>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm min-w-[840px]">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-muted)] border-b [border-color:var(--color-border)]">
                <th className="px-5 py-3 font-medium">{bi("Message No.", "رقم الرسالة")}</th>
                <th className="px-3 py-3 font-medium">{bi("Channel", "القناة")}</th>
                <th className="px-3 py-3 font-medium">{bi("Job", "المهمة")}</th>
                <th className="px-3 py-3 font-medium">{bi("Customer", "العميل")}</th>
                <th className="px-3 py-3 font-medium">{bi("Message", "الرسالة")}</th>
                <th className="px-3 py-3 font-medium">{bi("Status", "الحالة")}</th>
                <th className="px-5 py-3 font-medium">{bi("Sent", "تاريخ الإرسال")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((c) => {
                const cust = custMap.get(c.customerId);
                return (
                  <tr key={c.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-2.5 text-xs text-[var(--color-ink-muted)]">{c.id.toUpperCase()}</td>
                    <td className="px-3 py-2.5">{CHANNEL_ICON[c.channel]}</td>
                    <td className="px-3 py-2.5">{c.jobcardId ? <Link to={`/jobcards/${c.jobcardId}`} className="font-medium text-[var(--color-brand-1)]">{jobMap.get(c.jobcardId)?.documentNo ?? c.jobcardId}</Link> : <span className="text-[var(--color-ink-secondary)]">{bi("Maintenance", "الصيانة")}</span>}</td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{cust?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-secondary)] max-w-xs truncate">{c.message}</td>
                    <td className="px-3 py-2.5"><Badge tone={c.status === "failed" ? "critical" : c.status === "read" ? "good" : "neutral"}>{bi(c.status, COMM_STATUS_AR[c.status as keyof typeof COMM_STATUS_AR])}</Badge></td>
                    <td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDateTime(c.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<MessageCircle size={18} />} title={bi("No messages found", "لم يتم العثور على رسائل")} subtitle="Try a different search or channel filter." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
