import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextServiceOrderDocumentNo } from "../lib/documentNo.js";
import { nextStageRefNo } from "../lib/stageRefNo.js";

const lineSchema = z.object({
  applianceId: z.string().min(1),
  jobType: z.enum(["warranty", "non_warranty"]),
  problemDescription: z.string().min(4),
  technicianId: z.string().optional().nullable(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  branchId: z.string().min(1),
  lines: z.array(lineSchema).min(1),
  shortAddressCode: z.string().optional(),
  buildingNo: z.string().optional(),
  unitNo: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  additionalNo: z.string().optional(),
  requestSource: z.enum(["walk_in", "phone", "whatsapp", "app", "referral"]).optional(),
  preferredDate: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  buyerVatNumber: z.string().optional(),
});

export default async function serviceOrderRoutes(fastify: FastifyInstance) {
  fastify.get("/api/service-orders", { preHandler: fastify.authenticate }, async () => {
    return prisma.serviceOrder.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true, jobCards: true } });
  });

  fastify.post(
    "/api/service-orders",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_job")] },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const input = parsed.data;

      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) return reply.code(400).send({ ok: false, message: "Choose a valid customer." });
      if (input.branchId !== customer.branchId) {
        return reply.code(400).send({ ok: false, message: "Receiving branch must match the customer branch." });
      }

      const applianceIds = input.lines.map((l) => l.applianceId);
      if (new Set(applianceIds).size !== applianceIds.length) {
        return reply.code(400).send({ ok: false, message: "Each product can appear only once in the same service order." });
      }

      const documentNo = await nextServiceOrderDocumentNo();
      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        const serviceOrder = await tx.serviceOrder.create({
          data: {
            documentNo,
            customerId: input.customerId,
            branchId: input.branchId,
            shortAddressCode: input.shortAddressCode,
            buildingNo: input.buildingNo,
            unitNo: input.unitNo,
            district: input.district,
            postalCode: input.postalCode,
            additionalNo: input.additionalNo,
            requestSource: input.requestSource,
            preferredDate: input.preferredDate ? new Date(input.preferredDate) : undefined,
            preferredTimeSlot: input.preferredTimeSlot,
            buyerVatNumber: input.buyerVatNumber,
          },
        });

        const jobCards = [];
        for (let i = 0; i < input.lines.length; i++) {
          const line = input.lines[i];
          const sequenceNo = i + 1;
          const lineDocumentNo = `${documentNo}-${String(sequenceNo).padStart(2, "0")}`;
          const jobCard = await tx.jobCard.create({
            data: {
              serviceOrderId: serviceOrder.id,
              sequenceNo,
              documentNo: lineDocumentNo,
              invoiceNo: `INV-${lineDocumentNo}`,
              customerId: input.customerId,
              applianceId: line.applianceId,
              technicianId: line.technicianId || undefined,
              branchId: input.branchId,
              jobType: line.jobType,
              status: "Received",
              currentStage: "Received",
              problemDescription: line.problemDescription.trim(),
            },
          });
          const stageRefNo = await nextStageRefNo(
            (stageName) => tx.jobCardStageHistory.count({ where: { stageName } }),
            "Received"
          );
          await tx.jobCardStageHistory.create({
            data: {
              jobcardId: jobCard.id,
              stageName: "Received",
              changedBy: request.currentUser!.name,
              notes: `Product sequence ${String(sequenceNo).padStart(2, "0")} received at counter.`,
              stageRefNo,
            },
          });
          jobCards.push(jobCard);
        }

        return { serviceOrder, jobCards };
      });

      return { ok: true, message: `Service order ${documentNo} created with ${result.jobCards.length} product sequence(s).`, ...result };
    }
  );

  fastify.post(
    "/api/service-orders/:id/lines",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_job")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = lineSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const line = parsed.data;

      const serviceOrder = await prisma.serviceOrder.findUnique({ where: { id } });
      if (!serviceOrder) return reply.code(404).send({ ok: false, message: "Service order not found." });

      const appliance = await prisma.appliance.findUnique({ where: { id: line.applianceId } });
      if (!appliance) return reply.code(400).send({ ok: false, message: "Choose a valid product." });

      const existingLines = await prisma.jobCard.findMany({ where: { serviceOrderId: id } });
      if (existingLines.some((existing) => existing.applianceId === line.applianceId)) {
        return reply.code(400).send({ ok: false, message: "This product is already part of this service order." });
      }

      if (line.technicianId) {
        const technician = await prisma.technician.findUnique({ where: { id: line.technicianId } });
        if (!technician) return reply.code(400).send({ ok: false, message: "Choose a valid technician." });
        if (technician.branchId !== serviceOrder.branchId) {
          return reply.code(400).send({ ok: false, message: "Assigned technician must belong to the receiving branch." });
        }
        if (!technician.skills.includes(appliance.category)) {
          return reply.code(400).send({ ok: false, message: `${technician.name} is not qualified for ${appliance.category}.` });
        }
        if (technician.status === "Off Duty") return reply.code(400).send({ ok: false, message: `${technician.name} is off duty.` });
      }

      const now = new Date();
      const sequenceNo = existingLines.length + 1;
      const lineDocumentNo = `${serviceOrder.documentNo}-${String(sequenceNo).padStart(2, "0")}`;

      const result = await prisma.$transaction(async (tx) => {
        const jobCard = await tx.jobCard.create({
          data: {
            serviceOrderId: id,
            sequenceNo,
            documentNo: lineDocumentNo,
            invoiceNo: `INV-${lineDocumentNo}`,
            customerId: serviceOrder.customerId,
            applianceId: line.applianceId,
            technicianId: line.technicianId || undefined,
            branchId: serviceOrder.branchId,
            jobType: line.jobType,
            status: "Received",
            currentStage: "Received",
            problemDescription: line.problemDescription.trim(),
          },
        });
        const stageRefNo = await nextStageRefNo(
          (stageName) => tx.jobCardStageHistory.count({ where: { stageName } }),
          "Received"
        );
        await tx.jobCardStageHistory.create({
          data: {
            jobcardId: jobCard.id,
            stageName: "Received",
            changedBy: request.currentUser!.name,
            notes: `Product sequence ${String(sequenceNo).padStart(2, "0")} received at counter.`,
            stageRefNo,
          },
        });
        await tx.serviceOrder.update({ where: { id }, data: { updatedAt: now } });
        return jobCard;
      });

      return { ok: true, message: `${lineDocumentNo} added to ${serviceOrder.documentNo}.`, jobCard: result };
    }
  );
}
