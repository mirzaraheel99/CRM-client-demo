import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Card, CardHeader } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { WhatsappVerify } from "../../components/WhatsappVerify";
import { formatDate, formatDateTime, formatSequence } from "../../lib/utils";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, appliances, jobCards, serviceOrders, brands, communicationLogs, selectedBranchId } = useStore();
  const customer = customers.find((candidate) => candidate.id === id && (selectedBranchId === "all" || candidate.branchId === selectedBranchId));
  if (!customer) return <p className="text-sm text-[var(--color-ink-muted)]">Customer not found.</p>;

  const custJobs = jobCards.filter((job) => job.customerId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const custOrders = serviceOrders.filter((order) => order.customerId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const productIds = new Set(custJobs.map((job) => job.applianceId));
  const servicedProducts = appliances.filter((appliance) => productIds.has(appliance.id));
  const custComms = communicationLogs.filter((communication) => communication.customerId === customer.id).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 10);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"><ArrowLeft size={15} /> Back</button>
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Customer No. {customer.documentNo} | Registered {formatDate(customer.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader title="Contact" subtitle="Phone number is the duplicate-customer check" />
          <div className="space-y-1.5 text-sm">
            <p><span className="text-[var(--color-ink-muted)]">Phone:</span> {customer.phone}</p>
            <p><span className="text-[var(--color-ink-muted)]">WhatsApp:</span> {customer.whatsapp}</p>
            <p><span className="text-[var(--color-ink-muted)]">Email:</span> {customer.email}</p>
            <p><span className="text-[var(--color-ink-muted)]">Address:</span> {customer.address}</p>
            <div className="border-t pt-2 [border-color:var(--color-border)]"><WhatsappVerify customerId={customer.id} verified={customer.whatsappVerified} /></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Service relationship" subtitle="Products are linked by job sequence, not permanent ownership" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xl font-semibold tabular-nums">{custOrders.length}</p><p className="text-xs text-[var(--color-ink-muted)]">Orders</p></div>
            <div><p className="text-xl font-semibold tabular-nums">{custJobs.length}</p><p className="text-xs text-[var(--color-ink-muted)]">Job lines</p></div>
            <div><p className="text-xl font-semibold tabular-nums">{servicedProducts.length}</p><p className="text-xs text-[var(--color-ink-muted)]">Products</p></div>
          </div>
        </Card>
      </div>

      <Card className="space-y-4" padded={false}>
        <div className="px-5 pt-5"><CardHeader title="Service orders and product sequences" subtitle="Every product keeps its own job date, warranty, status, and invoice number." /></div>
        <div className="divide-y [border-color:var(--color-border)]">
          {custOrders.map((order) => {
            const lines = custJobs.filter((job) => job.serviceOrderId === order.id).sort((a, b) => a.sequenceNo - b.sequenceNo);
            return (
              <section key={order.id} className="px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-semibold text-[var(--color-brand-1)]">{order.documentNo}</p><p className="text-xs text-[var(--color-ink-muted)]">{formatDate(order.createdAt)} | {lines.length} {lines.length === 1 ? "product" : "products"}</p></div>
                  <Badge tone={lines.every((line) => line.status === "Delivered") ? "good" : "brand"}>{lines.every((line) => line.status === "Delivered") ? "Completed" : "In progress"}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="text-left text-xs text-[var(--color-ink-muted)]"><th className="pb-2 font-medium">Sequence</th><th className="pb-2 font-medium">Product</th><th className="pb-2 font-medium">Job date</th><th className="pb-2 font-medium">Warranty</th><th className="pb-2 font-medium">Invoice No.</th><th className="pb-2 font-medium">Status</th></tr></thead>
                    <tbody>
                      {lines.map((job) => {
                        const appliance = appliances.find((candidate) => candidate.id === job.applianceId);
                        const brand = brands.find((candidate) => candidate.id === appliance?.brandId);
                        return <tr key={job.id} className="border-t [border-color:var(--color-border)]"><td className="py-2.5"><Link to={`/jobcards/${job.id}`} className="font-medium text-[var(--color-brand-1)]">{formatSequence(job.sequenceNo)}</Link><p className="text-xs text-[var(--color-ink-muted)]">{job.documentNo}</p></td><td className="py-2.5">{appliance?.model ?? "-"}<p className="text-xs text-[var(--color-ink-muted)]">{brand?.name} | {appliance?.documentNo}</p></td><td className="py-2.5 text-[var(--color-ink-secondary)]">{formatDate(job.createdAt)}</td><td className="py-2.5"><JobTypeBadge jobType={job.jobType} /></td><td className="py-2.5 text-xs text-[var(--color-ink-secondary)]">{job.invoiceNo}</td><td className="py-2.5"><JobStatusBadge status={job.status} /></td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          {custOrders.length === 0 && <p className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">No service orders yet.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Communication Log" subtitle="Most recent messages across all service-order sequences" />
        <div className="space-y-2">
          {custComms.map((communication) => (
            <div key={communication.id} className="border-b pb-2 text-sm last:border-0 [border-color:var(--color-border)]">
              <p>{communication.message}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{communication.id.toUpperCase()} | {communication.channel.toUpperCase()} | {formatDateTime(communication.timestamp)}</p>
            </div>
          ))}
          {custComms.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No messages sent yet.</p>}
        </div>
      </Card>
    </div>
  );
}
