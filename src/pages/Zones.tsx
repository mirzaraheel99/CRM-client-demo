import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Input, Select, Field, Modal } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform } from "../lib/permissions";
import { bi } from "../lib/domainAr";
import type { Zone } from "../lib/types";

export default function Zones() {
  const { zones, branches, technicians, customers, role, addZone, updateZone, deleteZone } = useStore();
  const canManage = canPerform(role, "manage_zone");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");

  function openAdd() {
    setEditing(null);
    setName("");
    setBranchId(branches[0]?.id ?? "");
    setOpen(true);
  }

  function openEdit(zone: Zone) {
    setEditing(zone);
    setName(zone.name);
    setBranchId(zone.branchId);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) return;
    if (editing) {
      const outcome = await updateZone(editing.id, name.trim());
      toast(outcome.message, outcome.ok ? "success" : "error");
      if (outcome.ok) setOpen(false);
    } else {
      if (!branchId) return;
      await addZone({ name: name.trim(), branchId });
      setOpen(false);
      toast(`${name.trim()} added to zones.`);
    }
  }

  async function remove(zone: Zone) {
    if (!confirm(`Delete zone "${zone.name}"?`)) return;
    const outcome = await deleteZone(zone.id);
    toast(outcome.message, outcome.ok ? "success" : "error");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-rise-in">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{bi("Zones", "المناطق")}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{bi("Coverage sub-areas within each branch, used to assign technicians and customers", "المناطق الفرعية ضمن كل فرع، تُستخدم لإسناد الفنيين والعملاء")}</p>
        </div>
        {canManage && <Button onClick={openAdd}>+ {bi("Add Zone", "إضافة منطقة")}</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((zone) => {
          const branch = branches.find((b) => b.id === zone.branchId);
          const technicianCount = technicians.filter((t) => t.branchId === zone.branchId && t.zone === zone.name).length;
          const customerCount = customers.filter((c) => c.branchId === zone.branchId && c.zone === zone.name).length;
          return (
            <Card key={zone.id} interactive className="space-y-2">
              <CardHeader title={zone.name} subtitle={branch?.name ?? bi("Unknown branch", "فرع غير معروف")} />
              <p className="text-xs text-[var(--color-ink-muted)]">
                {technicianCount} {bi("technicians", "فنيين")} &middot; {customerCount} {bi("customers", "عملاء")}
              </p>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(zone)}>{bi("Edit", "تعديل")}</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(zone)}>{bi("Delete", "حذف")}</Button>
                </div>
              )}
            </Card>
          );
        })}
        {zones.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">{bi("No zones yet.", "لا توجد مناطق بعد.")}</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? bi("Edit Zone", "تعديل المنطقة") : bi("Add Zone", "إضافة منطقة")}>
        <div className="space-y-3">
          <Field label={bi("Zone name", "اسم المنطقة")}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riyadh North" /></Field>
          <Field label={bi("Branch", "الفرع")}>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={!!editing}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            {editing && <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">{bi("A zone's branch can't be changed after creation.", "لا يمكن تغيير فرع المنطقة بعد إنشائها.")}</p>}
          </Field>
          <Button className="w-full justify-center" onClick={submit}>{bi("Save Zone", "حفظ المنطقة")}</Button>
        </div>
      </Modal>
    </div>
  );
}
