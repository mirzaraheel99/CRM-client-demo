import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Input, Field, Modal, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import { bi } from "../lib/domainAr";

export default function Brands() {
  const { brands, appliances, addBrand } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", warrantyMonths: 12, rules: "" });

  function submit() {
    if (!form.name.trim()) return;
    addBrand(form);
    setForm({ name: "", warrantyMonths: 12, rules: "" });
    setOpen(false);
    toast(`${form.name} added to brands.`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Brand Master", "سجل العلامات التجارية")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Warranty durations and OEM rules used by the workflow engine</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ {bi("Add Brand", "إضافة علامة تجارية")}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {brands.map((b) => (
          <Card key={b.id} interactive>
            <CardHeader title={b.name} subtitle={`${b.warrantyMonths} month warranty`} />
            <p className="text-sm text-[var(--color-ink-secondary)]">{b.rules}</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-3">{appliances.filter((a) => a.brandId === b.id).length} appliances registered</p>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={bi("Add Brand", "إضافة علامة تجارية")}>
        <div className="space-y-3">
          <Field label={bi("Brand name", "اسم العلامة التجارية")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
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
