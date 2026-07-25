import { prisma } from "../src/lib/prisma.js";

// Run on the server: npx tsx scripts/create-branch.ts "<name>" "<city>"
// One-off bootstrap for when the Branch table is empty -- there's no
// "Add Branch" UI yet, so this is the only way to create the first one.
async function main() {
  const [name, city] = process.argv.slice(2);
  if (!name || !city) {
    console.error('Usage: npx tsx scripts/create-branch.ts "<name>" "<city>"');
    process.exit(1);
  }

  const branch = await prisma.branch.create({ data: { name, city } });
  console.log(`Created branch "${branch.name}" (${branch.city}), id: ${branch.id}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
