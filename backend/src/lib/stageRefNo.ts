const STAGE_REF_PREFIX: Record<string, string> = {
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

export async function nextStageRefNo(
  countExisting: (stageName: string) => Promise<number>,
  stageName: string
): Promise<string> {
  const prefix = STAGE_REF_PREFIX[stageName] ?? "GEN";
  const count = await countExisting(stageName);
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}
