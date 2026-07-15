import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/api/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, message: "Username and password are required." });
    }
    const { username, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (!user) {
      return reply.code(401).send({ ok: false, message: "Incorrect username or password." });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ ok: false, message: "Incorrect username or password." });
    }
    const token = fastify.jwt.sign(
      { sub: user.id, role: user.role, branchId: user.branchId, name: user.name },
      { expiresIn: "12h" }
    );
    return reply.send({
      ok: true,
      message: `Welcome back, ${user.name}.`,
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role, branchId: user.branchId },
    });
  });

  fastify.get("/api/auth/me", { preHandler: fastify.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.currentUser!.id } });
    if (!user) return reply.code(404).send({ ok: false, message: "User not found." });
    return reply.send({ id: user.id, name: user.name, username: user.username, role: user.role, branchId: user.branchId });
  });
}
