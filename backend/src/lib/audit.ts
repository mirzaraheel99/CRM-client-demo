import type { JobCard } from "@prisma/client";
import { prisma } from "./prisma.js";
import { isPastStage } from "./workflow.js";

// A field's "home" stage no longer hard-blocks edits once the job has moved
// on — e.g. repair can turn up something that means diagnosis notes or the
// estimate need amending. Instead, revisiting it after the fact leaves a
// visible note on the job's timeline so nothing gets silently rewritten.
export async function recordAmendmentIfPast(jobCard: JobCard, homeStage: string, changedBy: string, fieldLabel: string) {
  if (!isPastStage(jobCard, homeStage)) return;
  await prisma.jobCardStageHistory.create({
    data: {
      jobcardId: jobCard.id,
      stageName: homeStage,
      changedBy,
      notes: `${fieldLabel} amended after moving to ${jobCard.currentStage} stage.`,
    },
  });
}
