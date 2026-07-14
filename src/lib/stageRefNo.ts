import type { JobCardStageHistory, StageName } from "./types";

// Every workflow step gets its own sequential reference series so the
// client can trace and report on each stage independently of the invoice
// number.
const STAGE_REF_PREFIX: Record<StageName, string> = {
  Received: "RCV",
  "Warranty Validation": "WV",
  Diagnosis: "DX",
  Estimate: "EST",
  "Customer Approval": "APR",
  "OEM Approval": "OEM",
  Repair: "RPR",
  QA: "QA",
  "Ready for Handover": "RFH",
  Delivered: "DLV",
};

export function stageRefPrefix(stage: StageName): string {
  return STAGE_REF_PREFIX[stage];
}

export function nextStageRefNo(history: JobCardStageHistory[], stageName: StageName): string {
  const prefix = STAGE_REF_PREFIX[stageName];
  const count = history.filter((h) => h.stageName === stageName && h.stageRefNo).length;
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}
