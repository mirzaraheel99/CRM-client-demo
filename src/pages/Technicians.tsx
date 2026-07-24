import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, Field, Modal, Badge, Avatar, Tabs, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import type { ApplianceCategory, Technician } from "../lib/types";
import { filterByBranch } from "../lib/selectors";
import { fallbackDocumentNo } from "../lib/utils";
import { categoryNameAr, TECHNICIAN_STATUS_AR, bi } from "../lib/domainAr";

const TABS = ["Technician List", "Allocation Calendar"];
const TAB_LABELS: Record<string, string> = {
  "Technician List": bi("Technician List", "قائمة الفنيين"),
  "Allocation Calendar": bi("Allocation Calendar", "تقويم التوزيع"),
};

export default function Technicians() {
  const { technicians, jobCards, customers, branches, categories, role, selectedBranchId, addTechnician, updateTechnician, deleteTechnician, aliasFieldsEnabled } = useStore();
  const canManage = canPerform(role, "assign_technician");
  const [tab, setTab] = useState(TABS[0]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const defaultBranchId = selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId;
  const emptyForm = () => ({ name: "", nameAr: "", phone: "", zone: "Zone A", skills: [] as ApplianceCategory[], branchId: defaultBranchId, status: "Available" as const, avatarColor: "#2a78d6", notes: "" });
  const [form, setForm] = useState(emptyForm());
  const scopedTechnicians = filterByBranch(technicians, selectedBranchId);
  const scopedJobs = filterByBranch(jobCards, selectedBranchId);

  function toggleSkill(s: ApplianceCategory) {
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm(), branchId: defaultBranchId });
    setOpen(true);
  }

  function openEdit(technician: Technician) {
    setEditing(technician);
    setForm({
      name: technician.name, nameAr: technician.nameAr ?? "", phone: technician.phone, zone: technician.zone,
      skills: technician.skills, branchId: technician.branchId, status: technician.status as "Available",
      avatarColor: technician.avatarColor, notes: technician.notes ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.branchId || form.skills.length === 0) return;
    const payload = { ...form, nameAr: form.nameAr.trim() || undefined, notes: form.notes.trim() || undefined };
    if (editing) {
      const outcome = await updateTechnician(editing.id, payload);
      toast(outcome.message, outcome.ok ? "success" : "error");
      if (outcome.ok) setOpen(false);
    } else {
      await addTechnician(payload);
      setOpen(false);
      toast(`${form.name} added to technicians.`);
    }
  }

  async function remove(technician: Technician) {
    if (!confirm(`Delete technician "${technician.name}"?`)) return;
    const outcome = await deleteTechnician(technician.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
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
        {canManage && <Button onClick={openAdd}>+ {bi("Add Technician", "إضافة فني")}</Button>}
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
                      {t.skills.map((s) => <Badge key={s} tone="brand">{bi(s, categoryNameAr(categories, s))}</Badge>)}
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{activeJobs} active jobs · {t.phone}</p>
                    {t.notes && <p className="text-xs text-[var(--color-ink-secondary)]">{t.notes}</p>}
                    {canManage && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>{bi("Edit", "تعديل")}</Button>
                        <Button size="sm" variant="danger" onClick={() => remove(t)}>{bi("Delete", "حذف")}</Button>
                      </div>
                    )}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Technician", "تعديل الفني") : bi("Add Technician", "إضافة فني")}>
        <div className="space-y-3">
          <Field label={bi("Name", "الاسم")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}
          </Field>
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
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleSkill(cat.name)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors [border-color:var(--color-border)] ${form.skills.includes(cat.name) ? "bg-[var(--color-brand-1)] text-white border-transparent" : "text-[var(--color-ink-secondary)]"}`}
                >
                  {bi(cat.name, categoryNameAr(categories, cat.name))}
                </button>
              ))}
            </div>
          </Field>
          <Field label={bi("Notes (optional)", "ملاحظات (اختياري)")}>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <Button className="w-full justify-center" onClick={submit}>{bi("Save Technician", "حفظ الفني")}</Button>
        </div>
      </Modal>
    </div>
  );
}
