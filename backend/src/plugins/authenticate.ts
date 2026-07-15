import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { DEFAULT_ACTION_ROLES, type DemoAction } from "../lib/permissions.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (action: DemoAction) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    currentUser?: { id: string; role: Role; branchId: string; name: string };
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<{ sub: string; role: Role; branchId: string; name: string }>();
      request.currentUser = { id: payload.sub, role: payload.role, branchId: payload.branchId, name: payload.name };
    } catch {
      reply.code(401).send({ ok: false, message: "Not authenticated." });
    }
  });

  fastify.decorate("requirePermission", (action: DemoAction) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.currentUser) {
        reply.code(401).send({ ok: false, message: "Not authenticated." });
        return;
      }
      const rows = await prisma.rolePermission.findMany({ where: { action } });
      const allowedRoles = rows.length > 0 ? rows.filter((r) => r.allowed).map((r) => r.role) : DEFAULT_ACTION_ROLES[action];
      if (!allowedRoles.includes(request.currentUser.role)) {
        reply.code(403).send({ ok: false, message: "Your role cannot perform this action." });
      }
    };
  });
});
