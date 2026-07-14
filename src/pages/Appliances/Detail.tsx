import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Wifi } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Card, CardHeader } from "../../components/ui";
import { JobStatusBadge, JobTypeBadge } from "../../components/StatusBadge";
import { formatCurrency, formatDate, relativeTime } from "../../lib/utils";
import { APPLIANCE_CATEGORY_AR, WARRANTY_STATUS_AR, bi } from "../../lib/domainAr";

export default function ApplianceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appliances, applianceTelemetry, customers, brands, jobCards, selectedBranchId } = useStore();
  const history = jobCards.filter((job) => job.applianceId === id && (selectedBranchId === "all" || job.branchId === selectedBranchId)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const appliance = appliances.find((candidate) => candidate.id === id && (selectedBranchId === "all" || history.length > 0));
  if (!appliance) return <p className="text-sm text-[var(--color-ink-muted)]">{bi("Product not found for this branch.", "لم يتم العثور على المنتج لهذا الفرع.")}</p>;

  const brand = brands.find((candidate) => candidate.id === appliance.brandId);
  const telemetry = applianceTelemetry.find((candidate) => candidate.applianceId === appliance.id);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)]"><ArrowLeft size={15} /> {bi("Back", "رجوع")}</button>
      <div className="animate-rise-in">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{appliance.model}</h1>
          {appliance.isSmartConnected && <Badge tone="good" icon={<Wifi size={11} />}>{bi("Smart Connected", "متصل ذكي")}</Badge>}
        </div>
        <p className="text-sm text-[var(--color-ink-muted)]">Product No. {appliance.documentNo} | Customer association is recorded per service order.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs text-[var(--color-ink-muted)]">{bi("Brand", "العلامة التجارية")}</p><p className="mt-1 text-sm font-medium">{brand?.name}</p></Card>
        <Card><p className="text-xs text-[var(--color-ink-muted)]">{bi("Category", "الفئة")}</p><p className="mt-1 text-sm font-medium">{bi(appliance.category, APPLIANCE_CATEGORY_AR[appliance.category])}</p></Card>
        <Card><p className="text-xs text-[var(--color-ink-muted)]">{bi("Serial / IMEI", "الرقم التسلسلي / الآيمي")}</p><p className="mt-1 text-sm font-medium">{appliance.serialNo}{appliance.imeiNo ? ` / ${appliance.imeiNo}` : ""}</p></Card>
        <Card><p className="text-xs text-[var(--color-ink-muted)]">{bi("Warranty Status", "حالة الضمان")}</p><div className="mt-1"><Badge tone={appliance.warrantyStatus === "In Warranty" ? "good" : "neutral"}>{bi(appliance.warrantyStatus, WARRANTY_STATUS_AR[appliance.warrantyStatus])}</Badge></div></Card>
      </div>

      <Card>
        <CardHeader title={bi("Warranty record", "سجل الضمان")} subtitle={brand?.name} />
        <p className="text-sm text-[var(--color-ink-secondary)]">{brand?.rules}</p>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Purchased {formatDate(appliance.purchaseDate)} | {brand?.warrantyMonths} month warranty period</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={bi("Purchase & warranty proof", "إثبات الشراء والضمان")} />
          <div className="space-y-1.5 text-sm">
            {appliance.purchaseInvoiceNo && <p><span className="text-[var(--color-ink-muted)]">{bi("Invoice / receipt no.", "رقم الفاتورة / الإيصال")}:</span> {appliance.purchaseInvoiceNo}</p>}
            {appliance.retailerName && <p><span className="text-[var(--color-ink-muted)]">{bi("Retailer", "المتجر")}:</span> {appliance.retailerName}</p>}
            {appliance.purchasePrice != null && <p><span className="text-[var(--color-ink-muted)]">{bi("Purchase price", "سعر الشراء")}:</span> {formatCurrency(appliance.purchasePrice)}</p>}
            <p><span className="text-[var(--color-ink-muted)]">{bi("Extended warranty / AMC", "الضمان الممدد / عقد الصيانة")}:</span> {appliance.amcActive ? <Badge tone="good">{bi("Active", "فعال")}{appliance.amcExpiryDate ? ` — ${formatDate(appliance.amcExpiryDate)}` : ""}</Badge> : <Badge tone="neutral">{bi("Not active", "غير فعال")}</Badge>}</p>
            {!appliance.purchaseInvoiceNo && !appliance.retailerName && appliance.purchasePrice == null && <p className="text-[var(--color-ink-muted)]">{bi("No purchase details on file.", "لا توجد تفاصيل شراء مسجلة.")}</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title={bi("Compliance, specs & site", "المطابقة والمواصفات والموقع")} />
          <div className="space-y-1.5 text-sm">
            {appliance.sasoCertNo && <p><span className="text-[var(--color-ink-muted)]">{bi("SASO cert. no.", "رقم شهادة سابر")}:</span> {appliance.sasoCertNo}</p>}
            {appliance.energyRating && <p><span className="text-[var(--color-ink-muted)]">{bi("Energy rating", "تصنيف الطاقة")}:</span> {"★".repeat(appliance.energyRating)}</p>}
            {appliance.countryOfManufacture && <p><span className="text-[var(--color-ink-muted)]">{bi("Country of manufacture", "بلد الصنع")}:</span> {appliance.countryOfManufacture}</p>}
            {appliance.color && <p><span className="text-[var(--color-ink-muted)]">{bi("Color", "اللون")}:</span> {appliance.color}</p>}
            {appliance.specification && <p><span className="text-[var(--color-ink-muted)]">{bi("Specification", "المواصفات")}:</span> {appliance.specification}</p>}
            {appliance.installationDate && <p><span className="text-[var(--color-ink-muted)]">{bi("Installed", "تاريخ التركيب")}:</span> {formatDate(appliance.installationDate)}</p>}
            {appliance.installedLocation && <p><span className="text-[var(--color-ink-muted)]">{bi("Site location", "موقع التركيب")}:</span> {appliance.installedLocation}</p>}
            {appliance.photoUrl && <img src={appliance.photoUrl} alt={appliance.model} className="mt-2 h-20 w-20 rounded-md border object-cover [border-color:var(--color-border)]" />}
          </div>
        </Card>
      </div>

      {appliance.isSmartConnected && (
        <Card>
          <CardHeader title={bi("Smart Diagnostics", "التشخيص الذكي")} subtitle="Simulated telemetry; production would call the brand's IoT service API" />
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div><p className="text-xs text-[var(--color-ink-muted)]">{bi("Last error", "آخر خطأ")}</p>{telemetry?.lastErrorCode ? <div className="mt-1 flex items-center gap-1.5"><Badge tone="serious">{telemetry.lastErrorCode}</Badge><span>{telemetry.lastErrorDescription}</span></div> : <p className="mt-1 font-medium">{bi("None reported", "لا يوجد أخطاء مسجلة")}</p>}</div>
            <div><p className="text-xs text-[var(--color-ink-muted)]">{bi("Cycle count", "عدد الدورات")}</p><p className="mt-1 font-medium tabular-nums">{telemetry?.cycleCount.toLocaleString()}</p></div>
            <div><p className="text-xs text-[var(--color-ink-muted)]">{bi("Last synced", "آخر مزامنة")}</p><p className="mt-1 font-medium">{telemetry ? relativeTime(telemetry.lastSyncAt) : "-"}</p></div>
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="p-5 pb-0"><CardHeader title={bi("Service history", "سجل الخدمة")} subtitle={`${history.length} sequenced job lines`} /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-y text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><th className="px-5 py-2 font-medium">{bi("Service order / sequence", "أمر الخدمة / التسلسل")}</th><th className="px-3 py-2 font-medium">{bi("Customer", "العميل")}</th><th className="px-3 py-2 font-medium">{bi("Invoice No.", "رقم الفاتورة")}</th><th className="px-3 py-2 font-medium">{bi("Type", "النوع")}</th><th className="px-3 py-2 font-medium">{bi("Status", "الحالة")}</th><th className="px-5 py-2 font-medium">{bi("Job date", "تاريخ المهمة")}</th></tr></thead>
            <tbody>
              {history.map((job) => {
                const customer = customers.find((candidate) => candidate.id === job.customerId);
                return <tr key={job.id} className="border-b last:border-0 [border-color:var(--color-border)]"><td className="px-5 py-2.5"><Link to={`/jobcards/${job.id}`} className="font-medium text-[var(--color-brand-1)]">{job.documentNo}</Link></td><td className="px-3 py-2.5">{customer?.name ?? "-"}<p className="text-xs text-[var(--color-ink-muted)]">{customer?.documentNo}</p></td><td className="px-3 py-2.5 text-[var(--color-ink-secondary)]">{job.invoiceNo}</td><td className="px-3 py-2.5"><JobTypeBadge jobType={job.jobType} /></td><td className="px-3 py-2.5"><JobStatusBadge status={job.status} /></td><td className="px-5 py-2.5 text-[var(--color-ink-muted)]">{formatDate(job.createdAt)}</td></tr>;
              })}
              {history.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-[var(--color-ink-muted)]">{bi("No service history.", "لا يوجد سجل خدمة.")}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
