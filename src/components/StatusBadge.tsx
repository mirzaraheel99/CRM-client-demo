import { Badge } from "./ui";
import type { JobStatus, JobType } from "../lib/types";

const STATUS_TONE: Record<JobStatus, "neutral" | "good" | "warning" | "serious" | "critical" | "brand"> = {
  Received: "brand",
  "In Diagnosis": "warning",
  "Waiting Approval": "serious",
  "In Repair": "warning",
  QA: "brand",
  Ready: "good",
  Delivered: "neutral",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

export function JobTypeBadge({ jobType }: { jobType: JobType }) {
  return jobType === "warranty" ? <Badge tone="good">Warranty</Badge> : <Badge tone="neutral">Non-Warranty</Badge>;
}
