import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Input, Select, Field, Modal } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { bi } from "../lib/domainAr";
import type { UnitOfMeasure } from "../lib/types";

const ROUNDING_TYPES = ["No Rounding", "Round Up", "Round Down", "Nearest"];

const emptyForm = () => ({
  name: "",
  nameAr: "",
  code: "",
  unitType: "Base" as UnitOfMeasure["unitType"],
  roundingType: "No Rounding",
  decimalPlaces: "0",
  baseUnitName: "",
  conversionFactor: "",
});

export default function Units() {
  const { units, inventoryItems, role, addUnit, updateUnit, deleteUnit, aliasFieldsEnabled } = useStore();
  const canManage = canPerform(role, "manage_unit");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null);
  const [form, setForm] = useState(emptyForm());
  const baseUnits = units.filter((u) => u.unitType === "Base");

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(unit: UnitOfMeasure) {
    setEditing(unit);
    setForm({
      name: unit.name,
      nameAr: unit.nameAr ?? "",
      code: unit.code ?? "",
      unitType: unit.unitType,
      roundingType: unit.roundingType ?? "No Rounding",
      decimalPlaces: String(unit.decimalPlaces),
      baseUnitName: unit.baseUnitName ?? "",
      conversionFactor: unit.conversionFactor != null ? String(unit.conversionFactor) : "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) return;
    if (form.unitType === "Alternate" && !form.baseUnitName) {
      toast("Alternate units need a base unit to convert to.", "error");
      return;
    }
    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || undefined,
      code: form.code.trim() || undefined,
      unitType: form.unitType,
      roundingType: form.roundingType,
      decimalPlaces: Number(form.decimalPlaces) || 0,
      baseUnitName: form.unitType === "Alternate" ? form.baseUnitName : undefined,
      conversionFactor: form.unitType === "Alternate" && form.conversionFactor ? Number(form.conversionFactor) : undefined,
    };
    const outcome = editing ? await updateUnit(editing.id, payload) : await addUnit(payload);
    toast(outcome.message, outcome.ok ? "success" : "error");
    if (outcome.ok) setOpen(false);
  }

  async function remove(unit: UnitOfMeasure) {
    if (!confirm(`Delete unit "${unit.name}"?`)) return;
    const outcome = await deleteUnit(unit.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Unit of Measure Master", "سجل وحدات القياس")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Units used to stock and issue inventory items, with base ↔ alternate conversions</p>
        </div>
        {canManage && <Button onClick={openAdd}>+ {bi("Add Unit", "إضافة وحدة")}</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {units.map((unit) => {
          const count = inventoryItems.filter((i) => i.unit === unit.name).length;
          return (
            <Card key={unit.id} interactive className="space-y-2">
              <CardHeader title={unit.name} subtitle={unit.code ?? undefined} />
              {unit.nameAr && <p dir="rtl" className="-mt-3 text-xs text-[var(--color-ink-muted)]">{unit.nameAr}</p>}
              <p className="text-xs text-[var(--color-ink-muted)]">
                {bi(unit.unitType === "Base" ? "Base unit" : "Alternate unit", unit.unitType === "Base" ? "وحدة أساسية" : "وحدة بديلة")}
                {unit.unitType === "Alternate" && unit.baseUnitName && ` · 1 ${unit.name} = ${unit.conversionFactor ?? "?"} ${unit.baseUnitName}`}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">{bi("Decimals", "الكسور العشرية")}: {unit.decimalPlaces} · {unit.roundingType ?? "No Rounding"}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{count} item{count === 1 ? "" : "s"} using this unit</p>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(unit)}>{bi("Edit", "تعديل")}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(unit)}>{bi("Delete", "حذف")}</Button>
                </div>
              )}
            </Card>
          );
        })}
        {units.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No units yet.", "لا توجد وحدات بعد.")}</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Unit", "تعديل الوحدة") : bi("Add Unit", "إضافة وحدة")}>
        <div className="space-y-3">
          <Field label={bi("Unit name", "اسم الوحدة")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}
          </Field>
          <Field label={bi("Code (optional)", "الرمز (اختياري)")}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label={bi("Unit type", "نوع الوحدة")}>
            <Select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value as UnitOfMeasure["unitType"] })}>
              <option value="Base">{bi("Base", "أساسية")}</option>
              <option value="Alternate">{bi("Alternate (converts to a base unit)", "بديلة (تحول إلى وحدة أساسية)")}</option>
            </Select>
          </Field>
          {form.unitType === "Alternate" && (
            <>
              <Field label={bi("Base unit", "الوحدة الأساسية")}>
                <Select value={form.baseUnitName} onChange={(e) => setForm({ ...form, baseUnitName: e.target.value })}>
                  <option value="">{bi("Choose base unit...", "اختر الوحدة الأساسية...")}</option>
                  {baseUnits.filter((u) => u.name !== form.name).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label={bi("Conversion factor (1 of this unit = N base units)", "معامل التحويل (1 من هذه الوحدة = N من الوحدة الأساسية)")}>
                <Input type="number" min={0} value={form.conversionFactor} onChange={(e) => setForm({ ...form, conversionFactor: e.target.value })} placeholder="e.g. 12" />
              </Field>
            </>
          )}
          <Field label={bi("Rounding type", "نوع التقريب")}>
            <Select value={form.roundingType} onChange={(e) => setForm({ ...form, roundingType: e.target.value })}>
              {ROUNDING_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label={bi("No. of decimals", "عدد الكسور العشرية")}>
            <Input type="number" min={0} max={6} value={form.decimalPlaces} onChange={(e) => setForm({ ...form, decimalPlaces: e.target.value })} />
          </Field>

          <Button className="w-full justify-center" onClick={submit}>{bi("Save Unit", "حفظ الوحدة")}</Button>
        </div>
      </Modal>
    </div>
  );
}
