import type { FastifyInstance } from "fastify";
import { checkLicense } from "../lib/license.js";

export default async function licenseRoutes(fastify: FastifyInstance) {
  fastify.get("/api/license/status", async () => checkLicense());
}
