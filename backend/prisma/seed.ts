import { PrismaClient, type ApplianceCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ACTION_ROLES, ALL_ACTIONS } from "../src/lib/permissions.js";
import { nextCustomerDocumentNo, nextApplianceDocumentNo, nextServiceOrderDocumentNo } from "../src/lib/documentNo.js";
import { nextStageRefNo } from "../src/lib/stageRefNo.js";

const prisma = new PrismaClient();

async function main() {
  const branches = await Promise.all(
    [
      { name: "Riyadh Service Center", city: "Riyadh" },
      { name: "Jeddah Branch", city: "Jeddah" },
      { name: "Dammam Branch", city: "Dammam" },
    ].map((b) => prisma.branch.create({ data: b }))
  );
  const [riyadh, jeddah, dammam] = branches;

  const demoUsers = [
    { name: "Abdullah Al-Faisal", username: "admin", role: "admin" as const, branchId: riyadh.id },
    { name: "Sara Al-Qahtani", username: "manager", role: "manager" as const, branchId: riyadh.id },
    { name: "Khalid Al-Harbi", username: "supervisor", role: "supervisor" as const, branchId: jeddah.id },
    { name: "Tariq Al-Dosari", username: "technician", role: "technician" as const, branchId: dammam.id },
    { name: "Noura Al-Shehri", username: "frontdesk", role: "front_desk" as const, branchId: riyadh.id },
  ];
  const passwordHash = await bcrypt.hash("demo123", 10);
  for (const u of demoUsers) {
    await prisma.user.create({ data: { ...u, passwordHash } });
  }

  for (const action of ALL_ACTIONS) {
    for (const role of DEFAULT_ACTION_ROLES[action]) {
      await prisma.rolePermission.create({ data: { action, role, allowed: true } });
    }
  }

  const brands = await Promise.all(
    [
      { name: "Samsung", warrantyMonths: 12, rules: "Standard 12-month manufacturer warranty from purchase date; OEM claim required for parts over SAR 200." },
      { name: "LG", warrantyMonths: 24, rules: "24-month warranty on compressors/inverters, 12-month on general parts." },
      { name: "Daikin", warrantyMonths: 12, rules: "12-month warranty; requires original AC unit invoice and installation certificate." },
      { name: "Apple", warrantyMonths: 12, rules: "12-month limited warranty; IMEI must match Apple GSX record." },
      { name: "Whirlpool", warrantyMonths: 12, rules: "12-month warranty on all major appliances." },
      { name: "Sony", warrantyMonths: 12, rules: "12-month warranty; panel replacements require regional OEM approval." },
    ].map((b) => prisma.brand.create({ data: b }))
  );
  const [samsung] = brands;

  const technicianSeeds: { name: string; phone: string; skills: ApplianceCategory[]; zone: string; branchId: string }[] = [
    { name: "Tariq Al-Dosari", phone: "0501234567", skills: ["AC", "Refrigerator"], zone: "North Riyadh", branchId: riyadh.id },
    { name: "Bilal Al-Mutairi", phone: "0502345678", skills: ["Washer", "Microwave"], zone: "Jeddah Central", branchId: jeddah.id },
    { name: "Salem Al-Amri", phone: "0503456789", skills: ["Mobile", "TV"], zone: "Dammam Corniche", branchId: dammam.id },
  ];
  const technicians = await Promise.all(technicianSeeds.map((t) => prisma.technician.create({ data: t })));
  const [tech1] = technicians;

  const customerDoc = await nextCustomerDocumentNo();
  const customer = await prisma.customer.create({
    data: {
      documentNo: customerDoc,
      firstName: "Ahmed",
      fatherName: "Mohammed",
      familyName: "Al-Ghamdi",
      name: "Ahmed Mohammed Al-Ghamdi",
      phone: "0551112233",
      whatsapp: "0551112233",
      nationality: "Saudi",
      branchId: riyadh.id,
    },
  });

  const applianceDoc = await nextApplianceDocumentNo();
  const appliance = await prisma.appliance.create({
    data: {
      documentNo: applianceDoc,
      brandId: samsung.id,
      category: "AC",
      model: "AR18",
      serialNo: "SN-DEMO-0001",
      purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200),
      warrantyStatus: "In Warranty",
    },
  });

  const serviceOrderDoc = await nextServiceOrderDocumentNo();
  const serviceOrder = await prisma.serviceOrder.create({
    data: { documentNo: serviceOrderDoc, customerId: customer.id, branchId: riyadh.id, requestSource: "phone" },
  });

  const jobCard = await prisma.jobCard.create({
    data: {
      serviceOrderId: serviceOrder.id,
      sequenceNo: 1,
      documentNo: `${serviceOrderDoc}-01`,
      invoiceNo: `INV-${serviceOrderDoc}-01`,
      customerId: customer.id,
      applianceId: appliance.id,
      technicianId: tech1.id,
      branchId: riyadh.id,
      jobType: "warranty",
      status: "Received",
      currentStage: "Received",
      problemDescription: "AC unit not cooling; compressor noise reported.",
    },
  });

  const stageRefNo = await nextStageRefNo(
    (stageName) => prisma.jobCardStageHistory.count({ where: { stageName } }),
    "Received"
  );
  await prisma.jobCardStageHistory.create({
    data: {
      jobcardId: jobCard.id,
      stageName: "Received",
      changedBy: "Noura Al-Shehri",
      notes: "Product received at counter.",
      stageRefNo,
    },
  });

  console.log("Seed complete.");
  console.log(`Demo users (password: demo123): ${demoUsers.map((u) => u.username).join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
