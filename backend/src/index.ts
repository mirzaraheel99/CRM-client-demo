import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import authenticatePlugin from "./plugins/authenticate.js";
import authRoutes from "./routes/auth.js";
import branchRoutes from "./routes/branches.js";
import customerRoutes from "./routes/customers.js";
import brandRoutes from "./routes/brands.js";
import technicianRoutes from "./routes/technicians.js";
import applianceRoutes from "./routes/appliances.js";
import serviceOrderRoutes from "./routes/serviceOrders.js";
import jobCardRoutes from "./routes/jobcards.js";
import removedPartRoutes from "./routes/removedParts.js";
import licenseRoutes from "./routes/license.js";
import { checkLicense } from "./lib/license.js";

const fastify = Fastify({ logger: true });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set.");
}

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") ?? true,
});
await fastify.register(jwt, { secret: JWT_SECRET });
await fastify.register(authenticatePlugin);

const LICENSE_EXEMPT_PATHS = ["/api/license/status", "/api/health"];
fastify.addHook("onRequest", async (request, reply) => {
  if (LICENSE_EXEMPT_PATHS.some((path) => request.url.startsWith(path))) return;
  const status = checkLicense();
  if (!status.valid) {
    reply.code(402).send({ ok: false, message: `License invalid: ${status.reason}`, license: status });
  }
});

await fastify.register(licenseRoutes);
await fastify.register(authRoutes);
await fastify.register(branchRoutes);
await fastify.register(customerRoutes);
await fastify.register(brandRoutes);
await fastify.register(technicianRoutes);
await fastify.register(applianceRoutes);
await fastify.register(serviceOrderRoutes);
await fastify.register(jobCardRoutes);
await fastify.register(removedPartRoutes);

fastify.get("/api/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
fastify
  .listen({ port, host: process.env.HOST ?? "127.0.0.1" })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });
