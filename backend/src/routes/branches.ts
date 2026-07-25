import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const branchSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
});

export default async function branchRoutes(fastify: FastifyInstance) {
  fastify.get("/api/branches", { preHandler: fastify.authenticate }, async () => {
    return prisma.branch.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/branches",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_branch")] },
    async (request, reply) => {
      const parsed = branchSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.branch.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/branches/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_branch")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.branch.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Branch not found." });

      const parsed = branchSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.branch.update({ where: { id }, data: parsed.data });
    }
  );

  fastify.delete(
    "/api/branches/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_branch")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const branch = await prisma.branch.findUnique({ where: { id } });
      if (!branch) return reply.code(404).send({ ok: false, message: "Branch not found." });

      const [customers, technicians, serviceOrders, jobCards, users] = await Promise.all([
        prisma.customer.count({ where: { branchId: id } }),
        prisma.technician.count({ where: { branchId: id } }),
        prisma.serviceOrder.count({ where: { branchId: id } }),
        prisma.jobCard.count({ where: { branchId: id } }),
        prisma.user.count({ where: { branchId: id } }),
      ]);
      const inUse = customers + technicians + serviceOrders + jobCards + users;
      if (inUse > 0) {
        const parts = [
          customers && `${customers} customer${customers === 1 ? "" : "s"}`,
          technicians && `${technicians} technician${technicians === 1 ? "" : "s"}`,
          serviceOrders && `${serviceOrders} service order${serviceOrders === 1 ? "" : "s"}`,
          jobCards && `${jobCards} job card${jobCards === 1 ? "" : "s"}`,
          users && `${users} staff login${users === 1 ? "" : "s"}`,
        ].filter(Boolean);
        return reply.code(400).send({ ok: false, message: `Cannot delete: this branch still has ${parts.join(", ")}.` });
      }

      await prisma.branch.delete({ where: { id } });
      return { ok: true };
    }
  );
}
