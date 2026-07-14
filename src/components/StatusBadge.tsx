import { Badge } from "./ui";
import { JOB_STATUS_AR, JOB_TYPE_AR, bi } from "../lib/domainAr";
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
  return <Badge tone={STATUS_TONE[status]}>{bi(status, JOB_STATUS_AR[status])}</Badge>;
}

export function JobTypeBadge({ jobType }: { jobType: JobType }) {
  const label = jobType === "warranty" ? "Warranty" : "Non-Warranty";
  return <Badge tone={jobType === "warranty" ? "good" : "neutral"}>{bi(label, JOB_TYPE_AR[jobType])}</Badge>;
}
