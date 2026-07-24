import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const categorySchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  defaultWarrantyMonths: z.number().int().positive().optional(),
});

export default async function categoryRoutes(fastify: FastifyInstance) {
  fastify.get("/api/categories", { preHandler: fastify.authenticate }, async () => {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/categories",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_category")] },
    async (request, reply) => {
      const parsed = categorySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } });
      if (existing) return reply.code(400).send({ ok: false, message: "A category with this name already exists." });
      return prisma.category.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/categories/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_category")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Category not found." });

      const parsed = categorySchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.category.update({ where: { id }, data: parsed.data });
    }
  );

  fastify.delete(
    "/api/categories/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_category")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) return reply.code(404).send({ ok: false, message: "Category not found." });

      const inUse = await prisma.appliance.count({ where: { category: category.name } });
      if (inUse > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${inUse} product${inUse === 1 ? "" : "s"} still use this category.` });

      await prisma.category.delete({ where: { id } });
      return { ok: true };
    }
  );
}
