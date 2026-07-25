import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, Field, Modal, Badge, SortableTh, ActionsMenu, EmptyState } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { useSort } from "../lib/useSort";
import { bi } from "../lib/domainAr";
import type { UnitCategory, UnitOfMeasure } from "../lib/types";

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
  const { units, inventoryItems, role, addUnit, updateUnit, deleteUnit, aliasFieldsEnabled } = useStore();
  const canManage = canPerform(role, "manage_unit");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [categoryFilter, setCategoryFilter] = useState<UnitCategory | "all">("all");
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
                <th className="py-2 font-medium text-right">{bi("Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((unit) => {
                const count = itemCountByUnit.get(unit.name) ?? 0;
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
                    <td className="py-2.5 text-right">
                      {canManage && (
                        <ActionsMenu
                          items={[
                            { label: bi("Edit", "تعديل"), onClick: () => openEdit(unit) },
                            { label: bi("Delete", "حذف"), onClick: () => remove(unit), danger: true },
                          ]}
                        />
                      )}
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
    </div>
  );
}
