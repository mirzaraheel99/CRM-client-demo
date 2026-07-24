import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Input, Field, Modal, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { bi } from "../lib/domainAr";
import type { Brand } from "../lib/types";

const emptyForm = () => ({ name: "", nameAr: "", warrantyMonths: 12, rules: "" });

export default function Brands() {
  const { brands, appliances, role, addBrand, updateBrand, deleteBrand, aliasFieldsEnabled } = useStore();
  const canManage = canPerform(role, "manage_brand");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({ name: brand.name, nameAr: brand.nameAr ?? "", warrantyMonths: brand.warrantyMonths, rules: brand.rules });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) return;
    const payload = { ...form, nameAr: form.nameAr.trim() || undefined };
    if (editing) {
      const outcome = await updateBrand(editing.id, payload);
      toast(outcome.message, outcome.ok ? "success" : "error");
      if (outcome.ok) setOpen(false);
    } else {
      await addBrand(payload);
      setOpen(false);
      toast(`${form.name} added to brands.`);
    }
  }

  async function remove(brand: Brand) {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    const outcome = await deleteBrand(brand.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Brand Master", "سجل العلامات التجارية")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Warranty durations and OEM rules used by the workflow engine</p>
        </div>
        {canManage && <Button onClick={openAdd}>+ {bi("Add Brand", "إضافة علامة تجارية")}</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {brands.map((b) => (
          <Card key={b.id} interactive className="space-y-2">
            <CardHeader title={b.name} subtitle={`${b.warrantyMonths} month warranty`} />
            {b.nameAr && <p dir="rtl" className="-mt-3 text-xs text-[var(--color-ink-muted)]">{b.nameAr}</p>}
            <p className="text-sm text-[var(--color-ink-secondary)]">{b.rules}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">{appliances.filter((a) => a.brandId === b.id).length} appliances registered</p>
            {canManage && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>{bi("Edit", "تعديل")}</Button>
                <Button size="sm" variant="danger" onClick={() => remove(b)}>{bi("Delete", "حذف")}</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Brand", "تعديل العلامة التجارية") : bi("Add Brand", "إضافة علامة تجارية")}>
        <div className="space-y-3">
          <Field label={bi("Brand name", "اسم العلامة التجارية")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}
          </Field>
          <Field label={bi("Warranty (months)", "الضمان (بالأشهر)")}>
            <Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: Number(e.target.value) })} />
          </Field>
          <Field label={bi("Warranty rules", "شروط الضمان")}><Textarea rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} /></Field>

          <Button className="w-full justify-center" onClick={submit}>{bi("Save Brand", "حفظ العلامة التجارية")}</Button>
        </div>
      </Modal>
    </div>
  );
}
