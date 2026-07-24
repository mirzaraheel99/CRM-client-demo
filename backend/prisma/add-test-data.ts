import { PrismaClient } from "@prisma/client";
import { nextCustomerDocumentNo, nextApplianceDocumentNo, nextServiceOrderDocumentNo } from "../src/lib/documentNo.js";
import { nextStageRefNo } from "../src/lib/stageRefNo.js";

// Additive test-data script — safe to run against an already-seeded database.
// Unlike prisma/seed.ts (which creates branches/users and fails on a second
// run), this only reads existing branches/technicians/brands and appends a
// handful of new customers + job cards spread across every workflow stage,
// including ones with real estimate line items, so the app has enough data
// to click through and test the workflow/estimate features end to end.

const prisma = new PrismaClient();

async function stageHistory(jobcardId: string, stageName: string, changedBy: string, notes: string) {
  const stageRefNo = await nextStageRefNo((s) => prisma.jobCardStageHistory.count({ where: { stageName: s } }), stageName);
  await prisma.jobCardStageHistory.create({ data: { jobcardId, stageName, changedBy, notes, stageRefNo } });
}

async function main() {
  const branches = await prisma.branch.findMany();
  if (branches.length === 0) throw new Error("No branches found — run `npm run seed` first.");
  const technicians = await prisma.technician.findMany();
  const brands = await prisma.brand.findMany();
  if (technicians.length === 0 || brands.length === 0) throw new Error("No technicians/brands found — run `npm run seed` first.");

  const cases: {
    customerName: string; phone: string; category: string; brandName: string; model: string;
    jobType: "warranty" | "non_warranty"; problem: string; stage: string; status: string;
    diagnosisNotes?: string; estimateLines?: { kind: string; label: string; qty: number; unitPrice: number }[];
    customerApproved?: boolean; qaApproved?: boolean; assetHandedOver?: boolean;
  }[] = [
    {
      customerName: "Fahad Al-Zahrani", phone: "0561112201", category: "Washer", brandName: "Whirlpool", model: "WFW5620",
      jobType: "non_warranty", problem: "Washer not spinning, loud grinding noise.", stage: "Diagnosis", status: "In Diagnosis",
      diagnosisNotes: "Drive belt worn and motor coupling cracked; replacement required.",
    },
    {
      customerName: "Lama Al-Otaibi", phone: "0561112202", category: "Refrigerator", brandName: "LG", model: "GR-B247",
      jobType: "non_warranty", problem: "Fridge not cooling properly, ice buildup in freezer.", stage: "Estimate", status: "Waiting Approval",
      diagnosisNotes: "Defrost heater failed; evaporator coil iced over.",
      estimateLines: [
        { kind: "labor", label: "Diagnostic + defrost system repair labor", qty: 1, unitPrice: 150 },
        { kind: "part", label: "Defrost heater assembly", qty: 1, unitPrice: 220 },
      ],
    },
    {
      customerName: "Yousef Al-Ghamdi", phone: "0561112203", category: "AC", brandName: "Daikin", model: "FTKF50",
      jobType: "non_warranty", problem: "AC blowing warm air.", stage: "Customer Approval", status: "Waiting Approval",
      diagnosisNotes: "Refrigerant leak at outdoor unit valve; requires gas recharge and valve seal.",
      estimateLines: [
        { kind: "labor", label: "Leak repair + gas recharge labor", qty: 1, unitPrice: 200 },
        { kind: "part", label: "R32 refrigerant (per kg)", qty: 2, unitPrice: 90 },
        { kind: "part", label: "Valve seal kit", qty: 1, unitPrice: 60 },
      ],
      customerApproved: true,
    },
    {
      customerName: "Reem Al-Harbi", phone: "0561112204", category: "TV", brandName: "Sony", model: "XR-55A80L",
      jobType: "non_warranty", problem: "TV screen has vertical lines and flickers.", stage: "Repair", status: "In Repair",
      diagnosisNotes: "T-CON board faulty; needs replacement.",
      estimateLines: [
        { kind: "labor", label: "Panel diagnostics + T-CON replacement labor", qty: 1, unitPrice: 180 },
        { kind: "part", label: "T-CON board", qty: 1, unitPrice: 340 },
      ],
      customerApproved: true,
    },
    {
      customerName: "Omar Al-Subaie", phone: "0561112205", category: "Mobile", brandName: "Apple", model: "iPhone 14",
      jobType: "warranty", problem: "Battery drains fast, phone restarts randomly.", stage: "QA", status: "QA",
      diagnosisNotes: "Battery health degraded below threshold; replaced under warranty.",
      qaApproved: true,
    },
    {
      customerName: "Haya Al-Malki", phone: "0561112206", category: "Microwave", brandName: "Samsung", model: "MS23K",
      jobType: "non_warranty", problem: "Microwave not heating.", stage: "Ready for Handover", status: "Ready",
      diagnosisNotes: "Magnetron failed; replaced.",
      estimateLines: [{ kind: "part", label: "Magnetron", qty: 1, unitPrice: 130 }],
      customerApproved: true, qaApproved: true, assetHandedOver: true,
    },
    {
      customerName: "Nasser Al-Qahtani", phone: "0561112207", category: "Refrigerator", brandName: "Whirlpool", model: "WRF555",
      jobType: "warranty", problem: "Water dispenser leaking.", stage: "Delivered", status: "Delivered",
      diagnosisNotes: "Dispenser valve replaced under warranty.",
      qaApproved: true, assetHandedOver: true,
    },
  ];

  let i = 0;
  for (const c of cases) {
    const branch = branches[i % branches.length];
    const technician = technicians[i % technicians.length];
    const brand = brands.find((b) => b.name === c.brandName) ?? brands[0];
    i++;

    const customerDoc = await nextCustomerDocumentNo();
    const [firstName, fatherName, ...rest] = c.customerName.split(" ");
    const customer = await prisma.customer.create({
      data: {
        documentNo: customerDoc, firstName, fatherName: fatherName ?? "", familyName: rest.join(" ") || fatherName || firstName, name: c.customerName,
        phone: c.phone, whatsapp: c.phone, nationality: "Saudi", branchId: branch.id,
      },
    });

    const applianceDoc = await nextApplianceDocumentNo();
    const appliance = await prisma.appliance.create({
      data: {
        documentNo: applianceDoc, brandId: brand.id, category: c.category, model: c.model,
        serialNo: `SN-TEST-${applianceDoc}`, purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150),
        warrantyStatus: c.jobType === "warranty" ? "In Warranty" : "Out of Warranty",
      },
    });

    const serviceOrderDoc = await nextServiceOrderDocumentNo();
    const serviceOrder = await prisma.serviceOrder.create({
      data: { documentNo: serviceOrderDoc, customerId: customer.id, branchId: branch.id, requestSource: "phone" },
    });

    const jobCard = await prisma.jobCard.create({
      data: {
        serviceOrderId: serviceOrder.id, sequenceNo: 1, documentNo: `${serviceOrderDoc}-01`, invoiceNo: `INV-${serviceOrderDoc}-01`,
        customerId: customer.id, applianceId: appliance.id, technicianId: technician.id, branchId: branch.id,
        jobType: c.jobType, status: c.status, currentStage: c.stage, problemDescription: c.problem,
        diagnosisNotes: c.diagnosisNotes, customerApproved: c.customerApproved ?? null, qaApproved: c.qaApproved ?? false,
        assetHandedOver: c.assetHandedOver ?? false, assetHandedOverAt: c.assetHandedOver ? new Date() : undefined,
        assetHandedOverBy: c.assetHandedOver ? "Noura Al-Shehri" : undefined,
      },
    });

    await stageHistory(jobCard.id, "Received", "Noura Al-Shehri", "Product received at counter.");
    if (c.diagnosisNotes) await stageHistory(jobCard.id, "Diagnosis", technician.name, c.diagnosisNotes);

    let estimateAmount: number | null = null;
    if (c.estimateLines?.length) {
      let total = 0;
      for (const line of c.estimateLines) {
        const totalPrice = line.qty * line.unitPrice;
        total += totalPrice;
        await prisma.estimateLine.create({
          data: { jobcardId: jobCard.id, kind: line.kind, label: line.label, qty: line.qty, unitPrice: line.unitPrice, totalPrice },
        });
      }
      estimateAmount = total;
      await stageHistory(jobCard.id, "Estimate", "Sara Al-Qahtani", `Estimate prepared: SAR ${total}.`);
      await prisma.jobCard.update({ where: { id: jobCard.id }, data: { estimateAmount, finalAmount: c.assetHandedOver ? estimateAmount : undefined } });
    }
    if (c.customerApproved) await stageHistory(jobCard.id, "Customer Approval", "Sara Al-Qahtani", "Customer approved estimate.");
    if (c.stage === "Repair" || c.qaApproved) await stageHistory(jobCard.id, "Repair", technician.name, "Repair work completed.");
    if (c.qaApproved) await stageHistory(jobCard.id, "QA", "Khalid Al-Harbi", "QA passed.");
    if (c.assetHandedOver) {
      await stageHistory(jobCard.id, "Ready for Handover", "Noura Al-Shehri", "Asset handover confirmed.");
      if (c.stage === "Delivered") await stageHistory(jobCard.id, "Delivered", "Noura Al-Shehri", "Delivered to customer.");
    }

    console.log(`Created job card ${jobCard.documentNo} (${c.stage}) for ${c.customerName}`);
  }

  console.log(`Done — added ${cases.length} test customers/job cards.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
