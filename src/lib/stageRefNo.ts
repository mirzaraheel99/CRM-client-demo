import type { JobCardStageHistory, StageName } from "./types";

// Stages the client needs to run reports against independently of the
// invoice number — each gets its own sequential reference series.
const STAGE_REF_PREFIX: Partial<Record<StageName, string>> = {
  Diagnosis: "DX",
  Estimate: "EST",
  "Customer Approval": "APR",
  Repair: "RPR",
  QA: "QA",
};

export function stageRefPrefix(stage: StageName): string | undefined {
  return STAGE_REF_PREFIX[stage];
}

export function nextStageRefNo(history: JobCardStageHistory[], stageName: StageName): string | undefined {
  const prefix = STAGE_REF_PREFIX[stageName];
  if (!prefix) return undefined;
  const count = history.filter((h) => h.stageName === stageName && h.stageRefNo).length;
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}
