import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Card, CardHeader } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { WhatsappVerify } from "../../components/WhatsappVerify";
import { formatDate, formatDateTime, formatSequence } from "../../lib/utils";
import { bi, CUSTOMER_TYPE_AR, GENDER_AR, PREFERRED_LANGUAGE_AR } from "../../lib/domainAr";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, appliances, jobCards, serviceOrders, brands, communicationLogs, selectedBranchId } = useStore();
  const customer = customers.find((candidate) => candidate.id === id && (selectedBranchId === "all" || candidate.branchId === selectedBranchId));
  if (!customer) return <p className="text-sm text-[var(--color-ink-muted)]">{bi("Customer not found.", "لم يتم العثور على العميل.")}</p>;

  const custJobs = jobCards.filter((job) => job.customerId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const custOrders = serviceOrders.filter((order) => order.customerId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const productIds = new Set(custJobs.map((job) => job.applianceId));
  const servicedProducts = appliances.filter((appliance) => productIds.has(appliance.id));
  const custComms = communicationLogs.filter((communication) => communication.customerId === customer.id).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 10);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"><ArrowLeft size={15} /> {bi("Back", "رجوع")}</button>
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Customer No. {customer.documentNo} | Registered {formatDate(customer.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={bi("Contact", "بيانات الاتصال")} subtitle="Mobile number is the duplicate-customer check" />
          <div className="space-y-1.5 text-sm">
            <p><span className="text-[var(--color-ink-muted)]">{bi("Mobile", "الجوال")}:</span> {customer.phone}</p>
            {customer.homePhone && <p><span className="text-[var(--color-ink-muted)]">{bi("Home phone", "الهاتف المنزلي")}:</span> {customer.homePhone}</p>}
            <p><span className="text-[var(--color-ink-muted)]">{bi("WhatsApp", "واتساب")}:</span> {customer.whatsapp}</p>
            <p><span className="text-[var(--color-ink-muted)]">{bi("Email", "البريد الإلكتروني")}:</span> {customer.email}</p>
            <p><span className="text-[var(--color-ink-muted)]">{bi("Address", "العنوان")}:</span> {customer.address}</p>
            <div className="border-t pt-2 [border-color:var(--color-border)]"><WhatsappVerify customerId={customer.id} verified={customer.whatsappVerified} /></div>
          </div>
        </Card>
        <Card>
          <CardHeader title={bi("Personal details", "البيانات الشخصية")} subtitle="Saudi naming convention and identification" />
          <div className="space-y-1.5 text-sm">
            <p><span className="text-[var(--color-ink-muted)]">{bi("First name", "الاسم الأول")}:</span> {customer.firstName}</p>
            <p><span className="text-[var(--color-ink-muted)]">{bi("Father's name", "اسم الأب")}:</span> {customer.fatherName}</p>
            {customer.grandfatherName && <p><span className="text-[var(--color-ink-muted)]">{bi("Grandfather's name", "اسم الجد")}:</span> {customer.grandfatherName}</p>}
            <p><span className="text-[var(--color-ink-muted)]">{bi("Family name", "اسم العائلة")}:</span> {customer.familyName}</p>
            <p><span className="text-[var(--color-ink-muted)]">{bi("Customer type", "نوع العميل")}:</span> {bi(customer.customerType === "corporate" ? "Corporate" : "Individual", CUSTOMER_TYPE_AR[customer.customerType])}</p>
            {customer.companyName && <p><span className="text-[var(--color-ink-muted)]">{bi("Company", "الشركة")}:</span> {customer.companyName} {customer.crNumber && `(${customer.crNumber})`}</p>}
            {customer.nationalId && <p><span className="text-[var(--color-ink-muted)]">{bi("National ID / Iqama", "الهوية / الإقامة")}:</span> {customer.nationalId}</p>}
            {customer.nationality && <p><span className="text-[var(--color-ink-muted)]">{bi("Nationality", "الجنسية")}:</span> {customer.nationality}</p>}
            {customer.gender && <p><span className="text-[var(--color-ink-muted)]">{bi("Gender", "الجنس")}:</span> {bi(customer.gender === "male" ? "Male" : "Female", GENDER_AR[customer.gender])}</p>}
            {customer.dateOfBirth && <p><span className="text-[var(--color-ink-muted)]">{bi("Date of birth", "تاريخ الميلاد")}:</span> {formatDate(customer.dateOfBirth)}</p>}
            {customer.preferredLanguage && <p><span className="text-[var(--color-ink-muted)]">{bi("Preferred language", "اللغة المفضلة")}:</span> {bi(customer.preferredLanguage === "ar" ? "Arabic" : "English", PREFERRED_LANGUAGE_AR[customer.preferredLanguage])}</p>}
            {customer.notes && <p><span className="text-[var(--color-ink-muted)]">{bi("Notes", "ملاحظات")}:</span> {customer.notes}</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title={bi("Service relationship", "علاقة الخدمة")} subtitle="Products are linked by job sequence, not permanent ownership" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xl font-semibold tabular-nums">{custOrders.length}</p><p className="text-xs text-[var(--color-ink-muted)]">{bi("Orders", "الطلبات")}</p></div>
            <div><p className="text-xl font-semibold tabular-nums">{custJobs.length}</p><p className="text-xs text-[var(--color-ink-muted)]">{bi("Job lines", "بنود المهام")}</p></div>
            <div><p className="text-xl font-semibold tabular-nums">{servicedProducts.length}</p><p className="text-xs text-[var(--color-ink-muted)]">{bi("Products", "المنتجات")}</p></div>
          </div>
        </Card>
      </div>

      <Card className="space-y-4" padded={false}>
        <div className="px-5 pt-5"><CardHeader title={bi("Service orders and product sequences", "أوامر الخدمة وتسلسل المنتجات")} subtitle="Every product keeps its own job date, warranty, status, and invoice number." /></div>
        <div className="divide-y [border-color:var(--color-border)]">
          {custOrders.map((order) => {
            const lines = custJobs.filter((job) => job.serviceOrderId === order.id).sort((a, b) => a.sequenceNo - b.sequenceNo);
            return (
              <section key={order.id} className="px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-semibold text-[var(--color-brand-1)]">{order.documentNo}</p><p className="text-xs text-[var(--color-ink-muted)]">{formatDate(order.createdAt)} | {lines.length} {lines.length === 1 ? "product" : "products"}</p></div>
                  <Badge tone={lines.every((line) => line.status === "Delivered") ? "good" : "brand"}>{lines.every((line) => line.status === "Delivered") ? bi("Completed", "مكتمل") : bi("In progress", "قيد التنفيذ")}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="text-left text-xs text-[var(--color-ink-muted)]"><th className="pb-2 font-medium">{bi("Sequence", "التسلسل")}</th><th className="pb-2 font-medium">{bi("Product", "المنتج")}</th><th className="pb-2 font-medium">{bi("Job date", "تاريخ المهمة")}</th><th className="pb-2 font-medium">{bi("Warranty", "الضمان")}</th><th className="pb-2 font-medium">{bi("Invoice No.", "رقم الفاتورة")}</th><th className="pb-2 font-medium">{bi("Status", "الحالة")}</th></tr></thead>
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
          {custOrders.length === 0 && <p className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">{bi("No service orders yet.", "لا توجد أوامر خدمة بعد.")}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title={bi("Communication Log", "سجل التواصل")} subtitle="Most recent messages across all service-order sequences" />
        <div className="space-y-2">
          {custComms.map((communication) => (
            <div key={communication.id} className="border-b pb-2 text-sm last:border-0 [border-color:var(--color-border)]">
              <p>{communication.message}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{communication.id.toUpperCase()} | {communication.channel.toUpperCase()} | {formatDateTime(communication.timestamp)}</p>
            </div>
          ))}
          {custComms.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No messages sent yet.", "لم يتم إرسال أي رسائل بعد.")}</p>}
        </div>
      </Card>
    </div>
  );
}
