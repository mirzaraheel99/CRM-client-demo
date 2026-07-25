import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Input, Field, Modal } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { bi } from "../lib/domainAr";
import type { Branch } from "../lib/types";

const emptyForm = () => ({ name: "", city: "" });

export default function Branches() {
  const { branches, customers, technicians, role, addBranch, updateBranch, deleteBranch } = useStore();
  const canManage = canPerform(role, "manage_branch");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({ name: branch.name, city: branch.city });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim() || !form.city.trim()) return;
    const payload = { name: form.name.trim(), city: form.city.trim() };
    if (editing) {
      const outcome = await updateBranch(editing.id, payload);
      toast(outcome.message, outcome.ok ? "success" : "error");
      if (outcome.ok) setOpen(false);
    } else {
      await addBranch(payload);
      setOpen(false);
      toast(`${form.name} added to branches.`);
    }
  }

  async function remove(branch: Branch) {
    if (!confirm(`Delete branch "${branch.name}"?`)) return;
    const outcome = await deleteBranch(branch.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Branches", "الفروع")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{bi("Company locations used to scope customers, technicians, and job cards", "مواقع الشركة المستخدمة لتصنيف العملاء والفنيين وبطاقات العمل")}</p>
        </div>
        {canManage && <Button onClick={openAdd}>+ {bi("Add Branch", "إضافة فرع")}</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.map((branch) => {
          const customerCount = customers.filter((c) => c.branchId === branch.id).length;
          const technicianCount = technicians.filter((t) => t.branchId === branch.id).length;
          return (
            <Card key={branch.id} interactive className="space-y-2">
              <CardHeader title={branch.name} subtitle={branch.city} />
              <p className="text-xs text-[var(--color-ink-muted)]">
                {customerCount} {bi("customers", "عملاء")} &middot; {technicianCount} {bi("technicians", "فنيين")}
              </p>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(branch)}>{bi("Edit", "تعديل")}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(branch)}>{bi("Delete", "حذف")}</Button>
                </div>
              )}
            </Card>
          );
        })}
        {branches.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No branches yet.", "لا توجد فروع بعد.")}</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Branch", "تعديل الفرع") : bi("Add Branch", "إضافة فرع")}>
        <div className="space-y-3">
          <Field label={bi("Branch name", "اسم الفرع")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={bi("City", "المدينة")}><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Button className="w-full justify-center" onClick={submit}>{bi("Save Branch", "حفظ الفرع")}</Button>
        </div>
      </Modal>
    </div>
  );
}
