import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Input, Field, Modal, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { bi } from "../lib/domainAr";
import type { Category } from "../lib/types";

const emptyForm = () => ({ name: "", nameAr: "", code: "", description: "", defaultWarrantyMonths: "" });

export default function Categories() {
  const { categories, appliances, role, addCategory, updateCategory, deleteCategory, aliasFieldsEnabled } = useStore();
  const canManage = canPerform(role, "manage_category");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      nameAr: category.nameAr ?? "",
      code: category.code ?? "",
      description: category.description ?? "",
      defaultWarrantyMonths: category.defaultWarrantyMonths != null ? String(category.defaultWarrantyMonths) : "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || undefined,
      code: form.code.trim() || undefined,
      description: form.description.trim() || undefined,
      defaultWarrantyMonths: form.defaultWarrantyMonths ? Number(form.defaultWarrantyMonths) : undefined,
    };
    const outcome = editing ? await updateCategory(editing.id, payload) : await addCategory(payload);
    toast(outcome.message, outcome.ok ? "success" : "error");
    if (outcome.ok) setOpen(false);
  }

  async function remove(category: Category) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    const outcome = await deleteCategory(category.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Category Master", "سجل الفئات")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Product categories used across Appliances, Job Cards, and Technician skills</p>
        </div>
        {canManage && <Button onClick={openAdd}>+ {bi("Add Category", "إضافة فئة")}</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {categories.map((category) => {
          const count = appliances.filter((a) => a.category === category.name).length;
          return (
            <Card key={category.id} interactive className="space-y-2">
              <CardHeader title={category.name} subtitle={category.code ?? undefined} />
              {category.nameAr && <p dir="rtl" className="-mt-3 text-xs text-[var(--color-ink-muted)]">{category.nameAr}</p>}
              {category.description && <p className="text-sm text-[var(--color-ink-secondary)]">{category.description}</p>}
              {category.defaultWarrantyMonths != null && <p className="text-xs text-[var(--color-ink-muted)]">Default warranty: {category.defaultWarrantyMonths} months</p>}
              <p className="text-xs text-[var(--color-ink-muted)]">{count} product{count === 1 ? "" : "s"} registered</p>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(category)}>{bi("Edit", "تعديل")}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(category)}>{bi("Delete", "حذف")}</Button>
                </div>
              )}
            </Card>
          );
        })}
        {categories.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No categories yet.", "لا توجد فئات بعد.")}</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Category", "تعديل الفئة") : bi("Add Category", "إضافة فئة")}>
        <div className="space-y-3">
          <Field label={bi("Category name", "اسم الفئة")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}
          </Field>
          <Field label={bi("Code (optional)", "الرمز (اختياري)")}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label={bi("Default warranty (months, optional)", "الضمان الافتراضي (بالأشهر، اختياري)")}><Input type="number" value={form.defaultWarrantyMonths} onChange={(e) => setForm({ ...form, defaultWarrantyMonths: e.target.value })} /></Field>
          <Field label={bi("Description (optional)", "الوصف (اختياري)")}><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

          <Button className="w-full justify-center" onClick={submit}>{bi("Save Category", "حفظ الفئة")}</Button>
        </div>
      </Modal>
    </div>
  );
}
