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
import { bi } from "../../lib/domainAr";
import type { Customer, CustomerType, Gender, PreferredLanguage } from "../../lib/types";

type SortKey = "document" | "name" | "phone" | "orders" | "jobs" | "since";
const PAGE_SIZE = 15;

const FORM_TABS = ["Name", "Arabic", "Contact", "Additional"];
const FORM_TAB_LABELS: Record<string, string> = {
  Name: bi("Name & Type", "الاسم والنوع"),
  Arabic: bi("Arabic Name", "الاسم بالعربية"),
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
    phone: "",
    homePhone: "",
    whatsapp: "",
    email: "",
    address: "",
    branchId,
    nationalId: "",
    nationality: "",
    preferredLanguage: "" as PreferredLanguage | "",
    dateOfBirth: "",
    gender: "" as Gender | "",
    notes: "",
  };
}

export default function CustomerList() {
  const { customers, jobCards, serviceOrders, branches, selectedBranchId, role, addCustomer, aliasFieldsEnabled } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
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
      list = list.filter((customer) => customer.documentNo.toLowerCase().includes(query) || customer.name.toLowerCase().includes(query) || customer.phone.includes(query) || customer.email.toLowerCase().includes(query));
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

  async function submit() {
    if (!form.firstName.trim() || !form.familyName.trim() || !form.phone.trim()) return;
    const existing = customers.find((customer) => customer.phone.replace(/\D/g, "") === form.phone.replace(/\D/g, ""));
    const saved = await addCustomer({
      ...form,
      grandfatherName: form.grandfatherName || undefined,
      firstNameAr: form.firstNameAr.trim() || undefined,
      fatherNameAr: form.fatherNameAr.trim() || undefined,
      grandfatherNameAr: form.grandfatherNameAr.trim() || undefined,
      familyNameAr: form.familyNameAr.trim() || undefined,
      homePhone: form.homePhone || undefined,
      whatsapp: form.whatsapp.trim() || form.phone,
      nationalId: form.nationalId || undefined,
      nationality: form.nationality || undefined,
      preferredLanguage: form.preferredLanguage || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      notes: form.notes || undefined,
      companyName: form.customerType === "corporate" ? form.companyName : undefined,
      crNumber: form.customerType === "corporate" ? form.crNumber : undefined,
    });
    setForm(emptyCustomerForm(defaultBranchId));
    setFormTab("Name");
    setOpen(false);
    toast(existing ? `${saved.documentNo} already uses this phone number; the existing customer was kept.` : `${saved.documentNo} added to customers.`, existing ? "info" : "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-rise-in">
        <div><h1 className="text-xl font-semibold tracking-tight">{bi("Customers", "العملاء")}</h1><p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{rows.length} customer records</p></div>
        {canPerform(role, "create_customer") && <Button onClick={() => { setForm(emptyCustomerForm(defaultBranchId)); setFormTab("Name"); setOpen(true); }}>+ {bi("Add Customer", "إضافة عميل")}</Button>}
      </div>

      <Card><div className="relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" /><Input placeholder="Search customer no., name, phone, email..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-8" /></div></Card>

      <Card padded={false}>
        <div className="divide-y [border-color:var(--color-border)] sm:hidden">
          {pagedRows.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="block p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-[var(--color-ink-muted)]">{customer.documentNo}</p><p className="truncate text-sm font-semibold text-[var(--color-brand-1)]">{customer.name}</p>{customer.nameAr && <p dir="rtl" className="truncate text-xs text-[var(--color-ink-muted)]">{customer.nameAr}</p>}<p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{customer.phone}</p></div><Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? bi("Verified", "موثّق") : bi("Unverified", "غير موثّق")}</Badge></div>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)]"><span>{orderCounts.get(customer.id) ?? 0} orders | {productCounts.get(customer.id) ?? 0} products | {jobCounts.get(customer.id) ?? 0} lines</span><span>Since {formatDate(customer.createdAt)}</span></div>
            </Link>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[980px] text-sm">
            <thead><tr className="sticky top-0 z-10 border-b bg-[var(--color-surface-1)] text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><SortableTh label={bi("Customer No.", "رقم العميل")} active={sortKey === "document"} direction={dir} onClick={() => toggle("document")} className="px-5 py-3" /><SortableTh label={bi("Name", "الاسم")} active={sortKey === "name"} direction={dir} onClick={() => toggle("name")} className="px-3 py-3" /><SortableTh label={bi("Mobile Phone", "الجوال")} active={sortKey === "phone"} direction={dir} onClick={() => toggle("phone")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">{bi("WhatsApp", "واتساب")}</th><th className="px-3 py-3 font-medium">{bi("Email", "البريد الإلكتروني")}</th><SortableTh label={bi("Orders", "الطلبات")} active={sortKey === "orders"} direction={dir} onClick={() => toggle("orders")} className="px-3 py-3" /><th className="px-3 py-3 font-medium">{bi("Products", "المنتجات")}</th><SortableTh label={bi("Job lines", "بنود المهام")} active={sortKey === "jobs"} direction={dir} onClick={() => toggle("jobs")} className="px-3 py-3" /><SortableTh label={bi("Since", "منذ")} active={sortKey === "since"} direction={dir} onClick={() => toggle("since")} className="px-5 py-3" /></tr></thead>
            <tbody>
              {pagedRows.map((customer) => <tr key={customer.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] [border-color:var(--color-border)]"><td className="px-5 py-3 text-[var(--color-ink-secondary)]">{customer.documentNo}</td><td className="px-3 py-3"><Link to={`/customers/${customer.id}`} className="font-medium text-[var(--color-brand-1)]">{customer.name}</Link>{customer.nameAr && <p dir="rtl" className="text-xs text-[var(--color-ink-muted)]">{customer.nameAr}</p>}</td><td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer.phone}</td><td className="px-3 py-3"><Badge tone={customer.whatsappVerified ? "good" : "warning"}>{customer.whatsappVerified ? bi("Verified", "موثّق") : bi("Unverified", "غير موثّق")}</Badge></td><td className="px-3 py-3 text-[var(--color-ink-secondary)]">{customer.email}</td><td className="px-3 py-3 tabular-nums">{orderCounts.get(customer.id) ?? 0}</td><td className="px-3 py-3 tabular-nums">{productCounts.get(customer.id) ?? 0}</td><td className="px-3 py-3 tabular-nums">{jobCounts.get(customer.id) ?? 0}</td><td className="px-5 py-3 text-[var(--color-ink-muted)]">{formatDate(customer.createdAt)}</td></tr>)}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={<Users size={18} />} title={bi("No customers found", "لم يتم العثور على عملاء")} subtitle="Try a different search term." />}
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={bi("Add Customer", "إضافة عميل")} width="lg">
        <div className="space-y-4">
          <Tabs tabs={aliasFieldsEnabled ? FORM_TABS : FORM_TABS.filter((tab) => tab !== "Arabic")} active={formTab} onChange={setFormTab} labels={FORM_TAB_LABELS} />

          {formTab === "Name" && (
            <div className="space-y-3">
              <Field label={bi("Customer type", "نوع العميل")}>
                <Select value={form.customerType} onChange={(event) => setForm({ ...form, customerType: event.target.value as CustomerType })}>
                  <option value="individual">{bi("Individual", "فرد")}</option>
                  <option value="corporate">{bi("Corporate", "شركة")}</option>
                </Select>
              </Field>
              <p className="text-xs text-[var(--color-ink-muted)]">{bi("Saudi naming convention: given name, father's name, grandfather's name (optional), family name.", "الترتيب السعودي للاسم: الاسم الأول، اسم الأب، اسم الجد (اختياري)، اسم العائلة.")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("First name", "الاسم الأول")}><Input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Field>
                <Field label={bi("Father's name", "اسم الأب")}><Input value={form.fatherName} onChange={(event) => setForm({ ...form, fatherName: event.target.value })} /></Field>
                <Field label={bi("Grandfather's name (optional)", "اسم الجد (اختياري)")}><Input value={form.grandfatherName} onChange={(event) => setForm({ ...form, grandfatherName: event.target.value })} /></Field>
                <Field label={bi("Family name", "اسم العائلة")}><Input value={form.familyName} onChange={(event) => setForm({ ...form, familyName: event.target.value })} /></Field>
              </div>
              {form.customerType === "corporate" && (
                <div className="grid gap-3 rounded-md bg-black/[0.03] p-3 dark:bg-white/[0.05] sm:grid-cols-2">
                  <Field label={bi("Company name", "اسم الشركة")}><Input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></Field>
                  <Field label={bi("CR number", "رقم السجل التجاري")}><Input value={form.crNumber} onChange={(event) => setForm({ ...form, crNumber: event.target.value })} /></Field>
                </div>
              )}
            </div>
          )}

          {formTab === "Arabic" && aliasFieldsEnabled && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-ink-muted)]">{bi("For staff who read/write Arabic only — enter the customer's name here instead of the English fields.", "لموظفي الاستقبال الذين يقرؤون ويكتبون العربية فقط - أدخل اسم العميل هنا بدلاً من الحقول الإنجليزية.")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("First name", "الاسم الأول")}><Input dir="rtl" value={form.firstNameAr} onChange={(event) => setForm({ ...form, firstNameAr: event.target.value })} /></Field>
                <Field label={bi("Father's name", "اسم الأب")}><Input dir="rtl" value={form.fatherNameAr} onChange={(event) => setForm({ ...form, fatherNameAr: event.target.value })} /></Field>
                <Field label={bi("Grandfather's name (optional)", "اسم الجد (اختياري)")}><Input dir="rtl" value={form.grandfatherNameAr} onChange={(event) => setForm({ ...form, grandfatherNameAr: event.target.value })} /></Field>
                <Field label={bi("Family name", "اسم العائلة")}><Input dir="rtl" value={form.familyNameAr} onChange={(event) => setForm({ ...form, familyNameAr: event.target.value })} /></Field>
              </div>
            </div>
          )}

          {formTab === "Contact" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("Mobile phone", "الجوال")}><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+966..." /></Field>
                <Field label={bi("Home phone (optional)", "الهاتف المنزلي (اختياري)")}><Input value={form.homePhone} onChange={(event) => setForm({ ...form, homePhone: event.target.value })} placeholder="+9661..." /></Field>
                <Field label={bi("WhatsApp", "واتساب")}><Input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="Defaults to mobile" /></Field>
                <Field label={bi("Email", "البريد الإلكتروني")}><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
              </div>
              <Field label={bi("Address", "العنوان")}><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
              <Field label={bi("Branch", "الفرع")}>
                <Select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {formTab === "Additional" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={bi("National ID / Iqama No.", "رقم الهوية / الإقامة")}><Input value={form.nationalId} onChange={(event) => setForm({ ...form, nationalId: event.target.value })} /></Field>
                <Field label={bi("Nationality", "الجنسية")}><Input value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} placeholder="Saudi" /></Field>
                <Field label={bi("Preferred language", "اللغة المفضلة")}>
                  <Select value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as PreferredLanguage | "" })}>
                    <option value="">{bi("Not set", "غير محدد")}</option>
                    <option value="ar">{bi("Arabic", "العربية")}</option>
                    <option value="en">{bi("English", "الإنجليزية")}</option>
                  </Select>
                </Field>
                <Field label={bi("Date of birth", "تاريخ الميلاد")}><Input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></Field>
                <Field label={bi("Gender", "الجنس")}>
                  <Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender | "" })}>
                    <option value="">{bi("Not specified", "غير محدد")}</option>
                    <option value="male">{bi("Male", "ذكر")}</option>
                    <option value="female">{bi("Female", "أنثى")}</option>
                  </Select>
                </Field>
              </div>
              <Field label={bi("Notes", "ملاحظات")}><Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          )}

          <Button className="w-full justify-center" onClick={submit}>{bi("Save Customer", "حفظ العميل")}</Button>
        </div>
      </Modal>
    </div>
  );
}
