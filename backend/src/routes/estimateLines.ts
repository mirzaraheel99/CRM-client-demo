import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAmendmentIfPast } from "../lib/audit.js";

const lineInput = z.object({
  kind: z.enum(["labor", "part", "other", "discount"]),
  label: z.string().min(1),
  descriptionAr: z.string().optional(),
  catNo: z.string().optional(),
  notes: z.string().optional(),
  itemId: z.string().optional(),
  qty: z.number(),
  unitPrice: z.number(),
  discountAmount: z.number().optional(),
});

function computeTotal(input: { qty: number; unitPrice: number; discountAmount?: number }) {
  return input.qty * input.unitPrice - (input.discountAmount ?? 0);
}

export default async function estimateLineRoutes(fastify: FastifyInstance) {
  fastify.get("/api/job-cards/:id/estimate-lines", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.estimateLine.findMany({ where: { jobcardId: id }, orderBy: { createdAt: "asc" } });
  });

  fastify.get("/api/estimate-lines", { preHandler: fastify.authenticate }, async () => {
    return prisma.estimateLine.findMany({ orderBy: { createdAt: "asc" } });
  });

  fastify.post(
    "/api/job-cards/:id/estimate-lines",
    { preHandler: [fastify.authenticate, fastify.requirePermission("set_estimate")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = lineInput.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid estimate line." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      await recordAmendmentIfPast(jobCard, "Estimate", request.currentUser!.name, "Estimate line item");
      return prisma.estimateLine.create({
        data: { jobcardId: id, ...body.data, totalPrice: computeTotal(body.data) },
      });
    }
  );

  fastify.patch(
    "/api/estimate-lines/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("set_estimate")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = lineInput.partial().safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid estimate line." });
      const existing = await prisma.estimateLine.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Estimate line not found." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id: existing.jobcardId } });
      if (jobCard) await recordAmendmentIfPast(jobCard, "Estimate", request.currentUser!.name, "Estimate line item");
      const merged = {
        qty: body.data.qty ?? existing.qty,
        unitPrice: body.data.unitPrice ?? existing.unitPrice,
        discountAmount: body.data.discountAmount ?? existing.discountAmount ?? undefined,
      };
      return prisma.estimateLine.update({
        where: { id },
        data: { ...body.data, totalPrice: computeTotal(merged) },
      });
    }
  );

  fastify.delete(
    "/api/estimate-lines/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("set_estimate")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.estimateLine.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Estimate line not found." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id: existing.jobcardId } });
      if (jobCard) await recordAmendmentIfPast(jobCard, "Estimate", request.currentUser!.name, "Estimate line item removed");
      await prisma.estimateLine.delete({ where: { id } });
      return { ok: true };
    }
  );
}
