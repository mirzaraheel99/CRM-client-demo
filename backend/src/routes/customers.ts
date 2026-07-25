import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextCustomerDocumentNo } from "../lib/documentNo.js";

const customerBaseSchema = z.object({
  firstName: z.string().optional(),
  fatherName: z.string().optional(),
  grandfatherName: z.string().optional(),
  familyName: z.string().optional(),
  firstNameAr: z.string().optional(),
  fatherNameAr: z.string().optional(),
  grandfatherNameAr: z.string().optional(),
  familyNameAr: z.string().optional(),
  phone: z.string().min(1),
  homePhone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  nationalId: z.string().optional(),
  nationality: z.string().optional(),
  preferredLanguage: z.enum(["ar", "en"]).optional(),
  customerType: z.enum(["individual", "corporate"]).default("individual"),
  companyName: z.string().optional(),
  crNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  contactPersonName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  notes: z.string().optional(),
  branchId: z.string().min(1),
  zone: z.string().optional(),
});

const customerSchema = customerBaseSchema
  .superRefine((input, ctx) => {
    if (input.customerType === "corporate") {
      if (!input.companyName?.trim()) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Company name is required for corporate customers." });
      if (!input.crNumber?.trim()) ctx.addIssue({ code: "custom", path: ["crNumber"], message: "CR number is required for corporate customers." });
      if (!input.vatNumber?.trim()) ctx.addIssue({ code: "custom", path: ["vatNumber"], message: "VAT registration number is required for corporate customers." });
    } else {
      if (!input.firstName?.trim()) ctx.addIssue({ code: "custom", path: ["firstName"], message: "First name is required." });
      if (!input.familyName?.trim()) ctx.addIssue({ code: "custom", path: ["familyName"], message: "Family name is required." });
    }
  });

export default async function customerRoutes(fastify: FastifyInstance) {
  fastify.get("/api/customers", { preHandler: fastify.authenticate }, async () => {
    return prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
  });

  fastify.get("/api/customers/:id", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return reply.code(404).send({ ok: false, message: "Customer not found." });
    return customer;
  });

  fastify.post(
    "/api/customers",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_customer")] },
    async (request, reply) => {
      const parsed = customerSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const input = parsed.data;

      const existing = await prisma.customer.findFirst({ where: { phone: input.phone } });
      if (existing) return reply.send(existing);

      const isCorporate = input.customerType === "corporate";
      const name = isCorporate
        ? input.companyName!.trim()
        : [input.firstName, input.fatherName, input.grandfatherName, input.familyName].filter((p) => p?.trim()).join(" ");
      const arabicParts = [input.firstNameAr, input.fatherNameAr, input.grandfatherNameAr, input.familyNameAr].filter((p) => p?.trim());
      const nameAr = !isCorporate && arabicParts.length ? arabicParts.join(" ") : undefined;
      const documentNo = await nextCustomerDocumentNo();

      const customer = await prisma.customer.create({
        data: {
          documentNo,
          firstName: isCorporate ? undefined : input.firstName,
          fatherName: isCorporate ? undefined : input.fatherName,
          grandfatherName: isCorporate ? undefined : input.grandfatherName,
          familyName: isCorporate ? undefined : input.familyName,
          name,
          firstNameAr: isCorporate ? undefined : input.firstNameAr,
          fatherNameAr: isCorporate ? undefined : input.fatherNameAr,
          grandfatherNameAr: isCorporate ? undefined : input.grandfatherNameAr,
          familyNameAr: isCorporate ? undefined : input.familyNameAr,
          nameAr,
          phone: input.phone,
          homePhone: input.homePhone,
          whatsapp: input.whatsapp?.trim() || input.phone,
          email: input.email,
          address: input.address,
          nationalId: isCorporate ? undefined : input.nationalId,
          nationality: isCorporate ? undefined : input.nationality,
          preferredLanguage: input.preferredLanguage,
          customerType: input.customerType,
          companyName: isCorporate ? input.companyName : undefined,
          crNumber: isCorporate ? input.crNumber : undefined,
          vatNumber: isCorporate ? input.vatNumber : undefined,
          contactPersonName: isCorporate ? input.contactPersonName : undefined,
          dateOfBirth: isCorporate ? undefined : (input.dateOfBirth ? new Date(input.dateOfBirth) : undefined),
          gender: isCorporate ? undefined : input.gender,
          notes: input.notes,
          branchId: input.branchId,
          zone: input.zone,
        },
      });
      return customer;
    }
  );

  fastify.patch(
    "/api/customers/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_customer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.customer.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ ok: false, message: "Customer not found." });

      const parsed = customerBaseSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." });
      const input = parsed.data;
      const isCorporate = (input.customerType ?? existing.customerType) === "corporate";

      const merged = {
        firstName: input.firstName ?? existing.firstName ?? undefined,
        fatherName: input.fatherName ?? existing.fatherName ?? undefined,
        grandfatherName: input.grandfatherName ?? existing.grandfatherName ?? undefined,
        familyName: input.familyName ?? existing.familyName ?? undefined,
        firstNameAr: input.firstNameAr ?? existing.firstNameAr ?? undefined,
        fatherNameAr: input.fatherNameAr ?? existing.fatherNameAr ?? undefined,
        grandfatherNameAr: input.grandfatherNameAr ?? existing.grandfatherNameAr ?? undefined,
        familyNameAr: input.familyNameAr ?? existing.familyNameAr ?? undefined,
        companyName: input.companyName ?? existing.companyName ?? undefined,
      };
      const name = isCorporate
        ? (merged.companyName ?? "").trim()
        : [merged.firstName, merged.fatherName, merged.grandfatherName, merged.familyName].filter((p) => p?.trim()).join(" ");
      const arabicParts = [merged.firstNameAr, merged.fatherNameAr, merged.grandfatherNameAr, merged.familyNameAr].filter((p) => p?.trim());
      const nameAr = !isCorporate && arabicParts.length ? arabicParts.join(" ") : undefined;

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...input,
          firstName: isCorporate ? null : merged.firstName,
          fatherName: isCorporate ? null : merged.fatherName,
          grandfatherName: isCorporate ? null : merged.grandfatherName,
          familyName: isCorporate ? null : merged.familyName,
          firstNameAr: isCorporate ? null : merged.firstNameAr,
          fatherNameAr: isCorporate ? null : merged.fatherNameAr,
          grandfatherNameAr: isCorporate ? null : merged.grandfatherNameAr,
          familyNameAr: isCorporate ? null : merged.familyNameAr,
          companyName: isCorporate ? merged.companyName : null,
          crNumber: isCorporate ? (input.crNumber ?? existing.crNumber) : null,
          vatNumber: isCorporate ? (input.vatNumber ?? existing.vatNumber) : null,
          contactPersonName: isCorporate ? (input.contactPersonName ?? existing.contactPersonName) : null,
          nationalId: isCorporate ? null : (input.nationalId ?? existing.nationalId),
          nationality: isCorporate ? null : (input.nationality ?? existing.nationality),
          dateOfBirth: isCorporate ? null : (input.dateOfBirth ? new Date(input.dateOfBirth) : existing.dateOfBirth),
          gender: isCorporate ? null : (input.gender ?? existing.gender),
          name: name || existing.name,
          nameAr,
        },
      });
      return customer;
    }
  );

  fastify.delete(
    "/api/customers/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("create_customer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer) return reply.code(404).send({ ok: false, message: "Customer not found." });

      const jobCount = await prisma.jobCard.count({ where: { customerId: id } });
      if (jobCount > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${jobCount} job card${jobCount === 1 ? "" : "s"} reference this customer.` });
      const orderCount = await prisma.serviceOrder.count({ where: { customerId: id } });
      if (orderCount > 0) return reply.code(400).send({ ok: false, message: `Cannot delete: ${orderCount} service order${orderCount === 1 ? "" : "s"} reference this customer.` });

      await prisma.customer.delete({ where: { id } });
      return { ok: true };
    }
  );
}
