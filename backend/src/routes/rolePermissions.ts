import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ALL_ACTIONS, DEFAULT_ACTION_ROLES, type DemoAction } from "../lib/permissions.js";

const ALL_ROLES = ["front_desk", "technician", "supervisor", "manager", "admin"] as const;

export default async function rolePermissionRoutes(fastify: FastifyInstance) {
  // Readable by any authenticated user (not just admins) -- every logged-in
  // user's frontend needs the effective permission table to know what UI to
  // show them, matching what requirePermission() actually enforces.
  fastify.get("/api/role-permissions", { preHandler: fastify.authenticate }, async () => {
    const rows = await prisma.rolePermission.findMany();
    const byAction = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!byAction.has(row.action)) byAction.set(row.action, []);
      byAction.get(row.action)!.push(row);
    }
    return ALL_ACTIONS.map((action) => {
      const actionRows = byAction.get(action) ?? [];
      const roles = actionRows.length > 0
        ? actionRows.filter((r) => r.allowed).map((r) => r.role)
        : DEFAULT_ACTION_ROLES[action];
      return { action, roles };
    });
  });

  fastify.patch(
    "/api/role-permissions",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_settings")] },
    async (request, reply) => {
      const body = z.object({ action: z.string(), role: z.enum(ALL_ROLES), allowed: z.boolean() }).safeParse(request.body);
      if (!body.success) return reply.code(400).send({ ok: false, message: "Invalid input." });
      const { action, role, allowed } = body.data;
      if (!ALL_ACTIONS.includes(action as DemoAction)) return reply.code(400).send({ ok: false, message: "Unknown action." });
      if (role === "admin" && !allowed) return reply.code(400).send({ ok: false, message: "Admin must always retain access." });

      const existingCount = await prisma.rolePermission.count({ where: { action } });
      if (existingCount === 0) {
        // First edit for this action: materialize every role's current
        // default as an explicit row. Without this, the other roles' access
        // would silently change too, since requirePermission() switches from
        // "use defaults" to "use only the rows present" the moment any row
        // exists for an action.
        const defaults = DEFAULT_ACTION_ROLES[action as DemoAction];
        await prisma.rolePermission.createMany({
          data: ALL_ROLES.map((r) => ({ action, role: r, allowed: defaults.includes(r) })),
          skipDuplicates: true,
        });
      }

      await prisma.rolePermission.upsert({
        where: { action_role: { action, role } },
        create: { action, role, allowed },
        update: { allowed },
      });
      return { ok: true };
    }
  );

  fastify.post(
    "/api/role-permissions/reset",
    { preHandler: [fastify.authenticate, fastify.requirePermission("manage_settings")] },
    async () => {
      await prisma.rolePermission.deleteMany({});
      return { ok: true };
    }
  );
}
