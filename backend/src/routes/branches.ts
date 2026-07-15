import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export default async function branchRoutes(fastify: FastifyInstance) {
  fastify.get("/api/branches", { preHandler: fastify.authenticate }, async () => {
    return prisma.branch.findMany({ orderBy: { name: "asc" } });
  });
}
