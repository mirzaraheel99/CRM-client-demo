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
}
