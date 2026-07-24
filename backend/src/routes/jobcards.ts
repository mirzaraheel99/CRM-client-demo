import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextStageRefNo } from "../lib/stageRefNo.js";
import { stageBlockers, nextStage, canAdvanceCurrentStage, statusForStage } from "../lib/workflow.js";
import { recordAmendmentIfPast } from "../lib/audit.js";

const jobCardInclude = {
  customer: true,
  appliance: { include: { brand: true } },
  technician: true,
  branch: true,
  serviceOrder: true,
  stageHistory: { orderBy: { timestamp: "asc" as const } },
};

export default async function jobCardRoutes(fastify: FastifyInstance) {
  fastify.get("/api/job-cards", { preHandler: fastify.authenticate }, async (request) => {
    const { branchId, status } = request.query as { branchId?: string; status?: string };
    return prisma.jobCard.findMany({
      where: { branchId: branchId || undefined, status: status || undefined },
      include: jobCardInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  fastify.get("/api/job-cards/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const jobCard = await prisma.jobCard.findUnique({ where: { id }, include: jobCardInclude });
    if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
    return jobCard;
  });

  fastify.patch(
    "/api/job-cards/:id/diagnosis",
    { preHandler: [fastify.authenticate, fastify.requirePermission("set_diagnosis")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ diagnosisNotes: z.string().min(1) }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Diagnosis notes are required." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "Diagnosis", request.currentUser!.name, "Diagnosis notes");
      return prisma.jobCard.update({ where: { id }, data: { diagnosisNotes: body.data.diagnosisNotes.trim() } });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/repair-notes",
    { preHandler: [fastify.authenticate, fastify.requirePermission("set_repair_notes")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ repairNotes: z.string().min(1) }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Repair notes are required." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "Repair", request.currentUser!.name, "Repair notes");
      return prisma.jobCard.update({ where: { id }, data: { repairNotes: body.data.repairNotes.trim() } });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/qa-approve",
    { preHandler: [fastify.authenticate, fastify.requirePermission("approve_qa")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ qaApproved: z.boolean() }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid input." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "QA", request.currentUser!.name, "QA approval");
      return prisma.jobCard.update({ where: { id }, data: { qaApproved: body.data.qaApproved } });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/signature",
    { preHandler: [fastify.authenticate, fastify.requirePermission("capture_signature")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ customerSignature: z.string().min(1) }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Signature data is required." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "Ready for Handover", request.currentUser!.name, "Customer signature");
      return prisma.jobCard.update({ where: { id }, data: { customerSignature: body.data.customerSignature } });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/asset-handover",
    { preHandler: [fastify.authenticate, fastify.requirePermission("finalize_job")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "Ready for Handover", request.currentUser!.name, "Asset handover confirmation");
      return prisma.jobCard.update({
        where: { id },
        data: { assetHandedOver: true, assetHandedOverAt: new Date(), assetHandedOverBy: request.currentUser!.name },
      });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/estimate",
    { preHandler: [fastify.authenticate, fastify.requirePermission("set_estimate")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          estimateAmount: z.number().nonnegative().optional(),
          finalAmount: z.number().nonnegative().optional(),
          estimateValidUntil: z.string().optional(),
          estimatePreparedBy: z.string().optional(),
          estimateTermsOfPayment: z.string().optional(),
          estimatePoNumber: z.string().optional(),
          estimateNotes: z.string().optional(),
          estimatePreviousQuoteNo: z.string().optional(),
          estimateCustomerRequest: z.string().optional(),
          estimateDeliveryLeadTime: z.string().optional(),
          estimateSubject: z.string().optional(),
        })
        .safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid input." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "Estimate", request.currentUser!.name, "Estimate details");
      const { estimateValidUntil, ...rest } = body.data;
      return prisma.jobCard.update({
        where: { id },
        data: { ...rest, estimateValidUntil: estimateValidUntil ? new Date(estimateValidUntil) : undefined },
      });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/final-amount",
    { preHandler: [fastify.authenticate, fastify.requirePermission("finalize_job")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ finalAmount: z.number().positive() }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Final amount must be greater than zero." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      if ((jobCard.estimateAmount ?? 0) > 0 && body.data.finalAmount > (jobCard.estimateAmount ?? 0)) {
        return reply.code(400).send({ ok: false, message: "Final amount cannot exceed the customer-approved estimate." });
      }
      await recordAmendmentIfPast(jobCard, "Ready for Handover", request.currentUser!.name, "Final amount");
      return prisma.jobCard.update({ where: { id }, data: { finalAmount: body.data.finalAmount } });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/customer-approval",
    { preHandler: [fastify.authenticate, fastify.requirePermission("record_customer_approval")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ approved: z.boolean() }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid input." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      if ((jobCard.estimateAmount ?? 0) <= 0) return reply.code(400).send({ ok: false, message: "Set the estimate before recording approval." });
      await recordAmendmentIfPast(jobCard, "Customer Approval", request.currentUser!.name, "Customer approval decision");
      return prisma.jobCard.update({ where: { id }, data: { customerApproved: body.data.approved } });
    }
  );

  fastify.patch(
    "/api/job-cards/:id/technician",
    { preHandler: [fastify.authenticate, fastify.requirePermission("assign_technician")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ technicianId: z.string().min(1) }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Choose a valid technician." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      if (jobCard.status === "Delivered") return reply.code(400).send({ ok: false, message: "Delivered jobs cannot be reassigned." });
      const technician = await prisma.technician.findUnique({ where: { id: body.data.technicianId } });
      if (!technician) return reply.code(400).send({ ok: false, message: "Choose a valid technician." });
      if (technician.branchId !== jobCard.branchId) return reply.code(400).send({ ok: false, message: "Technician must belong to the job branch." });
      return prisma.jobCard.update({ where: { id }, data: { technicianId: technician.id } });
    }
  );

  fastify.post(
    "/api/job-cards/:id/advance-stage",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });

      if (!canAdvanceCurrentStage(request.currentUser!.role, jobCard.currentStage)) {
        return reply.code(403).send({ ok: false, message: "Your role cannot advance this stage." });
      }

      const blockers = stageBlockers(jobCard);
      if (blockers.length > 0) {
        return reply.code(400).send({ ok: false, message: `Cannot advance: ${blockers.join(", ")}` });
      }

      const upcoming = nextStage(jobCard);
      if (!upcoming) {
        return reply.code(400).send({ ok: false, message: "This job card is already at its final stage." });
      }

      const notes = (request.body as { notes?: string } | undefined)?.notes?.trim() || `Advanced to ${upcoming}.`;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.jobCard.update({
          where: { id },
          data: { currentStage: upcoming, status: statusForStage(upcoming) },
        });
        const stageRefNo = await nextStageRefNo(
          (stageName) => tx.jobCardStageHistory.count({ where: { stageName } }),
          upcoming
        );
        await tx.jobCardStageHistory.create({
          data: {
            jobcardId: id,
            stageName: upcoming,
            changedBy: request.currentUser!.name,
            notes,
            stageRefNo,
          },
        });
        return updated;
      });

      return { ok: true, message: `Advanced to ${upcoming}.`, jobCard: result };
    }
  );
}
