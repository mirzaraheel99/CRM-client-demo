import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextApplianceDocumentNo } from "../lib/documentNo.js";
import { computeWarrantyStatus } from "../lib/warranty.js";
import { resolveBranchScope } from "../lib/branchScope.js";

const applianceSchema = z.object({
  brandId: z.string().min(1),
  branchId: z.string().min(1),
  category: z.string().min(1),
  model: z.string().min(1),
  modelAr: z.string().optional(),
  // Not enforced server-side -- whether it's mandatory is an admin-editable
  // toggle on the frontend (Settings > Required Fields); the backend accepts
  // either way, same as every other non-locked appliance field.
  serialNo: z.string().optional(),
  imeiNo: z.string().optional(),
  purchaseDate: z.string(),
  isSmartConnected: z.boolean().default(false),
  purchaseInvoiceNo: z.string().optional(),
  retailerName: z.string().optional(),
  purchasePrice: z.number().optional(),
  amcActive: z.boolean().optional(),
  amcExpiryDate: z.string().optional(),
  sasoCertNo: z.string().optional(),
  energyRating: z.number().int().min(1).max(5).optional(),
  countryOfManufacture: z.string().optional(),
  color: z.string().optional(),
  specification: z.string().optional(),
  installationDate: z.string().optional(),
  installedLocation: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

export default async function applianceRoutes(fastify: FastifyInstance) {
  // warrantyStatus is stored as a snapshot (see create/update below) but never
  // recomputes on its own, so a unit registered as "In Warranty" would stay
  // labeled that way forever if nobody happened to re-save the record after
  // the manufacturer window lapsed. Every read recomputes it live instead.
  fastify.get("/api/appliances", { preHandler: fastify.authenticate }, async (request) => {
    const { branchId } = request.query as { branchId?: string };
    const scope = resolveBranchScope(request, branchId);
    const appliances = await prisma.appliance.findMany({
      where: scope ? { OR: [{ branchId: scope }, { branchId: null }] } : undefined,
      orderBy: { id: "desc" },
      include: { brand: true },
    });
    return appliances.map((appliance) => ({
      ...appliance,
      serialNo: appliance.serialNo ?? "",
      warrantyStatus: computeWarrantyStatus(appliance.purchaseDate, appliance.brand.warrantyMonths),
    }));
  });

  fastify.get("/api/appliances/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const appliance = await prisma.appliance.findUnique({ where: { id }, include: { brand: true, telemetry: true } });
    if (!appliance) return reply.code(404).send({ ok: false, message: "Product not found." });
    const scope = resolveBranchScope(request);
    if (scope && appliance.branchId && appliance.branchId !== scope) {
      return reply.code(404).send({ ok: false, message: "Product not found." });
    }
    return {
      ...appliance,
      serialNo: appliance.serialNo ?? "",
      warrantyStatus: computeWarrantyStatus(appliance.purchaseDate, appliance.brand.warrantyMonths),
    };
  });

  fastify.post(
    "/api/appliances",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_appliance")] },
    async (request, reply) => {
      const parsed = applianceSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const input = parsed.data;

      const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
      if (!brand) return reply.code(400).send({ ok: false, message: "Choose a valid brand." });

      const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
      if (!branch) return reply.code(400).send({ ok: false, message: "Choose a valid branch." });

      const documentNo = await nextApplianceDocumentNo();
      const warrantyStatus = computeWarrantyStatus(input.purchaseDate, brand.warrantyMonths);

      const appliance = await prisma.appliance.create({
        data: {
          documentNo,
          brandId: input.brandId,
          branchId: input.branchId,
          category: input.category,
          model: input.model,
          modelAr: input.modelAr,
          serialNo: input.serialNo,
          imeiNo: input.imeiNo,
          purchaseDate: new Date(input.purchaseDate),
          warrantyStatus,
          isSmartConnected: input.isSmartConnected,
          purchaseInvoiceNo: input.purchaseInvoiceNo,
          retailerName: input.retailerName,
          purchasePrice: input.purchasePrice,
          amcActive: input.amcActive,
          amcExpiryDate: input.amcExpiryDate ? new Date(input.amcExpiryDate) : undefined,
          sasoCertNo: input.sasoCertNo,
          energyRating: input.energyRating,
          countryOfManufacture: input.countryOfManufacture,
          color: input.color,
          specification: input.specification,
          installationDate: input.installationDate ? new Date(input.installationDate) : undefined,
          installedLocation: input.installedLocation,
          photoUrl: input.photoUrl,
          notes: input.notes,
        },
      });
      return { ...appliance, serialNo: appliance.serialNo ?? "" };
    }
  );

  fastify.patch(
    "/api/appliances/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_appliance")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.appliance.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Product not found." });

      const parsed = applianceSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const input = parsed.data;

      let brand = input.brandId ? await prisma.brand.findUnique({ where: { id: input.brandId } }) : null;
      if (input.brandId && !brand) return reply.code(400).send({ ok: false, message: "Choose a valid brand." });
      if (!brand) brand = await prisma.brand.findUnique({ where: { id: existing.brandId } });

      if (input.branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
        if (!branch) return reply.code(400).send({ ok: false, message: "Choose a valid branch." });
      }

      const purchaseDate = input.purchaseDate ?? existing.purchaseDate.toISOString();
      const warrantyStatus = brand ? computeWarrantyStatus(purchaseDate, brand.warrantyMonths) : existing.warrantyStatus;

      const appliance = await prisma.appliance.update({
        where: { id },
        data: {
          ...input,
          warrantyStatus,
          purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
          amcExpiryDate: input.amcExpiryDate ? new Date(input.amcExpiryDate) : undefined,
          installationDate: input.installationDate ? new Date(input.installationDate) : undefined,
        },
      });
      return { ...appliance, serialNo: appliance.serialNo ?? "" };
    }
  );

  fastify.delete(
    "/api/appliances/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_appliance")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const appliance = await prisma.appliance.findUnique({ where: { id } });
      if (!appliance) return reply.code(404).send({ ok: false, message: "Product not found." });

      const jobCount = await prisma.jobCard.count({ where: { applianceId: id } });
      if (jobCount > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${jobCount} job card${jobCount === 1 ? "" : "s"} reference this product.` });

      await prisma.applianceTelemetry.deleteMany({ where: { applianceId: id } });
      await prisma.appliance.delete({ where: { id } });
      return { ok: true };
    }
  );
}
