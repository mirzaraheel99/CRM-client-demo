import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const brandSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  warrantyMonths: z.number().int().positive(),
  rules: z.string().default(""),
});

export default async function brandRoutes(fastify: FastifyInstance) {
  fastify.get("/api/brands", { preHandler: fastify.authenticate }, async () => {
    return prisma.brand.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/brands",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_brand")] },
    async (request, reply) => {
      const parsed = brandSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.brand.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/brands/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_brand")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.brand.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Brand not found." });

      const parsed = brandSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.brand.update({ where: { id }, data: parsed.data });
    }
  );

  fastify.delete(
    "/api/brands/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_brand")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const brand = await prisma.brand.findUnique({ where: { id } });
      if (!brand) return reply.code(404).send({ ok: false, message: "Brand not found." });

      const inUse = await prisma.appliance.count({ where: { brandId: id } });
      if (inUse > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${inUse} product${inUse === 1 ? "" : "s"} still use this brand.` });

      await prisma.brand.delete({ where: { id } });
      return { ok: true };
    }
  );
}
