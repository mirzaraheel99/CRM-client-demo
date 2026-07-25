import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const zoneSchema = z.object({
  name: z.string().min(1),
  branchId: z.string().min(1),
});

export default async function zoneRoutes(fastify: FastifyInstance) {
  fastify.get("/api/zones", { preHandler: fastify.authenticate }, async () => {
    return prisma.zone.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/zones",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_zone")] },
    async (request, reply) => {
      const parsed = zoneSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const existing = await prisma.zone.findFirst({ where: { branchId: parsed.data.branchId, name: parsed.data.name } });
      if (existing) return reply.code(400).send({ ok: false, message: "This zone already exists for that branch." });
      return prisma.zone.create({ data: parsed.data });
    }
  );

  // Renaming only -- a zone's branch is fixed after creation, since moving
  // it would mean silently reassigning every technician/customer already
  // using that zone name to a different branch.
  fastify.patch(
    "/api/zones/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_zone")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.zone.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Zone not found." });

      const parsed = z.object({ name: z.string().min(1) }).safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });

      const duplicate = await prisma.zone.findFirst({ where: { branchId: existing.branchId, name: parsed.data.name, NOT: { id } } });
      if (duplicate) return reply.code(400).send({ ok: false, message: "This zone already exists for that branch." });

      // Zones are soft-referenced by name from Technician.zone/Customer.zone,
      // so a rename here must cascade or those existing references orphan.
      if (parsed.data.name !== existing.name) {
        await prisma.$transaction([
          prisma.technician.updateMany({ where: { branchId: existing.branchId, zone: existing.name }, data: { zone: parsed.data.name } }),
          prisma.customer.updateMany({ where: { branchId: existing.branchId, zone: existing.name }, data: { zone: parsed.data.name } }),
        ]);
      }
      return prisma.zone.update({ where: { id }, data: { name: parsed.data.name } });
    }
  );

  fastify.delete(
    "/api/zones/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_zone")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const zone = await prisma.zone.findUnique({ where: { id } });
      if (!zone) return reply.code(404).send({ ok: false, message: "Zone not found." });

      const [technicianCount, customerCount] = await Promise.all([
        prisma.technician.count({ where: { branchId: zone.branchId, zone: zone.name } }),
        prisma.customer.count({ where: { branchId: zone.branchId, zone: zone.name } }),
      ]);
      const inUse = technicianCount + customerCount;
      if (inUse > 0) {
        const parts = [
          technicianCount && `${technicianCount} technician${technicianCount === 1 ? "" : "s"}`,
          customerCount && `${customerCount} customer${customerCount === 1 ? "" : "s"}`,
        ].filter(Boolean);
        return reply.code(400).send({ ok: false, message: `Cannot delete: ${parts.join(" and ")} still use this zone.` });
      }

      await prisma.zone.delete({ where: { id } });
      return { ok: true };
    }
  );
}
