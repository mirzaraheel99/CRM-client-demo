import type { JobCard, Payment, PurchaseBill, Role } from "./types";
import { canAdvanceCurrentStage } from "./permissions";

export interface StageRequirement {
  label: string;
  met: boolean;
}

export interface JobFlowContext {
  payments: Payment[];
  purchaseBill?: PurchaseBill;
}

export function paidTotal(payments: Payment[]) {
  return payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
}

export function stageRequirements(job: JobCard, context: JobFlowContext): StageRequirement[] {
  if (job.currentStage === "Received") {
    return [{ label: "Qualified technician assigned", met: Boolean(job.technicianId) }];
  }
  if (job.currentStage === "Warranty Validation") {
    return [{ label: "Purchase bill recorded", met: Boolean(context.purchaseBill) }];
  }
  if (job.currentStage === "Diagnosis") {
    return [{ label: "Diagnosis notes saved", met: Boolean(job.diagnosisNotes?.trim()) }];
  }
  if (job.currentStage === "Estimate") {
    return [{ label: "Estimate amount saved", met: (job.estimateAmount ?? 0) > 0 }];
  }
  if (job.currentStage === "Customer Approval") {
    return [{ label: job.customerApproved === false ? "Customer declined the estimate" : "Customer approval recorded", met: job.customerApproved === true }];
  }
  if (job.currentStage === "Repair") {
    return [{ label: "Repair notes saved", met: Boolean(job.repairNotes?.trim()) }];
  }
  if (job.currentStage === "QA") {
    return [{ label: "QA approved by a supervisor", met: job.qaApproved }];
  }
  if (job.currentStage === "Ready for Handover") {
    const requirements: StageRequirement[] = [{ label: "Customer signature captured", met: Boolean(job.customerSignature?.trim()) }];
    if (job.jobType === "non_warranty") {
      requirements.unshift(
        { label: "Final amount confirmed", met: (job.finalAmount ?? 0) > 0 },
        { label: "Payment collected", met: (job.finalAmount ?? 0) > 0 && paidTotal(context.payments) >= (job.finalAmount ?? 0) }
      );
    }
    return requirements;
  }
  return [];
}

export function stageBlockers(job: JobCard, context: JobFlowContext) {
  return stageRequirements(job, context).filter((requirement) => !requirement.met).map((requirement) => requirement.label);
}

export function stageAccessBlocker(job: JobCard, role: Role) {
  return canAdvanceCurrentStage(role, job.currentStage) ? null : `${role === "front_desk" ? "Front Desk" : role.charAt(0).toUpperCase() + role.slice(1)} cannot complete ${job.currentStage}.`;
}
