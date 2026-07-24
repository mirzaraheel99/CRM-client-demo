import { useState } from "react";
import { ArrowRight, CheckCircle2, MessageCircle, Smartphone, Mail, ShieldCheck } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Badge } from "../components/ui";
import { toast } from "../lib/toast";
import { cx } from "../lib/utils";
import { canAccessPath, canPerform } from "../lib/permissions";
import { ROLE_AR, STAGE_NAME_AR, CHANNEL_AR, bi } from "../lib/domainAr";
import type { Role, StageName } from "../lib/types";

const ROLES: { id: Role; label: string }[] = [
  { id: "front_desk", label: "Front Desk" },
  { id: "technician", label: "Technician" },
  { id: "supervisor", label: "Supervisor" },
  { id: "manager", label: "Manager" },
  { id: "admin", label: "Admin" },
];

export default function Workflow() {
  const { workflows, updateWorkflowStep } = useStore();
  const [activeWfId, setActiveWfId] = useState(workflows[0]?.id);
  const [selectedStep, setSelectedStep] = useState<number>(0);

  const workflow = workflows.find((w) => w.id === activeWfId) ?? workflows[0];
  const step = workflow?.steps.find((s) => s.stepOrder === selectedStep) ?? workflow?.steps[0];

  return (
    <div className="space-y-4">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">{bi("Workflow Designer", "مصمم سير العمل")}</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Configurable stage flows, per job type, with mandatory fields, approvals, and triggers.</p>
      </div>

      <div className="flex gap-2">
        {workflows.map((w) => (
          <button
            key={w.id}
            onClick={() => { setActiveWfId(w.id); setSelectedStep(w.steps[0].stepOrder); }}
            className={cx(
              "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors [border-color:var(--color-border)]",
              w.id === workflow?.id ? "bg-[var(--color-brand-1)] text-white border-transparent" : "text-[var(--color-ink-secondary)]"
            )}
          >
            {w.name}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title={workflow?.name ?? ""} subtitle={workflow?.description} action={<Badge tone={workflow?.jobType === "warranty" ? "good" : "neutral"}>{workflow?.jobType === "warranty" ? bi("Warranty", "ضمان") : bi("Non-Warranty", "بدون ضمان")}</Badge>} />
        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
          {workflow?.steps.map((s, idx) => (
            <div key={s.stepOrder} className="flex items-center shrink-0">
              <button
                onClick={() => setSelectedStep(s.stepOrder)}
                className={cx(
                  "flex flex-col gap-1.5 rounded-xl border px-4 py-3 min-w-[140px] text-left transition-colors [border-color:var(--color-border)]",
                  s.stepOrder === selectedStep ? "bg-[var(--color-brand-1)]/10 border-[var(--color-brand-1)]" : "bg-[var(--color-surface-2)]"
                )}
              >
                <span className="text-xs text-[var(--color-ink-muted)]">{bi("Step", "الخطوة")} {s.stepOrder}</span>
                <span className="text-sm font-semibold">{s.stepName}</span>
                <span className="text-xs text-[var(--color-ink-muted)]" dir="rtl">{STAGE_NAME_AR[s.stepName as StageName]}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {s.approvalRequired && <Badge tone="serious" icon={<ShieldCheck size={11} />}>{bi("Approval", "موافقة")}</Badge>}
                  {s.triggers.whatsapp && <MessageCircle size={12} className="text-[var(--color-status-good)]" />}
                  {s.triggers.sms && <Smartphone size={12} className="text-[var(--color-series-3)]" />}
                  {s.triggers.email && <Mail size={12} className="text-[var(--color-series-1)]" />}
                </div>
              </button>
              {idx < workflow.steps.length - 1 && <ArrowRight size={16} className="mx-1 text-[var(--color-ink-muted)] shrink-0" />}
            </div>
          ))}
        </div>
      </Card>

      {step && workflow && (
        <Card className="max-w-xl space-y-4">
          <CardHeader title={bi(`Edit Stage: ${step.stepName}`, `تعديل المرحلة: ${STAGE_NAME_AR[step.stepName as StageName]}`)} subtitle="Rules and triggers for this workflow step" />

          <div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-1.5">{bi("Mandatory fields", "الحقول الإلزامية")}</p>
            <div className="flex flex-wrap gap-1.5">
              {step.mandatoryFields.length ? step.mandatoryFields.map((f) => <Badge key={f}>{f}</Badge>) : <span className="text-xs text-[var(--color-ink-muted)]">{bi("None", "لا يوجد")}</span>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{bi("Approval required", "تتطلب موافقة")}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{step.approverRole ? `Approver: ${step.approverRole}` : bi("No approver assigned", "لا يوجد معتمد محدد")}</p>
            </div>
            <button
              type="button"
              onClick={() => { const result = updateWorkflowStep(workflow.id, step.stepOrder, { approvalRequired: !step.approvalRequired }); toast(result.message, result.ok ? "success" : "error"); }}
              className={cx("h-6 w-11 rounded-full relative transition-colors", step.approvalRequired ? "bg-[var(--color-brand-1)]" : "bg-black/15 dark:bg-white/15")}
            >
              <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", step.approvalRequired ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>

          <div className="border-t pt-3 [border-color:var(--color-border)] space-y-2">
            <p className="text-sm font-medium">{bi("Communication triggers", "محفزات التواصل")}</p>
            {(["whatsapp", "sms", "email"] as const).map((ch) => (
              <div key={ch} className="flex items-center justify-between">
                <span className="text-sm capitalize text-[var(--color-ink-secondary)]">{bi(ch, CHANNEL_AR[ch])}</span>
                <button
                  onClick={() => { const result = updateWorkflowStep(workflow.id, step.stepOrder, { triggers: { ...step.triggers, [ch]: !step.triggers[ch] } }); toast(result.message, result.ok ? "success" : "error"); }}
                  className={cx("h-6 w-11 rounded-full transition-colors relative", step.triggers[ch] ? "bg-[var(--color-brand-1)]" : "bg-black/15 dark:bg-white/15")}
                >
                  <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", step.triggers[ch] ? "translate-x-5" : "translate-x-0.5")} />
                </button>
              </div>
            ))}
          </div>

          <p className="flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-status-good)]/10 py-2 text-xs font-medium text-[var(--color-status-good)]">
            <CheckCircle2 size={13} /> {bi("Changes save automatically", "يتم حفظ التغييرات تلقائياً")}
          </p>
        </Card>
      )}

      <Card padded={false}>
        <div className="px-5 pt-5"><CardHeader title={bi("User-wise screen and action access", "صلاحيات الوصول حسب المستخدم")} subtitle="The selected role controls navigation, direct routes, and job-stage actions." /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-y text-left text-xs text-[var(--color-ink-muted)] [border-color:var(--color-border)]"><th className="px-5 py-2 font-medium">{bi("Role", "الدور")}</th><th className="px-3 py-2 font-medium">{bi("Create customer", "إنشاء عميل")}</th><th className="px-3 py-2 font-medium">{bi("Create service order", "إنشاء أمر خدمة")}</th><th className="px-3 py-2 font-medium">{bi("Diagnosis / repair", "التشخيص / الإصلاح")}</th><th className="px-3 py-2 font-medium">{bi("Inventory", "المخزون")}</th><th className="px-3 py-2 font-medium">{bi("QA / assignment", "الجودة / الإسناد")}</th><th className="px-3 py-2 font-medium">{bi("Reports", "التقارير")}</th><th className="px-5 py-2 font-medium">{bi("Workflow setup", "إعداد سير العمل")}</th></tr></thead>
            <tbody>
              {ROLES.map((role) => {
                const cells = [canPerform(role.id, "create_customer"), canPerform(role.id, "create_job"), canPerform(role.id, "set_diagnosis") && canPerform(role.id, "set_repair_notes"), canPerform(role.id, "manage_inventory"), canPerform(role.id, "approve_qa") && canPerform(role.id, "assign_technician"), canAccessPath(role.id, "/reports"), canPerform(role.id, "edit_workflow")];
                return <tr key={role.id} className="border-b last:border-0 [border-color:var(--color-border)]"><td className="px-5 py-3 font-medium">{bi(role.label, ROLE_AR[role.id])}</td>{cells.map((allowed, index) => <td key={index} className="px-3 py-3">{allowed ? <CheckCircle2 size={16} className="text-[var(--color-status-good)]" aria-label="Allowed" /> : <span className="text-[var(--color-ink-muted)]" aria-label="Not allowed">-</span>}</td>)}</tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
