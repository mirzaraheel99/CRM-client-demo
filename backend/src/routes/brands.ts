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
}
