import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, Field, Modal, Badge, SortableTh, ActionsMenu, EmptyState } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { useSort } from "../lib/useSort";
import { bi } from "../lib/domainAr";
import type { PackagingType, UnitCategory, UnitOfMeasure, UnitPackagingCode } from "../lib/types";

const ROUNDING_TYPES = ["No Rounding", "Round Up", "Round Down", "Nearest"];
const UNIT_CATEGORIES: UnitCategory[] = ["Weight", "Volume", "Length", "Count", "Area", "Other"];
const UNIT_CATEGORY_AR: Record<UnitCategory, string> = {
  Weight: "الوزن",
  Volume: "الحجم",
  Length: "الطول",
  Count: "العدد",
  Area: "المساحة",
  Other: "أخرى",
};

const PACKAGING_TYPES: PackagingType[] = ["Box", "Container", "Crate", "Carton", "Pallet", "Bag", "Other"];
const PACKAGING_TYPE_AR: Record<PackagingType, string> = {
  Box: "صندوق",
  Container: "حاوية",
  Crate: "قفص",
  Carton: "كرتون",
  Pallet: "منصة نقالة",
  Bag: "كيس",
  Other: "أخرى",
};

const emptyPackagingForm = () => ({
  code: "",
  type: "Box" as PackagingType,
  weight: "",
  count: "",
  width: "",
  height: "",
});

type SortKey = "name" | "code" | "category" | "unitType" | "decimalPlaces" | "itemsUsed";

const emptyForm = () => ({
  name: "",
  nameAr: "",
  code: "",
  category: "" as UnitCategory | "",
  unitType: "Base" as UnitOfMeasure["unitType"],
  roundingType: "No Rounding",
  decimalPlaces: "0",
  baseUnitName: "",
  conversionFactor: "",
});

export default function Units() {
  const { units, unitPackagingCodes, inventoryItems, role, addUnit, updateUnit, deleteUnit, addUnitPackagingCode, updateUnitPackagingCode, deleteUnitPackagingCode, aliasFieldsEnabled } = useStore();
  const canManage = canPerform(role, "manage_unit");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [categoryFilter, setCategoryFilter] = useState<UnitCategory | "all">("all");
  const [packagingUnit, setPackagingUnit] = useState<UnitOfMeasure | null>(null);
  const [editingPackagingCode, setEditingPackagingCode] = useState<UnitPackagingCode | null>(null);
  const [packagingForm, setPackagingForm] = useState(emptyPackagingForm());
  const baseUnits = units.filter((u) => u.unitType === "Base");

  const itemCountByUnit = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of inventoryItems) if (item.unit) map.set(item.unit, (map.get(item.unit) ?? 0) + 1);
    return map;
  }, [inventoryItems]);

  const filteredUnits = useMemo(
    () => categoryFilter === "all" ? units : units.filter((u) => u.category === categoryFilter),
    [units, categoryFilter]
  );

  const sortValue = (u: UnitOfMeasure, key: SortKey) => {
    if (key === "name") return u.name;
    if (key === "code") return u.code ?? "";
    if (key === "category") return u.category ?? "";
    if (key === "unitType") return u.unitType;
    if (key === "decimalPlaces") return u.decimalPlaces;
    return itemCountByUnit.get(u.name) ?? 0;
  };
  const { sorted, sortKey, dir, toggle } = useSort<UnitOfMeasure, SortKey>(filteredUnits, sortValue, "name");

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
      category: unit.category ?? "",
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
      category: form.category || undefined,
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

  function openPackaging(unit: UnitOfMeasure) {
    setPackagingUnit(unit);
    setEditingPackagingCode(null);
    setPackagingForm(emptyPackagingForm());
  }

  function editPackagingCode(packagingCode: UnitPackagingCode) {
    setEditingPackagingCode(packagingCode);
    setPackagingForm({
      code: packagingCode.code,
      type: packagingCode.type,
      weight: packagingCode.weight != null ? String(packagingCode.weight) : "",
      count: packagingCode.count != null ? String(packagingCode.count) : "",
      width: packagingCode.width != null ? String(packagingCode.width) : "",
      height: packagingCode.height != null ? String(packagingCode.height) : "",
    });
  }

  async function submitPackagingCode() {
    if (!packagingUnit || !packagingForm.code.trim()) return;
    const payload = {
      code: packagingForm.code.trim(),
      type: packagingForm.type,
      weight: packagingForm.weight ? Number(packagingForm.weight) : undefined,
      count: packagingForm.count ? Number(packagingForm.count) : undefined,
      width: packagingForm.width ? Number(packagingForm.width) : undefined,
      height: packagingForm.height ? Number(packagingForm.height) : undefined,
    };
    const outcome = editingPackagingCode
      ? await updateUnitPackagingCode(editingPackagingCode.id, payload)
      : await addUnitPackagingCode({ unitId: packagingUnit.id, ...payload });
    toast(outcome.message, outcome.ok ? "success" : "error");
    if (outcome.ok) {
      setEditingPackagingCode(null);
      setPackagingForm(emptyPackagingForm());
    }
  }

  async function removePackagingCode(packagingCode: UnitPackagingCode) {
    if (!confirm(`Delete packaging code "${packagingCode.code}"?`)) return;
    const outcome = await deleteUnitPackagingCode(packagingCode.id);
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

      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as UnitCategory | "all")} className="max-w-[220px]">
            <option value="all">{bi("All categories", "كل الفئات")}</option>
            {UNIT_CATEGORIES.map((c) => <option key={c} value={c}>{bi(c, UNIT_CATEGORY_AR[c])}</option>)}
          </Select>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]">
                <SortableTh label={bi("Name", "الاسم")} active={sortKey === "name"} direction={dir} onClick={() => toggle("name")} className="py-2" />
                <SortableTh label={bi("Code", "الرمز")} active={sortKey === "code"} direction={dir} onClick={() => toggle("code")} className="py-2" />
                <SortableTh label={bi("Category", "الفئة")} active={sortKey === "category"} direction={dir} onClick={() => toggle("category")} className="py-2" />
                <SortableTh label={bi("Type", "النوع")} active={sortKey === "unitType"} direction={dir} onClick={() => toggle("unitType")} className="py-2" />
                <th className="py-2 font-medium">{bi("Base / Conversion", "الوحدة الأساسية / التحويل")}</th>
                <SortableTh label={bi("Decimals", "الكسور")} active={sortKey === "decimalPlaces"} direction={dir} onClick={() => toggle("decimalPlaces")} className="py-2" />
                <th className="py-2 font-medium">{bi("Rounding", "التقريب")}</th>
                <SortableTh label={bi("Items Used", "الأصناف المستخدمة")} active={sortKey === "itemsUsed"} direction={dir} onClick={() => toggle("itemsUsed")} className="py-2" />
                <th className="py-2 font-medium">{bi("Packaging", "التغليف")}</th>
                <th className="py-2 font-medium text-right">{bi("Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((unit) => {
                const count = itemCountByUnit.get(unit.name) ?? 0;
                const packagingCount = unitPackagingCodes.filter((p) => p.unitId === unit.id).length;
                return (
                  <tr key={unit.id} className="border-b last:border-0 [border-color:var(--color-border)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="py-2.5 font-medium">
                      {unit.name}
                      {unit.nameAr && aliasFieldsEnabled && <span dir="rtl" className="block text-[11px] font-normal text-[var(--color-ink-muted)]">{unit.nameAr}</span>}
                    </td>
                    <td className="py-2.5 text-[var(--color-ink-secondary)]">{unit.code ?? "—"}</td>
                    <td className="py-2.5">{unit.category ? <Badge tone="neutral">{bi(unit.category, UNIT_CATEGORY_AR[unit.category])}</Badge> : <span className="text-[var(--color-ink-muted)]">—</span>}</td>
                    <td className="py-2.5">
                      <Badge tone={unit.unitType === "Base" ? "brand" : "neutral"}>{bi(unit.unitType === "Base" ? "Base" : "Alternate", unit.unitType === "Base" ? "أساسية" : "بديلة")}</Badge>
                    </td>
                    <td className="py-2.5 text-[var(--color-ink-secondary)]">
                      {unit.unitType === "Alternate" && unit.baseUnitName ? `1 ${unit.name} = ${unit.conversionFactor ?? "?"} ${unit.baseUnitName}` : "—"}
                    </td>
                    <td className="py-2.5 tabular-nums">{unit.decimalPlaces}</td>
                    <td className="py-2.5 text-[var(--color-ink-secondary)]">{unit.roundingType ?? "No Rounding"}</td>
                    <td className="py-2.5 tabular-nums">{count}</td>
                    <td className="py-2.5">
                      <button type="button" onClick={() => openPackaging(unit)} className="text-[var(--color-brand-1)] hover:underline">
                        {packagingCount} {bi(packagingCount === 1 ? "code" : "codes", "رمز")}
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <ActionsMenu
                        items={[
                          { label: bi("Packaging Codes", "رموز التغليف"), onClick: () => openPackaging(unit) },
                          ...(canManage ? [
                            { label: bi("Edit", "تعديل"), onClick: () => openEdit(unit) },
                            { label: bi("Delete", "حذف"), onClick: () => remove(unit), danger: true },
                          ] : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && <EmptyState title={bi("No units found", "لم يتم العثور على وحدات")} subtitle={categoryFilter === "all" ? "Add your first unit to get started." : "No units in this category yet."} />}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Unit", "تعديل الوحدة") : bi("Add Unit", "إضافة وحدة")}>
        <div className="space-y-3">
          <Field label={bi("Unit name", "اسم الوحدة")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {aliasFieldsEnabled && <Input dir="rtl" className="mt-2" placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={bi("Code (optional)", "الرمز (اختياري)")}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label={bi("Category (optional)", "الفئة (اختياري)")}>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as UnitCategory | "" })}>
                <option value="">{bi("Not set", "غير محدد")}</option>
                {UNIT_CATEGORIES.map((c) => <option key={c} value={c}>{bi(c, UNIT_CATEGORY_AR[c])}</option>)}
              </Select>
            </Field>
          </div>
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

      <Modal
        open={!!packagingUnit}
        onClose={() => setPackagingUnit(null)}
        title={packagingUnit ? bi(`Packaging Codes — ${packagingUnit.name}`, `رموز التغليف — ${packagingUnit.name}`) : ""}
        width="lg"
      >
        {packagingUnit && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border [border-color:var(--color-border)]">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]">
                    <th className="px-3 py-2 font-medium">{bi("Code", "الرمز")}</th>
                    <th className="px-3 py-2 font-medium">{bi("Type", "النوع")}</th>
                    <th className="px-3 py-2 font-medium">{bi("Weight", "الوزن")}</th>
                    <th className="px-3 py-2 font-medium">{bi("Count", "العدد")}</th>
                    <th className="px-3 py-2 font-medium">{bi("Width", "العرض")}</th>
                    <th className="px-3 py-2 font-medium">{bi("Height", "الارتفاع")}</th>
                    {canManage && <th className="px-3 py-2 font-medium text-right">{bi("Actions", "الإجراءات")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {unitPackagingCodes.filter((p) => p.unitId === packagingUnit.id).map((p) => (
                    <tr key={p.id} className="border-b last:border-0 [border-color:var(--color-border)]">
                      <td className="px-3 py-2 font-medium">{p.code}</td>
                      <td className="px-3 py-2"><Badge tone="neutral">{bi(p.type, PACKAGING_TYPE_AR[p.type])}</Badge></td>
                      <td className="px-3 py-2 tabular-nums">{p.weight ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{p.count ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{p.width ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{p.height ?? "—"}</td>
                      {canManage && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => editPackagingCode(p)}>{bi("Edit", "تعديل")}</Button>
                            <Button size="sm" variant="danger" onClick={() => removePackagingCode(p)}>{bi("Delete", "حذف")}</Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {unitPackagingCodes.filter((p) => p.unitId === packagingUnit.id).length === 0 && (
                    <tr><td colSpan={canManage ? 7 : 6} className="px-3 py-6 text-center text-[var(--color-ink-muted)]">{bi("No packaging codes yet.", "لا توجد رموز تغليف بعد.")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {canManage && (
              <div className="space-y-3 border-t pt-4 [border-color:var(--color-border)]">
                <p className="text-xs font-semibold text-[var(--color-ink-secondary)]">
                  {editingPackagingCode ? bi("Edit packaging code", "تعديل رمز التغليف") : bi("Add packaging code", "إضافة رمز تغليف")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={bi("Code name", "اسم الرمز")}><Input value={packagingForm.code} onChange={(e) => setPackagingForm({ ...packagingForm, code: e.target.value })} placeholder="e.g. Small Box" /></Field>
                  <Field label={bi("Type", "النوع")}>
                    <Select value={packagingForm.type} onChange={(e) => setPackagingForm({ ...packagingForm, type: e.target.value as PackagingType })}>
                      {PACKAGING_TYPES.map((t) => <option key={t} value={t}>{bi(t, PACKAGING_TYPE_AR[t])}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={bi("Weight (optional)", "الوزن (اختياري)")}><Input type="number" min={0} value={packagingForm.weight} onChange={(e) => setPackagingForm({ ...packagingForm, weight: e.target.value })} /></Field>
                  <Field label={bi("Count (units per package, optional)", "العدد (وحدات لكل تغليف، اختياري)")}><Input type="number" min={0} value={packagingForm.count} onChange={(e) => setPackagingForm({ ...packagingForm, count: e.target.value })} /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={bi("Width (optional)", "العرض (اختياري)")}><Input type="number" min={0} value={packagingForm.width} onChange={(e) => setPackagingForm({ ...packagingForm, width: e.target.value })} /></Field>
                  <Field label={bi("Height (optional)", "الارتفاع (اختياري)")}><Input type="number" min={0} value={packagingForm.height} onChange={(e) => setPackagingForm({ ...packagingForm, height: e.target.value })} /></Field>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 justify-center" onClick={submitPackagingCode}>
                    {editingPackagingCode ? bi("Save Changes", "حفظ التغييرات") : bi("Add Packaging Code", "إضافة رمز التغليف")}
                  </Button>
                  {editingPackagingCode && (
                    <Button variant="secondary" onClick={() => { setEditingPackagingCode(null); setPackagingForm(emptyPackagingForm()); }}>
                      {bi("Cancel", "إلغاء")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
