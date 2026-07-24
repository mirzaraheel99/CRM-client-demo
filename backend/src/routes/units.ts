import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const unitSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  code: z.string().optional(),
  unitType: z.enum(["Base", "Alternate"]).optional(),
  roundingType: z.string().optional(),
  decimalPlaces: z.number().int().min(0).max(6).optional(),
  baseUnitName: z.string().optional(),
  conversionFactor: z.number().positive().optional(),
});

export default async function unitRoutes(fastify: FastifyInstance) {
  fastify.get("/api/units", { preHandler: fastify.authenticate }, async () => {
    return prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/units",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_unit")] },
    async (request, reply) => {
      const parsed = unitSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const existing = await prisma.unitOfMeasure.findUnique({ where: { name: parsed.data.name } });
      if (existing) return reply.code(400).send({ ok: false, message: "A unit with this name already exists." });
      if (parsed.data.unitType === "Alternate" && !parsed.data.baseUnitName) {
        return reply.code(400).send({ ok: false, message: "Alternate units need a base unit to convert to." });
      }
      return prisma.unitOfMeasure.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/units/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_unit")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Unit not found." });

      const parsed = unitSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.unitOfMeasure.update({ where: { id }, data: parsed.data });
    }
  );

  fastify.delete(
    "/api/units/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_unit")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const unit = await prisma.unitOfMeasure.findUnique({ where: { id } });
      if (!unit) return reply.code(404).send({ ok: false, message: "Unit not found." });

      const inUse = await prisma.unitOfMeasure.count({ where: { baseUnitName: unit.name } });
      if (inUse > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${inUse} other unit${inUse === 1 ? "" : "s"} convert against this one.` });

      await prisma.unitOfMeasure.delete({ where: { id } });
      return { ok: true };
    }
  );
}
