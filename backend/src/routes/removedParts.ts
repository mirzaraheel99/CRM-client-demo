import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export default async function removedPartRoutes(fastify: FastifyInstance) {
  // Cross-job custody dashboard: every removed part still owed back to a customer.
  fastify.get("/api/removed-parts", { preHandler: fastify.authenticate }, async (request) => {
    const { status } = request.query as { status?: string };
    return prisma.removedPart.findMany({
      where: { returnStatus: status || undefined },
      include: { jobCard: { include: { customer: true, appliance: true } } },
      orderBy: { removedAt: "desc" },
    });
  });

  fastify.get("/api/job-cards/:id/removed-parts", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.removedPart.findMany({ where: { jobcardId: id }, orderBy: { removedAt: "desc" } });
  });

  fastify.post(
    "/api/job-cards/:id/removed-parts",
    { preHandler: [fastify.authenticate, fastify.requirePermission("add_part")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ description: z.string().min(1), serialNo: z.string().optional() }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Describe the removed part." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      return prisma.removedPart.create({
        data: {
          jobcardId: id,
          description: body.data.description.trim(),
          serialNo: body.data.serialNo?.trim() || undefined,
          removedBy: request.currentUser!.name,
        },
      });
    }
  );

  fastify.patch(
    "/api/removed-parts/:id/notify",
    { preHandler: [fastify.authenticate, fastify.requirePermission("add_part")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const part = await prisma.removedPart.findUnique({ where: { id } });
      if (!part) return reply.code(404).send({ ok: false, message: "Removed part not found." });
      return prisma.removedPart.update({ where: { id }, data: { customerNotifiedAt: new Date() } });
    }
  );

  fastify.patch(
    "/api/removed-parts/:id/confirm-returned",
    { preHandler: [fastify.authenticate, fastify.requirePermission("add_part")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const part = await prisma.removedPart.findUnique({ where: { id } });
      if (!part) return reply.code(404).send({ ok: false, message: "Removed part not found." });
      if (part.returnStatus === "returned_to_customer") return reply.code(400).send({ ok: false, message: "Already confirmed as returned." });
      return prisma.removedPart.update({
        where: { id },
        data: { returnStatus: "returned_to_customer", returnConfirmedAt: new Date(), returnConfirmedBy: request.currentUser!.name },
      });
    }
  );
}
