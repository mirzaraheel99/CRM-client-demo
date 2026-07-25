import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export default async function jobCardAttachmentRoutes(fastify: FastifyInstance) {
  // Cross-job view, mirroring /api/removed-parts, so the store can hydrate
  // every attachment in one call rather than one request per job card.
  fastify.get("/api/job-card-attachments", { preHandler: fastify.authenticate }, async () => {
    return prisma.jobCardAttachment.findMany({ orderBy: { timestamp: "desc" } });
  });

  fastify.get("/api/job-cards/:id/attachments", { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.jobCardAttachment.findMany({ where: { jobcardId: id }, orderBy: { timestamp: "desc" } });
  });

  fastify.post(
    "/api/job-cards/:id/attachments",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({ stageName: z.string().min(1), label: z.string().min(1), fileUrl: z.string().min(1), conditionNotes: z.string().optional() })
        .safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "A label and file are required." });
      const jobCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!jobCard) return reply.code(404).send({ ok: false, message: "Job card not found." });
      return prisma.jobCardAttachment.create({
        data: {
          jobcardId: id,
          stageName: body.data.stageName,
          label: body.data.label,
          fileUrl: body.data.fileUrl,
          conditionNotes: body.data.conditionNotes?.trim() || undefined,
          uploadedBy: request.currentUser!.name,
        },
      });
    }
  );

  fastify.delete("/api/job-card-attachments/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const attachment = await prisma.jobCardAttachment.findUnique({ where: { id } });
    if (!attachment) return reply.code(404).send({ ok: false, message: "Attachment not found." });
    await prisma.jobCardAttachment.delete({ where: { id } });
    return { ok: true, message: "Attachment removed." };
  });
}
