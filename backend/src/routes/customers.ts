import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextCustomerDocumentNo } from "../lib/documentNo.js";

const customerSchema = z.object({
  firstName: z.string().min(1),
  fatherName: z.string().min(1),
  grandfatherName: z.string().optional(),
  familyName: z.string().min(1),
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
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  notes: z.string().optional(),
  branchId: z.string().min(1),
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

      const name = [input.firstName, input.fatherName, input.grandfatherName, input.familyName].filter((p) => p?.trim()).join(" ");
      const arabicParts = [input.firstNameAr, input.fatherNameAr, input.grandfatherNameAr, input.familyNameAr].filter((p) => p?.trim());
      const nameAr = arabicParts.length ? arabicParts.join(" ") : undefined;
      const documentNo = await nextCustomerDocumentNo();

      const customer = await prisma.customer.create({
        data: {
          documentNo,
          firstName: input.firstName,
          fatherName: input.fatherName,
          grandfatherName: input.grandfatherName,
          familyName: input.familyName,
          name,
          firstNameAr: input.firstNameAr,
          fatherNameAr: input.fatherNameAr,
          grandfatherNameAr: input.grandfatherNameAr,
          familyNameAr: input.familyNameAr,
          nameAr,
          phone: input.phone,
          homePhone: input.homePhone,
          whatsapp: input.whatsapp?.trim() || input.phone,
          email: input.email,
          address: input.address,
          nationalId: input.nationalId,
          nationality: input.nationality,
          preferredLanguage: input.preferredLanguage,
          customerType: input.customerType,
          companyName: input.customerType === "corporate" ? input.companyName : undefined,
          crNumber: input.customerType === "corporate" ? input.crNumber : undefined,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          gender: input.gender,
          notes: input.notes,
          branchId: input.branchId,
        },
      });
      return customer;
    }
  );
}
