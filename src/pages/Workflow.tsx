import { useState } from "react";
import { ArrowRight, MessageCircle, Smartphone, Mail, ShieldCheck } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Badge } from "../components/ui";
import { toast } from "../lib/toast";
import { cx } from "../lib/utils";

export default function Workflow() {
  const { workflows, updateWorkflowStep } = useStore();
  const [activeWfId, setActiveWfId] = useState(workflows[0]?.id);
  const [selectedStep, setSelectedStep] = useState<number>(0);

  const workflow = workflows.find((w) => w.id === activeWfId) ?? workflows[0];
  const step = workflow?.steps.find((s) => s.stepOrder === selectedStep) ?? workflow?.steps[0];

  return (
    <div className="space-y-4">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">Workflow Designer</h1>
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
        <CardHeader title={workflow?.name ?? ""} subtitle={workflow?.description} action={<Badge tone={workflow?.jobType === "warranty" ? "good" : "neutral"}>{workflow?.jobType === "warranty" ? "Warranty" : "Non-Warranty"}</Badge>} />
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
                <span className="text-xs text-[var(--color-ink-muted)]">Step {s.stepOrder}</span>
                <span className="text-sm font-semibold">{s.stepName}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {s.approvalRequired && <Badge tone="serious" icon={<ShieldCheck size={11} />}>Approval</Badge>}
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
          <CardHeader title={`Edit Stage: ${step.stepName}`} subtitle="Rules and triggers for this workflow step" />

          <div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-1.5">Mandatory fields</p>
            <div className="flex flex-wrap gap-1.5">
              {step.mandatoryFields.length ? step.mandatoryFields.map((f) => <Badge key={f}>{f}</Badge>) : <span className="text-xs text-[var(--color-ink-muted)]">None</span>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Approval required</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{step.approverRole ? `Approver: ${step.approverRole}` : "No approver assigned"}</p>
            </div>
            <button
              type="button"
              disabled
              title="Approval safeguards are fixed in this demo"
              className={cx("h-6 w-11 rounded-full relative cursor-not-allowed opacity-70", step.approvalRequired ? "bg-[var(--color-brand-1)]" : "bg-black/15 dark:bg-white/15")}
            >
              <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", step.approvalRequired ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>

          <div className="border-t pt-3 [border-color:var(--color-border)] space-y-2">
            <p className="text-sm font-medium">Communication triggers</p>
            {(["whatsapp", "sms", "email"] as const).map((ch) => (
              <div key={ch} className="flex items-center justify-between">
                <span className="text-sm capitalize text-[var(--color-ink-secondary)]">{ch}</span>
                <button
                  onClick={() => { const result = updateWorkflowStep(workflow.id, step.stepOrder, { triggers: { ...step.triggers, [ch]: !step.triggers[ch] } }); toast(result.message, result.ok ? "success" : "error"); }}
                  className={cx("h-6 w-11 rounded-full transition-colors relative", step.triggers[ch] ? "bg-[var(--color-brand-1)]" : "bg-black/15 dark:bg-white/15")}
                >
                  <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", step.triggers[ch] ? "translate-x-5" : "translate-x-0.5")} />
                </button>
              </div>
            ))}
          </div>

          <Button variant="secondary" className="w-full justify-center" disabled>Save &amp; Assign to Job Type (auto-saved)</Button>
        </Card>
      )}
    </div>
  );
}
