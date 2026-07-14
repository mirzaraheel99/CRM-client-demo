import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Field, Select, Textarea, Button, Badge, Input } from "../../components/ui";
import { JobTypeBadge } from "../../components/StatusBadge";
import { toast } from "../../lib/toast";
import { filterByBranch } from "../../lib/selectors";
import { formatDate, formatSequence } from "../../lib/utils";
import { APPLIANCE_CATEGORY_AR, JOB_TYPE_AR, bi } from "../../lib/domainAr";
import type { ApplianceCategory, JobType } from "../../lib/types";

const CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];
const NEW_CUSTOMER = "__new_customer__";
const NEW_PRODUCT = "__new_product__";

type NewProductForm = {
  brandId: string;
  category: ApplianceCategory;
  model: string;
  serialNo: string;
  imeiNo: string;
  purchaseDate: string;
  isSmartConnected: boolean;
};

type IntakeLine = {
  key: number;
  applianceId: string;
  technicianId: string;
  problem: string;
  jobTypeOverride: JobType | "auto";
  newProduct: NewProductForm;
};

let lineKey = 1;

function emptyLine(applianceId = ""): IntakeLine {
  return {
    key: lineKey++,
    applianceId,
    technicianId: "",
    problem: "",
    jobTypeOverride: "auto",
    newProduct: { brandId: "", category: "AC", model: "", serialNo: "", imeiNo: "", purchaseDate: "", isSmartConnected: false },
  };
}

export default function NewJobCard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customers, appliances, brands, branches, technicians, selectedBranchId, createServiceOrder, addCustomer, addAppliance } = useStore();
  const initialCustomerId = searchParams.get("customerId") ?? "";
  const initialCustomer = customers.find((customer) => customer.id === initialCustomerId);
  const initialApplianceId = searchParams.get("applianceId") ?? "";
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [branchId, setBranchId] = useState(initialCustomer?.branchId ?? (selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId));
  const [newCustomer, setNewCustomer] = useState({ firstName: "", fatherName: "", grandfatherName: "", familyName: "", phone: "", homePhone: "", whatsapp: "", email: "", address: "" });
  const [lines, setLines] = useState<IntakeLine[]>([emptyLine(initialApplianceId)]);

  const scopedCustomers = useMemo(() => filterByBranch(customers, selectedBranchId), [customers, selectedBranchId]);
  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const applianceMap = useMemo(() => new Map(appliances.map((appliance) => [appliance.id, appliance])), [appliances]);
  const selectedIds = useMemo(() => new Set(lines.map((line) => line.applianceId).filter((id) => id && id !== NEW_PRODUCT)), [lines]);
  const branchTechnicians = useMemo(() => technicians.filter((technician) => technician.branchId === branchId && technician.status !== "Off Duty"), [technicians, branchId]);
  const customerReady = customerId === NEW_CUSTOMER ? Boolean(newCustomer.firstName.trim() && newCustomer.familyName.trim() && newCustomer.phone.trim() && branchId) : Boolean(customerId);
  const lineReady = (line: IntakeLine) => {
    if (!line.problem.trim() || line.problem.trim().length <= 3) return false;
    if (line.applianceId === NEW_PRODUCT) return Boolean(line.newProduct.brandId && line.newProduct.model.trim() && line.newProduct.serialNo.trim() && line.newProduct.purchaseDate);
    return Boolean(line.applianceId);
  };
  const canSubmit = Boolean(
    customerReady && branchId && lines.length > 0 &&
    lines.every(lineReady) &&
    selectedIds.size === lines.filter((line) => line.applianceId !== NEW_PRODUCT).length
  );

  function selectCustomer(nextCustomerId: string) {
    const customer = customers.find((candidate) => candidate.id === nextCustomerId);
    setCustomerId(nextCustomerId);
    if (customer) setBranchId(customer.branchId);
  }

  function patchLine(key: number, patch: Partial<IntakeLine>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function patchNewProduct(key: number, patch: Partial<NewProductForm>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, newProduct: { ...line.newProduct, ...patch } } : line));
  }

  function warrantyStatus(product: NewProductForm) {
    const brand = brands.find((candidate) => candidate.id === product.brandId);
    if (!brand || !product.purchaseDate) return "Unknown" as const;
    const months = (Date.now() - new Date(product.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months < brand.warrantyMonths ? "In Warranty" as const : "Out of Warranty" as const;
  }

  function submit() {
    if (!canSubmit) return;
    const customer = customerId === NEW_CUSTOMER
      ? addCustomer({
        ...newCustomer,
        grandfatherName: newCustomer.grandfatherName || undefined,
        homePhone: newCustomer.homePhone || undefined,
        whatsapp: newCustomer.whatsapp.trim() || newCustomer.phone,
        branchId,
        customerType: "individual",
      })
      : customers.find((candidate) => candidate.id === customerId);
    if (!customer) {
      toast("Choose or add a customer before creating the service order.", "error");
      return;
    }

    const preparedLines: Parameters<typeof createServiceOrder>[0]["lines"] = [];
    for (const line of lines) {
      const appliance = line.applianceId === NEW_PRODUCT
        ? addAppliance({
          ...line.newProduct,
          imeiNo: line.newProduct.imeiNo || undefined,
          warrantyStatus: warrantyStatus(line.newProduct),
        })
        : applianceMap.get(line.applianceId);
      if (!appliance) {
        toast("Choose or register a product for every sequence.", "error");
        return;
      }
      const detected: JobType = appliance.warrantyStatus === "In Warranty" ? "warranty" : "non_warranty";
      preparedLines.push({
        applianceId: appliance.id,
        jobType: line.jobTypeOverride === "auto" ? detected : line.jobTypeOverride,
        problemDescription: line.problem,
        technicianId: line.technicianId || null,
      });
    }

    const result = createServiceOrder({
      customerId: customer.id,
      branchId,
      lines: preparedLines,
    });
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok && result.jobs?.[0]) navigate(`/jobcards/${result.jobs[0].id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">{bi("New Service Order", "أمر خدمة جديد")}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">One customer order with a separate numbered workflow for every product received.</p>
      </div>

      <Card className="space-y-4">
        <CardHeader title={bi("Customer and receiving branch", "العميل والفرع المستقبل")} subtitle="The phone number identifies the customer; products are associated through this service order." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={bi("Customer", "العميل")}>
            <Select value={customerId} onChange={(event) => selectCustomer(event.target.value)}>
              <option value="">{bi("Choose by name or phone...", "اختر بالاسم أو الهاتف...")}</option>
              <option value={NEW_CUSTOMER}>+ {bi("Add new customer", "إضافة عميل جديد")}</option>
              {scopedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.documentNo} - {customer.name} - {customer.phone}</option>)}
            </Select>
          </Field>
          <Field label={bi("Receiving branch", "الفرع المستقبل")}>
            <Select value={branchId} disabled={Boolean(customerId && customerId !== NEW_CUSTOMER)} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
          </Field>
        </div>
        {customerId === NEW_CUSTOMER && (
          <div className="space-y-3 rounded-md bg-black/[0.03] p-3 dark:bg-white/[0.05]">
            <p className="text-xs text-[var(--color-ink-muted)]">{bi("Saudi naming convention: given name, father's name, grandfather's name (optional), family name.", "الترتيب السعودي للاسم: الاسم الأول، اسم الأب، اسم الجد (اختياري)، اسم العائلة.")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bi("First name", "الاسم الأول")}><Input value={newCustomer.firstName} onChange={(event) => setNewCustomer({ ...newCustomer, firstName: event.target.value })} /></Field>
              <Field label={bi("Father's name", "اسم الأب")}><Input value={newCustomer.fatherName} onChange={(event) => setNewCustomer({ ...newCustomer, fatherName: event.target.value })} /></Field>
              <Field label={bi("Grandfather's name (optional)", "اسم الجد (اختياري)")}><Input value={newCustomer.grandfatherName} onChange={(event) => setNewCustomer({ ...newCustomer, grandfatherName: event.target.value })} /></Field>
              <Field label={bi("Family name", "اسم العائلة")}><Input value={newCustomer.familyName} onChange={(event) => setNewCustomer({ ...newCustomer, familyName: event.target.value })} /></Field>
              <Field label={bi("Mobile phone", "الجوال")}><Input value={newCustomer.phone} onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })} placeholder="+966..." /></Field>
              <Field label={bi("Home phone (optional)", "الهاتف المنزلي (اختياري)")}><Input value={newCustomer.homePhone} onChange={(event) => setNewCustomer({ ...newCustomer, homePhone: event.target.value })} placeholder="+9661..." /></Field>
              <Field label={bi("WhatsApp", "واتساب")}><Input value={newCustomer.whatsapp} onChange={(event) => setNewCustomer({ ...newCustomer, whatsapp: event.target.value })} placeholder="Defaults to mobile" /></Field>
              <Field label={bi("Email", "البريد الإلكتروني")}><Input value={newCustomer.email} onChange={(event) => setNewCustomer({ ...newCustomer, email: event.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label={bi("Address", "العنوان")}><Input value={newCustomer.address} onChange={(event) => setNewCustomer({ ...newCustomer, address: event.target.value })} /></Field></div>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardHeader title={bi("Product sequences", "تسلسل المنتجات")} subtitle="Each sequence keeps its own dates, warranty, diagnosis, estimate, invoice, technician, and status." />
          <Button variant="secondary" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>
            <Plus size={14} /> {bi("Add product", "إضافة منتج")}
          </Button>
        </div>

        <div className="divide-y [border-color:var(--color-border)]">
          {lines.map((line, index) => {
            const appliance = applianceMap.get(line.applianceId);
            const brand = appliance ? brandMap.get(appliance.brandId) : undefined;
            const detectedJobType: JobType = appliance?.warrantyStatus === "In Warranty" ? "warranty" : "non_warranty";
            return (
              <section key={line.key} className="py-5 first:pt-1 last:pb-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{bi("Sequence", "التسلسل")} {formatSequence(index + 1)}</Badge>
                    {appliance && <span className="text-xs text-[var(--color-ink-muted)]">{appliance.documentNo}</span>}
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      title={`Remove sequence ${formatSequence(index + 1)}`}
                      aria-label={`Remove sequence ${formatSequence(index + 1)}`}
                      onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-black/[0.05] hover:text-[var(--color-status-critical)] dark:hover:bg-white/[0.08]"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={bi("Product / equipment", "المنتج / الجهاز")}>
                    <Select value={line.applianceId} onChange={(event) => patchLine(line.key, { applianceId: event.target.value })}>
                      <option value="">{bi("Choose a registered product...", "اختر منتجاً مسجلاً...")}</option>
                      <option value={NEW_PRODUCT}>+ {bi("Register new product unit", "تسجيل وحدة منتج جديدة")}</option>
                      {appliances.map((candidate) => (
                        <option key={candidate.id} value={candidate.id} disabled={selectedIds.has(candidate.id) && candidate.id !== line.applianceId}>
                          {candidate.documentNo} - {candidate.model} - SN {candidate.serialNo}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={bi("Warranty handling", "معالجة الضمان")}>
                    <Select value={line.jobTypeOverride} onChange={(event) => patchLine(line.key, { jobTypeOverride: event.target.value as JobType | "auto" })}>
                      <option value="auto">{bi(`Auto-detect (${detectedJobType === "warranty" ? "Warranty" : "Non-Warranty"})`, `كشف تلقائي (${JOB_TYPE_AR[detectedJobType]})`)}</option>
                      <option value="warranty">{bi("Force Warranty", "فرض الضمان")}</option>
                      <option value="non_warranty">{bi("Force Non-Warranty", "فرض بدون ضمان")}</option>
                    </Select>
                  </Field>
                </div>

                {line.applianceId === NEW_PRODUCT && (
                  <div className="mt-3 rounded-md bg-black/[0.03] p-3 dark:bg-white/[0.05]">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{bi("Register exact product unit", "تسجيل وحدة المنتج بالتحديد")}</p>
                      <Badge tone="brand">{bi("New Product No. after save", "رقم منتج جديد بعد الحفظ")}</Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={bi("Brand", "العلامة التجارية")}>
                        <Select value={line.newProduct.brandId} onChange={(event) => patchNewProduct(line.key, { brandId: event.target.value })}>
                          <option value="">{bi("Choose brand...", "اختر العلامة التجارية...")}</option>
                          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                        </Select>
                      </Field>
                      <Field label={bi("Category", "الفئة")}>
                        <Select value={line.newProduct.category} onChange={(event) => patchNewProduct(line.key, { category: event.target.value as ApplianceCategory })}>
                          {CATEGORIES.map((item) => <option key={item} value={item}>{bi(item, APPLIANCE_CATEGORY_AR[item])}</option>)}
                        </Select>
                      </Field>
                      <Field label={bi("Model", "الطراز")}><Input value={line.newProduct.model} onChange={(event) => patchNewProduct(line.key, { model: event.target.value })} /></Field>
                      <Field label={bi("Serial number / unit number", "الرقم التسلسلي / رقم الوحدة")}><Input value={line.newProduct.serialNo} onChange={(event) => patchNewProduct(line.key, { serialNo: event.target.value })} /></Field>
                      {line.newProduct.category === "Mobile" && <Field label={bi("IMEI", "الآيمي")}><Input value={line.newProduct.imeiNo} onChange={(event) => patchNewProduct(line.key, { imeiNo: event.target.value })} /></Field>}
                      <Field label={bi("Purchase date", "تاريخ الشراء")}><Input value={line.newProduct.purchaseDate} onChange={(event) => patchNewProduct(line.key, { purchaseDate: event.target.value })} placeholder="YYYY-MM-DD" /></Field>
                    </div>
                    <p className="mt-3 text-xs text-[var(--color-ink-muted)]">For five identical purchased units, register each physical unit separately with its own serial/unit number. The demo will assign an `AST-xxxxx` product number, then this service order will assign the affected unit its own sequence.</p>
                  </div>
                )}

                {appliance && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-black/[0.03] p-3 text-sm dark:bg-white/[0.05]">
                    <div>
                      <p className="font-medium">{appliance.model}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">{brand?.name} | Purchased {formatDate(appliance.purchaseDate)} | Serial {appliance.serialNo}</p>
                    </div>
                    <JobTypeBadge jobType={detectedJobType} />
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label={bi("Assign technician", "إسناد فني")}>
                    <Select value={line.technicianId} onChange={(event) => patchLine(line.key, { technicianId: event.target.value })}>
                      <option value="">{bi("Assign later", "الإسناد لاحقاً")}</option>
                      {branchTechnicians
                        .filter((technician) => {
                          const category = line.applianceId === NEW_PRODUCT ? line.newProduct.category : appliance?.category;
                          return !category || technician.skills.includes(category);
                        })
                        .map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
                    </Select>
                  </Field>
                  <div className="rounded-md bg-black/[0.03] p-3 text-xs text-[var(--color-ink-muted)] dark:bg-white/[0.05]">
                    <p className="font-medium text-[var(--color-ink-secondary)]">{bi("IDs created on submit", "المعرّفات التي تُنشأ عند الإرسال")}</p>
                    <p>Product unit: existing `AST` or a new `AST` number.</p>
                    <p>Service line: service order sequence {formatSequence(index + 1)}.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Field label={bi("Reported problem / requested service", "المشكلة المُبلّغ عنها / الخدمة المطلوبة")}>
                    <Textarea rows={3} value={line.problem} onChange={(event) => patchLine(line.key, { problem: event.target.value })} placeholder="Describe the issue for this product sequence..." />
                  </Field>
                </div>
              </section>
            );
          })}
        </div>

        {lines.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--color-ink-muted)]">
            <PackagePlus size={22} />
            <p className="text-sm">{bi("Add at least one product to this service order.", "أضف منتجاً واحداً على الأقل لهذا أمر الخدمة.")}</p>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>{bi("Cancel", "إلغاء")}</Button>
        <Button onClick={submit} disabled={!canSubmit}>{bi(`Create service order (${lines.length} ${lines.length === 1 ? "sequence" : "sequences"})`, `إنشاء أمر خدمة (${lines.length})`)}</Button>
      </div>
    </div>
  );
}
