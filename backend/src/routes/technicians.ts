import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const technicianSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  phone: z.string().min(1),
  skills: z.array(z.string()).min(1),
  zone: z.string().min(1),
  branchId: z.string().min(1),
  status: z.enum(["Available", "On Job", "Off Duty"]).default("Available"),
  avatarColor: z.string().default("#2a78d6"),
  notes: z.string().optional(),
});

export default async function technicianRoutes(fastify: FastifyInstance) {
  fastify.get("/api/technicians", { preHandler: fastify.authenticate }, async () => {
    return prisma.technician.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/technicians",
    { preHandler: [fastify.authenticate, fastify.requirePermission("assign_technician")] },
    async (request, reply) => {
      const parsed = technicianSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.technician.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/technicians/:id/status",
    { preHandler: [fastify.authenticate, fastify.requirePermission("assign_technician")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ status: z.enum(["Available", "On Job", "Off Duty"]) }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid status." });
      return prisma.technician.update({ where: { id }, data: { status: body.data.status } });
    }
  );
}
