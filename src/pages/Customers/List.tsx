import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { useStore } from "../../lib/store";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, SortableTh, Tabs, Textarea } from "../../components/ui";
import { filterByBranch } from "../../lib/selectors";
import { formatDate } from "../../lib/utils";
import { toast } from "../../lib/toast";
import { useSort } from "../../lib/useSort";
import { canPerform } from "../../lib/permissions";
import { isFieldRequired, getMissingCustomerFields } from "../../lib/requiredFields";
import { bi } from "../../lib/domainAr";
import type { Customer, CustomerType, Gender, PreferredLanguage } from "../../lib/types";

type SortKey = "document" | "name" | "phone" | "orders" | "jobs" | "since";
const PAGE_SIZE = 15;

const FORM_TABS = ["Name", "Contact", "Additional"];
const FORM_TAB_LABELS: Record<string, string> = {
  Name: bi("Name & Type", "الاسم والنوع"),
  Contact: bi("Contact", "بيانات الاتصال"),
  Additional: bi("Additional Details", "تفاصيل إضافية"),
};

function emptyCustomerForm(branchId: string) {
  return {
    firstName: "",
    fatherName: "",
    grandfatherName: "",
    familyName: "",
    firstNameAr: "",
    fatherNameAr: "",
    grandfatherNameAr: "",
    familyNameAr: "",
    customerType: "individual" as CustomerType,
    companyName: "",
    crNumber: "",
    vatNumber: "",
    contactPersonName: "",
    phone: "",
    homePhone: "",
    whatsapp: "",
    email: "",
    address: "",
    branchId,
    zone: "",
    nationalId: "",
    nationality: "",
    preferredLanguage: "" as PreferredLanguage | "",
    dateOfBirth: "",
    gender: "" as Gender | "",
    notes: "",
  };
}

export default function CustomerList() {
  const { customers, jobCards, serviceOrders, branches, zones, selectedBranchId, role, addCustomer, updateCustomer, deleteCustomer, aliasFieldsEnabled, requiredFieldsVersion } = useStore();
  // requiredFieldsVersion (destructured above) forces a re-render whenever the module-level table in requiredFields.ts changes.
  void requiredFieldsVersion;
  const canManage = canPerform(role, "create_customer");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const defaultBranchId = selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId;
  const [form, setForm] = useState(emptyCustomerForm(defaultBranchId));
  const [formTab, setFormTab] = useState("Name");
  const [page, setPage] = useState(1);

  const productCounts = useMemo(() => {
    const productSets = new Map<string, Set<string>>();
    for (const job of jobCards) {
      if (!productSets.has(job.customerId)) productSets.set(job.customerId, new Set());
      productSets.get(job.customerId)?.add(job.applianceId);
    }
    return new Map(Array.from(productSets, ([customerId, products]) => [customerId, products.size]));
  }, [jobCards]);
  const jobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobCards) counts.set(job.customerId, (counts.get(job.customerId) ?? 0) + 1);
    return counts;
  }, [jobCards]);
  const orderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of serviceOrders) counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
    return counts;
  }, [serviceOrders]);

  const filtered = useMemo(() => {
    let list = filterByBranch(customers, selectedBranchId);
    if (search.trim()) {
      const query = search.toLowerCase();
      const fields = (customer: Customer) => [
        customer.documentNo, customer.name, customer.nameAr, customer.phone, customer.homePhone, customer.whatsapp,
        customer.email, customer.address, customer.nationalId, customer.nationality, customer.companyName,
        customer.crNumber, customer.vatNumber, customer.contactPersonName, customer.notes,
      ];
      list = list.filter((customer) => fields(customer).some((value) => (value ?? "").toLowerCase().includes(query)));
    }
    return list;
  }, [customers, selectedBranchId, search]);

  const getValue = (customer: Customer, key: SortKey) => {
    if (key === "document") return customer.documentNo;
    if (key === "name") return customer.name;
    if (key === "phone") return customer.phone;
    if (key === "orders") return orderCounts.get(customer.id) ?? 0;
    if (key === "jobs") return jobCounts.get(customer.id) ?? 0;
    return new Date(customer.createdAt).getTime();
  };
  const { sorted: rows, sortKey, dir, toggle } = useSort<Customer, SortKey>(filtered, getValue, "since", "desc");
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openAdd() {
    setEditing(null);
    setForm(emptyCustomerForm(defaultBranchId));
    setFormTab("Name");
    setOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      firstName: customer.firstName ?? "",
      fatherName: customer.fatherName ?? "",
      grandfatherName: customer.grandfatherName ?? "",
      familyName: customer.familyName ?? "",
      firstNameAr: customer.firstNameAr ?? "",
      fatherNameAr: customer.fatherNameAr ?? "",
      grandfatherNameAr: customer.grandfatherNameAr ?? "",
      familyNameAr: customer.familyNameAr ?? "",
      customerType: customer.customerType,
      companyName: customer.companyName ?? "",
      crNumber: customer.crNumber ?? "",
      vatNumber: customer.vatNumber ?? "",
      contactPersonName: customer.contactPersonName ?? "",
      phone: customer.phone,
      homePhone: customer.homePhone ?? "",
      whatsapp: customer.whatsapp,
      email: customer.email ?? "",
      address: customer.address ?? "",
      branchId: customer.branchId,
      zone: customer.zone ?? "",
      nationalId: customer.nationalId ?? "",
      nationality: customer.nationality ?? "",
      preferredLanguage: customer.preferredLanguage ?? "",
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : "",
      gender: customer.gender ?? "",
      notes: customer.notes ?? "",
    });
    setFormTab("Name");
    setOpen(true);
  }

  function buildPayload() {
    const isCorporate = form.customerType === "corporate";
    return {
      ...form,
      firstName: isCorporate ? undefined : form.firstName,
      fatherName: isCorporate ? undefined : form.fatherName,
      grandfatherName: isCorporate ? undefined : (form.grandfatherName || undefined),
      familyName: isCorporate ? undefined : form.familyName,
      firstNameAr: isCorporate ? undefined : (form.firstNameAr.trim() || undefined),
      fatherNameAr: isCorporate ? undefined : (form.fatherNameAr.trim() || undefined),
      grandfatherNameAr: isCorporate ? undefined : (form.grandfatherNameAr.trim() || undefined),
      familyNameAr: isCorporate ? undefined : (form.familyNameAr.trim() || undefined),
      homePhone: form.homePhone || undefined,
      zone: form.zone || undefined,
      whatsapp: form.whatsapp.trim() || form.phone,
      nationalId: isCorporate ? undefined : (form.nationalId || undefined),
      nationality: isCorporate ? undefined : (form.nationality || undefined),
      preferredLanguage: form.preferredLanguage || undefined,
      dateOfBirth: isCorporate ? undefined : (form.dateOfBirth || undefined),
      gender: isCorporate ? undefined : (form.gender || undefined),
      notes: form.notes || undefined,
      companyName: isCorporate ? form.companyName : undefined,
      crNumber: isCorporate ? form.crNumber : undefined,
      vatNumber: isCorporate ? form.vatNumber : undefined,
      contactPersonName: isCorporate ? (form.contactPersonName || undefined) : undefined,
    };
  }

  async function submit() {
    if (getMissingCustomerFields(form.customerType, form).length > 0) return;
    if (editing) {
      const outcome = await updateCustomer(editing.id, buildPayload());
      toast(outcome.message, outcome.ok ? "success" : "error");
      if (outcome.ok) { setOpen(false); setEditing(null); }
      return;
    }
    const existing = customers.find((customer) => customer.phone.replace(/\D/g, "") === form.phone.replace(/\D/g, ""));
    const saved = await addCustomer(buildPayload());
    setForm(emptyCustomerForm(defaultBranchId));
    setFormTab("Name");
    setOpen(false);
    toast(existing ? `${saved.documentNo} already uses this phone number; the existing customer was kept.` : `${saved.documentNo} added to customers.`, existing ? "info" : "success");
  }

  async function remove(customer: Customer) {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    const outcome = await deleteCustomer(customer.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-rise-in">
        <div><h1 className="text-xl font-semibold tracking-tight">{bi("Customers", "العملاء")}</h1><p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{rows.length} customer records</p></div>
        {canManage && <Button onClick={openAdd}>+ {bi("Add Customer", "إضافة عميل")}</Button>}
      </div>

      <Card><div className="relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" /><Input placeholder={bi("Search customer no., name, phone, email...", "بحث برقم العميل أو الاسم أو الهاتف أو البريد الإلكتروني...")} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-8" /></div></Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="block p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-[var(--color-ink-muted)]">{customer.documentNo}</p><p className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{customer.name}</p>{customer.nameAr && <p dir="rtl" className="truncate text-xs text-[var(--color-ink-muted)]">{customer.nameAr}</p>}<p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{customer.phone}</p></div><Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? bi("Verified", "موثّق") : bi("Unverified", "غير موثّق")}</Badge></div>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)]"><span>{orderCounts.get(customer.id) ?? 0} orders | {productCounts.get(customer.id) ?? 0} products | {jobCounts.get(customer.id) ?? 0} lines</span><span>Since {formatDate(customer.createdAt)}</span></div>
              {canManage && (
                <div className="mt-3 flex gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(customer)}>{bi("Edit", "تعديل")}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(customer)}>{bi("Delete", "حذف")}</Button>
                </div>
              )}
            </Link>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[980px] text-sm">
            <thead><tr className="sticky top-0 z-10 border-b bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><SortableTh label={bi("Customer No.", "رقم العميل")} active={sortKey === "document"} direction={dir} onClick={() => toggle("document")} className="px-5 py-3" /><SortableTh label={bi("Name", "الاسم")} active={sortKey === "name"} direction={dir} onClick={() => toggle("name")} className="px-3 py-3" /><SortableTh label={bi("Mobile Phone", "الجوال")} active={sortKey === "phone"} direction={dir} onClick={() => toggle("phone")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">{bi("WhatsApp", "واتساب")}</th><th className="px-3 py-3 font-medium">{bi("Email", "البريد الإلكتروني")}</th><SortableTh label={bi("Orders", "الطلبات")} active={sortKey === "orders"} direction={dir} onClick={() => toggle("orders")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">{bi("Products", "المنتجات")}</th><SortableTh label={bi("Job lines", "بنود المهام")} active={sortKey === "jobs"} direction={dir} onClick={() => toggle("jobs")} className="px-3 py-3" /><SortableTh label={bi("Since", "منذ")} active={sortKey === "since"} direction={dir} onClick={() => toggle("since")} className="px-5 py-3" />{canManage && <th className="px-3 py-3 font-medium">{bi("Actions", "الإجراءات")}</th>}</tr></thead>
            <tbody>
              {pagedRows.map((customer) => <tr key={customer.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] [border-color:var(--color-border)]"><td className="px-5 py-3 text-[var(--color-ink-secondary)]">{customer.documentNo}</td><td className="px-3 py-3"><Link to={`/customers/${customer.id}`} className="font-medium text-[var(--color-brand-1)]">{customer.name}</Link>{customer.nameAr && <p dir="rtl" className="text-xs text-[var(--color-ink-muted)]">{customer.nameAr}</p>}</td><td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer.phone}</td><td className="px-3 py-3"><Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? bi("Verified", "موثّق") : bi("Unverified", "غير موثّق")}</Badge></td><td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer.email}</td><td className="px-3 py-3 tabular-nums">{orderCounts.get(customer.id) ?? 0}</td><td className="px-3 py-3 tabular-nums">{productCounts.get(customer.id) ?? 0}</td><td className="px-3 py-3 tabular-nums">{jobCounts.get(customer.id) ?? 0}</td><td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(customer.createdAt)}</td>{canManage && <td className="px-3 py-3"><div className="flex gap-1.5"><Button size="sm" variant="secondary" onClick={() => openEdit(customer)}>{bi("Edit", "تعديل")}</Button><Button size="sm" variant="danger" onClick={() => remove(customer)}>{bi("Delete", "حذف")}</Button></div></td>}</tr>)}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<Users size={18} />} title={bi("No customers found", "لم يتم العثور على عملاء")} subtitle="Try a different search term." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? bi("Edit Customer", "تعديل العميل") : bi("Add Customer", "إضافة عميل")} width="lg">
        <div className="space-y-4">
          <Tabs tabs={FORM_TABS} active={formTab} onChange={setFormTab} labels={FORM_TAB_LABELS} />

          {formTab === "Name" && (
            <div className="space-y-3">
              <Field label={bi("Customer type", "نوع العميل")}>
                <Select value={form.customerType} onChange={(event) => setForm({ ...form, customerType: event.target.value as CustomerType })}>
                  <option value="individual">{bi("Individual", "فرد")}</option>
                  <option value="corporate">{bi("Corporate", "شركة")}</option>
                </Select>
              </Field>
              {form.customerType === "individual" ? (
                <>
                  <p className="text-xs text-[var(--color-ink-muted)]">{bi("Saudi naming convention: given name, father's name, grandfather's name (optional), family name.", "الترتيب السعودي للاسم: الاسم الأول، اسم الأب، اسم الجد (اختياري)، اسم العائلة.")}{aliasFieldsEnabled && bi(" Add the Arabic alias alongside each name if needed.", " أضف الاسم بالعربية بجانب كل اسم عند الحاجة.")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={bi("First name", "الاسم الأول")} required={isFieldRequired("customer", "firstName")}>
                      <Input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                      {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.firstNameAr} onChange={(event) => setForm({ ...form, firstNameAr: event.target.value })} />}
                    </Field>
                    <Field label={bi("Father's name", "اسم الأب")} required={isFieldRequired("customer", "fatherName")}>
                      <Input value={form.fatherName} onChange={(event) => setForm({ ...form, fatherName: event.target.value })} />
                      {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.fatherNameAr} onChange={(event) => setForm({ ...form, fatherNameAr: event.target.value })} />}
                    </Field>
                    <Field label={bi("Grandfather's name (optional)", "اسم الجد (اختياري)")} required={isFieldRequired("customer", "grandfatherName")}>
                      <Input value={form.grandfatherName} onChange={(event) => setForm({ ...form, grandfatherName: event.target.value })} />
                      {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.grandfatherNameAr} onChange={(event) => setForm({ ...form, grandfatherNameAr: event.target.value })} />}
                    </Field>
                    <Field label={bi("Family name", "اسم العائلة")} required={isFieldRequired("customer", "familyName")}>
                      <Input value={form.familyName} onChange={(event) => setForm({ ...form, familyName: event.target.value })} />
                      {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.familyNameAr} onChange={(event) => setForm({ ...form, familyNameAr: event.target.value })} />}
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-[var(--color-ink-muted)]">{bi("Saudi e-invoicing (ZATCA) compliance requires the company's legal name, Commercial Registration number, and VAT registration number for a corporate buyer.", "يتطلب التوافق مع الفوترة الإلكترونية السعودية (زاتكا) الاسم القانوني للشركة ورقم السجل التجاري والرقم الضريبي للمشتري من نوع الشركات.")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={bi("Company name", "اسم الشركة")} required={isFieldRequired("customer", "companyName")}>
                      <Input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
                    </Field>
                    <Field label={bi("CR number (Commercial Registration)", "رقم السجل التجاري")} required={isFieldRequired("customer", "crNumber")}>
                      <Input value={form.crNumber} onChange={(event) => setForm({ ...form, crNumber: event.target.value })} />
                    </Field>
                    <Field label={bi("VAT registration number", "الرقم الضريبي")} required={isFieldRequired("customer", "vatNumber")}>
                      <Input value={form.vatNumber} onChange={(event) => setForm({ ...form, vatNumber: event.target.value })} placeholder="3XXXXXXXXXXXXX3" />
                    </Field>
                    <Field label={bi("Contact person name (optional)", "اسم الشخص المسؤول (اختياري)")} required={isFieldRequired("customer", "contactPersonName")}>
                      <Input value={form.contactPersonName} onChange={(event) => setForm({ ...form, contactPersonName: event.target.value })} />
                    </Field>
                  </div>
                </>
              )}
            </div>
          )}

          {formTab === "Contact" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("Mobile phone", "الجوال")} required={isFieldRequired("customer", "phone")}><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+966..." /></Field>
                <Field label={bi("Home phone (optional)", "الهاتف المنزلي (اختياري)")} required={isFieldRequired("customer", "homePhone")}><Input value={form.homePhone} onChange={(event) => setForm({ ...form, homePhone: event.target.value })} placeholder="+9661..." /></Field>
                <Field label={bi("WhatsApp", "واتساب")} required={isFieldRequired("customer", "whatsapp")}><Input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="Defaults to mobile" /></Field>
                <Field label={bi("Email", "البريد الإلكتروني")} required={isFieldRequired("customer", "email")}><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
              </div>
              <Field label={bi("Address", "العنوان")} required={isFieldRequired("customer", "address")}><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("Branch", "الفرع")}>
                  <Select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value, zone: "" })}>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </Select>
                </Field>
                <Field label={bi("Zone (optional)", "المنطقة (اختياري)")}>
                  <Select value={form.zone} onChange={(event) => setForm({ ...form, zone: event.target.value })}>
                    <option value="">{bi("Not set", "غير محدد")}</option>
                    {zones.filter((z) => z.branchId === form.branchId).map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {formTab === "Additional" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("National ID / Iqama No.", "رقم الهوية / الإقامة")} required={form.customerType === "individual" && isFieldRequired("customer", "nationalId")}><Input value={form.nationalId} onChange={(event) => setForm({ ...form, nationalId: event.target.value })} /></Field>
                <Field label={bi("Nationality", "الجنسية")} required={form.customerType === "individual" && isFieldRequired("customer", "nationality")}><Input value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} placeholder="Saudi" /></Field>
                <Field label={bi("Preferred language", "اللغة المفضلة")} required={isFieldRequired("customer", "preferredLanguage")}>
                  <Select value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as PreferredLanguage | "" })}>
                    <option value="">{bi("Not set", "غير محدد")}</option>
                    <option value="ar">{bi("Arabic", "العربية")}</option>
                    <option value="en">{bi("English", "الإنجليزية")}</option>
                  </Select>
                </Field>
                <Field label={bi("Date of birth", "تاريخ الميلاد")} required={form.customerType === "individual" && isFieldRequired("customer", "dateOfBirth")}><Input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></Field>
                <Field label={bi("Gender", "الجنس")} required={form.customerType === "individual" && isFieldRequired("customer", "gender")}>
                  <Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender | "" })}>
                    <option value="">{bi("Not specified", "غير محدد")}</option>
                    <option value="male">{bi("Male", "ذكر")}</option>
                    <option value="female">{bi("Female", "أنثى")}</option>
                  </Select>
                </Field>
              </div>
              <Field label={bi("Notes", "ملاحظات")} required={isFieldRequired("customer", "notes")}><Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          )}

          <Button className="w-full justify-center" onClick={submit} disabled={getMissingCustomerFields(form.customerType, form).length > 0}>{bi("Save Customer", "حفظ العميل")}</Button>
        </div>
      </Modal>
    </div>
  );
}
