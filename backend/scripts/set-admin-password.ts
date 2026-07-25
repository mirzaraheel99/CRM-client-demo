import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

// Run on the server: npx tsx scripts/set-admin-password.ts <username> <new-password>
// Creates the user (against the first branch on record) if it doesn't exist
// yet, or resets its password if it does. Use this instead of relying on the
// seeded demo accounts once real staff are logging in.
async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: npx tsx scripts/set-admin-password.ts <username> <new-password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
    console.log(`Password reset for existing user "${existing.username}" (role: ${existing.role}).`);
    return;
  }

  const branch = await prisma.branch.findFirst();
  if (!branch) {
    console.error("No branch exists yet -- create one first (a User needs a branchId).");
    process.exit(1);
  }

  const user = await prisma.user.create({
    data: { name: "Admin", username: username.toLowerCase(), passwordHash, role: "admin", branchId: branch.id },
  });
  console.log(`Created admin user "${user.username}" in branch "${branch.name}".`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
