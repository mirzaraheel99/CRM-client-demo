import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const itemSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.string().min(1),
  brand: z.string().min(1),
  partNo: z.string().min(1),
  unit: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const TXN_TYPES = ["receive", "issue", "return", "transfer", "adjust"] as const;

const txnSchema = z.object({
  itemId: z.string().min(1),
  locationId: z.string().min(1),
  jobcardId: z.string().optional(),
  type: z.enum(TXN_TYPES),
  qty: z.number().positive(),
  destLocationId: z.string().optional(),
  photoUrl: z.string().optional(),
});

// Locations are derived, not stored -- see the schema.prisma comment above
// the InventoryItem model for why.
async function listLocationIds(): Promise<Set<string>> {
  const [branches, technicians] = await Promise.all([
    prisma.branch.findMany({ select: { id: true } }),
    prisma.technician.findMany({ select: { id: true } }),
  ]);
  const ids = new Set<string>();
  for (const b of branches) ids.add(`store-${b.id}`);
  for (const t of technicians) ids.add(`van-${t.id}`);
  return ids;
}

export default async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.get("/api/inventory-locations", { preHandler: fastify.authenticate }, async () => {
    const [branches, technicians] = await Promise.all([
      prisma.branch.findMany(),
      prisma.technician.findMany(),
    ]);
    return [
      ...branches.map((b) => ({ id: `store-${b.id}`, name: `Main Store - ${b.city}`, type: "store" as const, branchId: b.id })),
      ...technicians.map((t) => ({ id: `van-${t.id}`, name: `${t.name.split(" ")[0]}'s Van`, type: "van" as const, branchId: t.branchId })),
    ];
  });

  fastify.get("/api/inventory-items", { preHandler: fastify.authenticate }, async () => {
    return prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
  });

  fastify.post(
    "/api/inventory-items",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_inventory")] },
    async (request, reply) => {
      const parsed = itemSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.inventoryItem.create({ data: parsed.data });
    }
  );

  fastify.patch(
    "/api/inventory-items/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_inventory")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Inventory item not found." });

      const parsed = itemSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      return prisma.inventoryItem.update({ where: { id }, data: parsed.data });
    }
  );

  fastify.delete(
    "/api/inventory-items/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_inventory")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) return reply.code(404).send({ ok: false, message: "Inventory item not found." });

      const stockRows = await prisma.inventoryStock.findMany({ where: { itemId: id } });
      const stockQty = stockRows.reduce((sum, s) => sum + s.qty, 0);
      if (stockQty > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${stockQty} unit${stockQty === 1 ? "" : "s"} of this item are still in stock.` });

      const txnCount = await prisma.inventoryTransaction.count({ where: { itemId: id } });
      if (txnCount > 0) return reply.code(400).send({ ok: false, message: "Cannot delete: this item has recorded stock transactions." });

      const usedInEstimates = await prisma.estimateLine.count({ where: { itemId: id } });
      if (usedInEstimates > 0) return reply.code(400).send({ ok: false, message: "Cannot delete: this item is referenced by a job card's estimate." });

      await prisma.inventoryItem.delete({ where: { id } });
      return { ok: true };
    }
  );

  fastify.get("/api/inventory-stock", { preHandler: fastify.authenticate }, async () => {
    return prisma.inventoryStock.findMany();
  });

  fastify.get("/api/inventory-transactions", { preHandler: fastify.authenticate }, async () => {
    return prisma.inventoryTransaction.findMany({ orderBy: { timestamp: "desc" } });
  });

  fastify.post(
    "/api/inventory-transactions",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_inventory")] },
    async (request, reply) => {
      const parsed = txnSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const input = parsed.data;

      const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
      if (!item) return reply.code(400).send({ ok: false, message: "Inventory item not found." });

      const locationIds = await listLocationIds();
      if (!locationIds.has(input.locationId)) return reply.code(400).send({ ok: false, message: "Inventory location not found." });
      if (input.type === "transfer") {
        if (!input.destLocationId || input.destLocationId === input.locationId) return reply.code(400).send({ ok: false, message: "Choose a different destination location." });
        if (!locationIds.has(input.destLocationId)) return reply.code(400).send({ ok: false, message: "Destination location not found." });
      }

      const sourceStock = await prisma.inventoryStock.findUnique({ where: { itemId_locationId: { itemId: input.itemId, locationId: input.locationId } } });
      const sourceQty = sourceStock?.qty ?? 0;
      if ((input.type === "issue" || input.type === "transfer") && sourceQty < input.qty) {
        return reply.code(400).send({ ok: false, message: `Only ${sourceQty} units are available at the source location.` });
      }

      const transaction = await prisma.$transaction(async (tx) => {
        const applyDelta = async (locationId: string, delta: number) => {
          await tx.inventoryStock.upsert({
            where: { itemId_locationId: { itemId: input.itemId, locationId } },
            create: { itemId: input.itemId, locationId, qty: delta },
            update: { qty: { increment: delta } },
          });
        };
        if (input.type === "receive" || input.type === "return" || input.type === "adjust") await applyDelta(input.locationId, input.qty);
        if (input.type === "issue") await applyDelta(input.locationId, -input.qty);
        if (input.type === "transfer" && input.destLocationId) {
          await applyDelta(input.locationId, -input.qty);
          await applyDelta(input.destLocationId, input.qty);
        }
        return tx.inventoryTransaction.create({
          data: {
            itemId: input.itemId,
            locationId: input.locationId,
            jobcardId: input.jobcardId,
            type: input.type,
            qty: input.qty,
            createdBy: request.currentUser!.name,
            destLocationId: input.destLocationId,
            photoUrl: input.photoUrl,
          },
        });
      });

      return { ok: true, transaction };
    }
  );
}
