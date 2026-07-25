import { useStore } from "../lib/store";
import { Card, CardHeader, Badge, Button } from "../components/ui";
import { toast } from "../lib/toast";
import { canPerform, getActionRoles, type DemoAction } from "../lib/permissions";
import { REQUIRED_FIELD_ENTITY_LABEL, REQUIRED_FIELD_DEFS, isFieldRequired, isFieldLocked, type RequiredFieldEntity } from "../lib/requiredFields";
import { bi } from "../lib/domainAr";
import type { Role } from "../lib/types";

const ROLES: Role[] = ["front_desk", "technician", "supervisor", "manager", "admin"];
const ROLE_LABELS: Record<Role, string> = {
  front_desk: "Front Desk",
  technician: "Technician",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

const ACTION_LABELS: Record<DemoAction, string> = {
  create_customer: bi("Create customer", "إنشاء عميل"),
  create_appliance: bi("Register product", "تسجيل منتج"),
  create_job: bi("Create job card", "إنشاء بطاقة عمل"),
  manage_brand: bi("Manage brands", "إدارة العلامات التجارية"),
  manage_category: bi("Manage categories", "إدارة الفئات"),
  manage_unit: bi("Manage units of measure", "إدارة وحدات القياس"),
  manage_inventory: bi("Manage inventory", "إدارة المخزون"),
  assign_technician: bi("Assign technician", "إسناد فني"),
  edit_workflow: bi("Edit workflow", "تعديل سير العمل"),
  set_diagnosis: bi("Set diagnosis", "تسجيل التشخيص"),
  set_estimate: bi("Build estimate", "إنشاء التقدير"),
  record_customer_approval: bi("Record customer approval", "تسجيل موافقة العميل"),
  add_part: bi("Issue parts", "صرف القطع"),
  set_repair_notes: bi("Set repair notes", "تسجيل ملاحظات الإصلاح"),
  approve_qa: bi("Approve QA", "اعتماد فحص الجودة"),
  finalize_job: bi("Finalize amount", "تحديد المبلغ النهائي"),
  capture_signature: bi("Capture signature / handover", "تسجيل التوقيع / التسليم"),
  collect_payment: bi("Collect payment", "تحصيل الدفع"),
  send_message: bi("Send messages", "إرسال الرسائل"),
  manage_settings: bi("Manage system settings", "إدارة إعدادات النظام"),
};

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? "bg-[var(--color-brand-1)]" : "bg-black/15 dark:bg-white/15"}`}
    >
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function Settings() {
  const { role, aliasFieldsEnabled, setAliasFieldsEnabled, permissionsVersion, updateRolePermission, resetRolePermissions, requiredFieldsVersion, setFieldRequired, resetRequiredFields } = useStore();
  const canManage = canPerform(role, "manage_settings");
  // permissionsVersion (destructured above) forces a re-render whenever the module-level table in permissions.ts changes.
  void permissionsVersion;
  // requiredFieldsVersion (destructured above) forces a re-render whenever the module-level table in requiredFields.ts changes.
  void requiredFieldsVersion;
  const actionRoles = getActionRoles();
  const requiredFieldEntities = Object.keys(REQUIRED_FIELD_DEFS) as RequiredFieldEntity[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{bi("Settings", "الإعدادات")}</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">{bi("System-wide configuration for administrators", "إعدادات النظام على مستوى المسؤولين")}</p>
      </div>

      <Card className="space-y-3">
        <CardHeader
          title={bi("Arabic alias fields", "حقول الاسم البديل بالعربية")}
          subtitle={bi("Show an optional Arabic name field on customers, products, technicians, and brands", "إظهار حقل اسم عربي اختياري في العملاء والمنتجات والفنيين والعلامات التجارية")}
          action={<Badge tone={aliasFieldsEnabled ? "good" : "neutral"}>{aliasFieldsEnabled ? bi("Enabled", "مفعّل") : bi("Disabled", "معطّل")}</Badge>}
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3 [border-color:var(--color-border)]">
          <div>
            <p className="text-sm font-medium">{bi("Enable Arabic alias fields", "تفعيل حقول الاسم البديل بالعربية")}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {bi("When on, Add/Edit forms across the CRM show an extra Arabic name input alongside the primary name.", "عند التفعيل، تظهر نماذج الإضافة/التعديل حقل اسم عربي إضافي بجانب الاسم الأساسي.")}
            </p>
          </div>
          <ToggleSwitch
            checked={aliasFieldsEnabled}
            disabled={!canManage}
            onChange={(next) => {
              const outcome = setAliasFieldsEnabled(next);
              toast(outcome.message, outcome.ok ? "success" : "error");
            }}
          />
        </div>
        {!canManage && <p className="text-[11px] text-[var(--color-ink-muted)]">{bi("Only admins can change this setting.", "يمكن للمسؤولين فقط تغيير هذا الإعداد.")}</p>}
      </Card>

      <Card className="space-y-4">
        <CardHeader
          title={bi("Required fields", "الحقول الإلزامية")}
          subtitle={bi("Choose which fields staff must fill in on the New Job Card, Add Customer, and Add Product forms", "اختر الحقول التي يجب على الموظفين تعبئتها في نماذج بطاقة العمل الجديدة وإضافة عميل وإضافة منتج")}
          action={canManage ? <Button size="sm" variant="secondary" onClick={() => { const outcome = resetRequiredFields(); toast(outcome.message, outcome.ok ? "success" : "error"); }}>{bi("Reset to defaults", "إعادة للوضع الافتراضي")}</Button> : undefined}
        />
        {requiredFieldEntities.map((entity) => (
          <div key={entity} className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-ink-secondary)]">{bi(REQUIRED_FIELD_ENTITY_LABEL[entity].en, REQUIRED_FIELD_ENTITY_LABEL[entity].ar)}</p>
            <div className="overflow-x-auto rounded-lg border [border-color:var(--color-border)]">
              <table className="w-full min-w-[480px] text-sm">
                <tbody>
                  {REQUIRED_FIELD_DEFS[entity].map((def) => {
                    const locked = isFieldLocked(entity, def.key);
                    return (
                      <tr key={def.key} className="border-t first:border-t-0 [border-color:var(--color-border)]">
                        <td className="px-3 py-2 text-[var(--color-ink-secondary)]">
                          {bi(def.label, def.labelAr)}
                          {locked && <span className="ml-1.5 text-[11px] text-[var(--color-ink-muted)]">({bi("always required", "دائماً إلزامي")})</span>}
                        </td>
                        <td className="w-16 px-3 py-2 text-right">
                          <ToggleSwitch
                            checked={locked || isFieldRequired(entity, def.key)}
                            disabled={!canManage || locked}
                            onChange={(next) => {
                              const outcome = setFieldRequired(entity, def.key, next);
                              if (!outcome.ok) toast(outcome.message, "error");
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!canManage && <p className="text-[11px] text-[var(--color-ink-muted)]">{bi("Only admins can change required fields.", "يمكن للمسؤولين فقط تغيير الحقول الإلزامية.")}</p>}
      </Card>

      <Card className="space-y-3">
        <CardHeader
          title={bi("Role permissions", "صلاحيات الأدوار")}
          subtitle={bi("Control which roles can perform each action across the CRM", "التحكم في الأدوار المسموح لها بتنفيذ كل إجراء في النظام")}
          action={canManage ? <Button size="sm" variant="secondary" onClick={async () => { const outcome = await resetRolePermissions(); toast(outcome.message, outcome.ok ? "success" : "error"); }}>{bi("Reset to defaults", "إعادة للوضع الافتراضي")}</Button> : undefined}
        />
        <div className="overflow-x-auto rounded-lg border [border-color:var(--color-border)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                <th className="px-3 py-2 font-medium">{bi("Action", "الإجراء")}</th>
                {ROLES.map((r) => <th key={r} className="px-3 py-2 text-center font-medium">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ACTION_LABELS) as DemoAction[]).map((action) => (
                <tr key={action} className="border-t [border-color:var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{ACTION_LABELS[action]}</td>
                  {ROLES.map((r) => {
                    const allowed = actionRoles[action].includes(r);
                    const isAdminColumn = r === "admin";
                    return (
                      <td key={r} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={allowed}
                          disabled={!canManage || isAdminColumn}
                          onChange={async (event) => {
                            const outcome = await updateRolePermission(action, r, event.target.checked);
                            if (!outcome.ok) toast(outcome.message, "error");
                          }}
                          className="h-4 w-4 rounded [border-color:var(--color-border)] disabled:opacity-50"
                          title={isAdminColumn ? bi("Admin always has access", "المسؤول لديه صلاحية دائماً") : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canManage && <p className="text-[11px] text-[var(--color-ink-muted)]">{bi("Only admins can change role permissions.", "يمكن للمسؤولين فقط تغيير صلاحيات الأدوار.")}</p>}
      </Card>
    </div>
  );
}
