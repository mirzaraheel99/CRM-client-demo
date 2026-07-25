import type { JobCard, JobCardAttachment, RemovedPart } from "@prisma/client";

export interface StageRequirement {
  label: string;
  met: boolean;
}

// Phase 1 port of the frontend's src/lib/workflow.ts stageRequirements().
// Payments and PurchaseBill aren't modeled server-side yet (Phase 2), so the
// purchase-bill check is stubbed as met — revisit once that table exists.
export function stageRequirements(
  job: JobCard,
  removedParts: Pick<RemovedPart, "returnStatus">[] = [],
  attachments: Pick<JobCardAttachment, "stageName">[] = []
): StageRequirement[] {
  switch (job.currentStage) {
    case "Received":
      return [
        { label: "Qualified technician assigned", met: Boolean(job.technicianId) },
        { label: "Asset receipt custody confirmed", met: Boolean(job.assetReceivedRef) },
      ];
    case "Warranty Validation":
      return [
        { label: "Purchase bill recorded", met: true }, // TODO Phase 2: PurchaseBill table
        { label: "Proof of purchase attached", met: attachments.some((a) => a.stageName === "Warranty Validation") },
      ];
    case "Diagnosis":
      return [{ label: "Diagnosis notes saved", met: Boolean(job.diagnosisNotes?.trim()) }];
    case "Estimate":
      return [{ label: "Estimate amount saved", met: (job.estimateAmount ?? 0) > 0 }];
    case "Customer Approval":
      return [{
        label: job.customerApproved === false ? "Customer declined the estimate" : "Customer approval recorded",
        met: job.customerApproved === true,
      }];
    case "Repair":
      return [{ label: "Repair notes saved", met: Boolean(job.repairNotes?.trim()) }];
    case "QA":
      return [{ label: "QA approved by a supervisor", met: job.qaApproved }];
    case "Ready for Handover": {
      const requirements: StageRequirement[] = [
        { label: "Customer signature captured", met: Boolean(job.customerSignature?.trim()) },
        { label: "All removed parts returned to customer", met: !removedParts.some((part) => part.returnStatus === "pending") },
        { label: "Asset handover confirmed", met: job.assetHandedOver === true },
      ];
      if (job.jobType === "non_warranty" || job.finalAmount != null) {
        requirements.unshift(
          { label: "Final amount confirmed", met: (job.finalAmount ?? 0) > 0 },
          { label: "Payment collected", met: true } // TODO Phase 2: Payment table
        );
      }
      return requirements;
    }
    default:
      return [];
  }
}

export function stageBlockers(
  job: JobCard,
  removedParts: Pick<RemovedPart, "returnStatus">[] = [],
  attachments: Pick<JobCardAttachment, "stageName">[] = []
): string[] {
  return stageRequirements(job, removedParts, attachments).filter((r) => !r.met).map((r) => r.label);
}

const STAGE_ORDER_WARRANTY = ["Received", "Warranty Validation", "Diagnosis", "Repair", "QA", "Ready for Handover", "Delivered"];
const STAGE_ORDER_NON_WARRANTY = ["Received", "Diagnosis", "Estimate", "Customer Approval", "Repair", "QA", "Ready for Handover", "Delivered"];

export function nextStage(job: JobCard): string | null {
  const order = job.jobType === "warranty" ? STAGE_ORDER_WARRANTY : STAGE_ORDER_NON_WARRANTY;
  const idx = order.indexOf(job.currentStage);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

// Fields tied to an earlier stage can be revisited after the job has moved
// on (e.g. amending diagnosis notes after repair uncovers something new).
// This tells the caller whether the job has actually moved past that stage,
// so it knows whether the edit needs an audit-trail note.
export function isPastStage(job: JobCard, stageName: string): boolean {
  const order = job.jobType === "warranty" ? STAGE_ORDER_WARRANTY : STAGE_ORDER_NON_WARRANTY;
  const currentIdx = order.indexOf(job.currentStage);
  const stageIdx = order.indexOf(stageName);
  if (currentIdx === -1 || stageIdx === -1) return false;
  return currentIdx > stageIdx;
}

export function canAdvanceCurrentStage(role: string, stage: string): boolean {
  if (role === "manager" || role === "admin") return true;
  if (role === "supervisor") return true;
  if (role === "technician") return stage === "Diagnosis" || stage === "Repair";
  return stage === "Received" || stage === "Estimate" || stage === "Customer Approval" || stage === "Ready for Handover";
}

const STAGE_TO_STATUS: Record<string, string> = {
  Received: "Received",
  "Warranty Validation": "In Diagnosis",
  Diagnosis: "In Diagnosis",
  Estimate: "Waiting Approval",
  "Customer Approval": "Waiting Approval",
  "OEM Approval": "Waiting Approval",
  Repair: "In Repair",
  QA: "QA",
  "Ready for Handover": "Ready",
  Delivered: "Delivered",
};

export function statusForStage(stage: string): string {
  return STAGE_TO_STATUS[stage] ?? stage;
}
