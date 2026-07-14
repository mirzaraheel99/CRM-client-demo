import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, Field, Modal, Badge, Avatar, Tabs } from "../components/ui";
import { toast } from "../lib/toast";
import type { ApplianceCategory } from "../lib/types";
import { filterByBranch } from "../lib/selectors";
import { fallbackDocumentNo } from "../lib/utils";
import { APPLIANCE_CATEGORY_AR, TECHNICIAN_STATUS_AR, bi } from "../lib/domainAr";

const CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];
const TABS = ["Technician List", "Allocation Calendar"];
const TAB_LABELS: Record<string, string> = {
  "Technician List": bi("Technician List", "قائمة الفنيين"),
  "Allocation Calendar": bi("Allocation Calendar", "تقويم التوزيع"),
};

export default function Technicians() {
  const { technicians, jobCards, customers, branches, selectedBranchId, addTechnician, aliasFieldsEnabled } = useStore();
  const [tab, setTab] = useState(TABS[0]);
  const [open, setOpen] = useState(false);
  const defaultBranchId = selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId;
  const [form, setForm] = useState({ name: "", nameAr: "", phone: "", zone: "Zone A", skills: [] as ApplianceCategory[], branchId: defaultBranchId, status: "Available" as const, avatarColor: "#2a78d6" });
  const scopedTechnicians = filterByBranch(technicians, selectedBranchId);
  const scopedJobs = filterByBranch(jobCards, selectedBranchId);

  function toggleSkill(s: ApplianceCategory) {
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));
  }

  function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.branchId || form.skills.length === 0) return;
    addTechnician({ ...form, nameAr: form.nameAr.trim() || undefined });
    setForm({ name: "", nameAr: "", phone: "", zone: "Zone A", skills: [], branchId: defaultBranchId, status: "Available", avatarColor: "#2a78d6" });
    setOpen(false);
    toast(`${form.name} added to technicians.`);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 2 + i);
    return d;
  });

  const custMap = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Technicians", "الفنيون")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{scopedTechnicians.length} technicians in the selected branch scope</p>
        </div>
        <Button onClick={() => { setForm((current) => ({ ...current, branchId: defaultBranchId })); setOpen(true); }}>+ {bi("Add Technician", "إضافة فني")}</Button>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} labels={TAB_LABELS} /></div>
        <div className="p-5">
          {tab === "Technician List" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scopedTechnicians.map((t) => {
                const activeJobs = scopedJobs.filter((j) => j.technicianId === t.id && j.status !== "Delivered").length;
                return (
                  <Card key={t.id} interactive className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={t.name} color={t.avatarColor} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        {t.nameAr && <p dir="rtl" className="truncate text-xs text-[var(--color-ink-muted)]">{t.nameAr}</p>}
                        <p className="text-[11px] text-[var(--color-ink-muted)]">{fallbackDocumentNo("TECH", t.id)}</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">{t.zone}</p>
                      </div>
                      <Badge tone={t.status === "Available" ? "good" : t.status === "On Job" ? "warning" : "neutral"} >{bi(t.status, TECHNICIAN_STATUS_AR[t.status])}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.skills.map((s) => <Badge key={s} tone="brand">{bi(s, APPLIANCE_CATEGORY_AR[s])}</Badge>)}
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{activeJobs} active jobs · {t.phone}</p>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "Allocation Calendar" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[820px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-3 font-medium text-[var(--color-ink-muted)] sticky left-0 bg-[var(--color-surface-1)]">{bi("Technician", "الفني")}</th>
                    {days.map((d) => (
                      <th key={d.toISOString()} className="py-2 px-2 font-medium text-[var(--color-ink-muted)] text-center min-w-[100px]">
                        {d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scopedTechnicians.map((t) => (
                    <tr key={t.id} className="border-t [border-color:var(--color-border)]">
                      <td className="py-2 pr-3 font-medium sticky left-0 bg-[var(--color-surface-1)] whitespace-nowrap">{t.name}<p className="font-normal text-[10px] text-[var(--color-ink-muted)]">{fallbackDocumentNo("TECH", t.id)}</p></td>
                      {days.map((d) => {
                        const dayJobs = scopedJobs.filter(
                          (j) => j.technicianId === t.id && j.scheduledAt && new Date(j.scheduledAt).toDateString() === d.toDateString()
                        );
                        return (
                          <td key={d.toISOString()} className="py-2 px-2 align-top">
                            <div className="space-y-1">
                              {dayJobs.slice(0, 2).map((j) => (
                                <div key={j.id} className="rounded bg-[var(--color-brand-1)]/10 text-[var(--color-brand-2)] px-1.5 py-1 truncate" title={j.documentNo}>
                                  {j.documentNo.split("-").slice(-1)[0]} | {custMap.get(j.customerId)?.name.split(" ")[0]}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={bi("Add Technician", "إضافة فني")}>
        <div className="space-y-3">
          <Field label={bi("Name", "الاسم")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          {aliasFieldsEnabled && (
            <Field label={bi("Arabic alias (optional)", "الاسم البديل بالعربية (اختياري)")}>
              <Input dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="الاسم بالعربية" />
            </Field>
          )}
          <Field label={bi("Phone", "الهاتف")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={bi("Zone", "المنطقة")}>
            <Select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              <option>Zone A</option><option>Zone B</option><option>Zone C</option>
            </Select>
          </Field>
          <Field label={bi("Branch", "الفرع")}>
            <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
          </Field>
          <Field label={bi("Skills", "المهارات")}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleSkill(c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors [border-color:var(--color-border)] ${form.skills.includes(c) ? "bg-[var(--color-brand-1)] text-white border-transparent" : "text-[var(--color-ink-secondary)]"}`}
                >
                  {bi(c, APPLIANCE_CATEGORY_AR[c])}
                </button>
              ))}
            </div>
          </Field>
          <Button className="w-full justify-center" onClick={submit}>{bi("Save Technician", "حفظ الفني")}</Button>
        </div>
      </Modal>
    </div>
  );
}
