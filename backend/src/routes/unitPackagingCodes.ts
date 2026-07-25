import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const packagingCodeSchema = z.object({
  unitId: z.string().min(1),
  code: z.string().min(1),
  type: z.string().min(1),
  weight: z.number().nonnegative().optional(),
  count: z.number().int().positive().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
});

export default async function unitPackagingCodeRoutes(fastify: FastifyInstance) {
  fastify.get("/api/unit-packaging-codes", { preHandler: fastify.authenticate }, async () => {
    return prisma.unitPackagingCode.findMany({ orderBy: { createdAt: "asc" } });
  });

  fastify.post(
    "/api/unit-packaging-codes",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_unit")] },
    async (request, reply) => {
      const parsed = packagingCodeSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const unit = await prisma.unitOfMeasure.findUnique({ where: { id: parsed.data.unitId } });
      if (!unit) return reply.code(404).send({ ok: false, message: "Unit not found." });
      return prisma.unitPackagingCode.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/unit-packaging-codes/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_unit")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.unitPackagingCode.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Packaging code not found." });

      const parsed = packagingCodeSchema.omit({ unitId: true }).partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.unitPackagingCode.update({ where: { id }, data: parsed.data });
    }
  );

  fastify.delete(
    "/api/unit-packaging-codes/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_unit")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.unitPackagingCode.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Packaging code not found." });
      await prisma.unitPackagingCode.delete({ where: { id } });
      return { ok: true };
    }
  );
}
