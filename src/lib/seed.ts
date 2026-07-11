import type {
  Branch,
  Customer,
  Brand,
  Appliance,
  Technician,
  InventoryLocation,
  InventoryItem,
  InventoryStock,
  InventoryTransaction,
  JobCard,
  JobCardStageHistory,
  JobCardAttachment,
  JobCardPartUsed,
  PurchaseBill,
  CommunicationLog,
  WorkflowDefinition,
  ApplianceCategory,
  StageName,
} from "./types";

// Deterministic PRNG so the demo dataset is stable across reloads.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260711);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

export const BRANCHES: Branch[] = [
  { id: "br-1", name: "Downtown Service Center", city: "Dubai" },
  { id: "br-2", name: "Al Quoz Branch", city: "Dubai" },
  { id: "br-3", name: "Sharjah Branch", city: "Sharjah" },
];

const firstNames = ["Ahmed", "Fatima", "Omar", "Sara", "Yusuf", "Layla", "Hamdan", "Mariam", "Khalid", "Noura", "Rashid", "Aisha", "Tariq", "Huda", "Salem", "Amina", "Faisal", "Reem", "Bilal", "Dana"];
const lastNames = ["Al Farsi", "Hassan", "Al Mansoori", "Rahman", "Al Suwaidi", "Karim", "Al Nuaimi", "Siddiqui", "Al Marzooqi", "Iqbal"];

const CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];

export const BRANDS: Brand[] = [
  { id: "brand-1", name: "Samsung", warrantyMonths: 12, rules: "Standard 12-month manufacturer warranty from purchase date; OEM claim required for parts over AED 200." },
  { id: "brand-2", name: "LG", warrantyMonths: 24, rules: "24-month warranty on compressors/inverters, 12-month on general parts." },
  { id: "brand-3", name: "Daikin", warrantyMonths: 12, rules: "12-month warranty; requires original AC unit invoice and installation certificate." },
  { id: "brand-4", name: "Apple", warrantyMonths: 12, rules: "12-month limited warranty; IMEI must match Apple GSX record." },
  { id: "brand-5", name: "Whirlpool", warrantyMonths: 12, rules: "12-month warranty on all major appliances." },
  { id: "brand-6", name: "Sony", warrantyMonths: 12, rules: "12-month warranty; panel replacements require regional OEM approval." },
];

export const CUSTOMERS: Customer[] = Array.from({ length: 60 }, (_, i) => {
  const name = `${pick(firstNames)} ${pick(lastNames)}`;
  return {
    id: id("cust", i + 1),
    name,
    phone: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
    whatsapp: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    address: `Building ${int(1, 40)}, Street ${int(1, 20)}, ${pick(BRANCHES).city}`,
    branchId: pick(BRANCHES).id,
    createdAt: daysAgo(int(10, 700)),
  };
});

const modelSuffixes = ["Pro", "Neo", "X2", "Max", "Lite", "Plus", "Ultra", "SE", "Turbo", "Eco"];

export const APPLIANCES: Appliance[] = Array.from({ length: 90 }, (_, i) => {
  const category = pick(CATEGORIES);
  const brand = category === "Mobile" ? BRANDS.find((b) => b.name === "Apple")! : pick(BRANDS.filter((b) => b.name !== "Apple"));
  const purchaseDate = daysAgo(int(20, 900));
  const monthsSince = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return {
    id: id("app", i + 1),
    customerId: pick(CUSTOMERS).id,
    brandId: brand.id,
    category,
    model: `${brand.name} ${category} ${pick(modelSuffixes)}-${int(100, 999)}`,
    serialNo: `SN${int(100000, 999999)}`,
    imeiNo: category === "Mobile" ? `${int(100000000000000, 999999999999999)}` : undefined,
    purchaseDate,
    warrantyStatus: monthsSince < brand.warrantyMonths ? "In Warranty" : "Out of Warranty",
  };
});

export const TECHNICIANS: Technician[] = [
  { name: "Imran Qureshi", skills: ["AC", "Refrigerator"], zone: "Zone A" },
  { name: "Zainab Malik", skills: ["Mobile", "TV"], zone: "Zone B" },
  { name: "Hassan Raza", skills: ["Washer", "Microwave"], zone: "Zone A" },
  { name: "Priya Nair", skills: ["AC", "Washer"], zone: "Zone C" },
  { name: "Ali Akbar", skills: ["Refrigerator", "TV"], zone: "Zone B" },
  { name: "Nadia Farooq", skills: ["Mobile", "AC"], zone: "Zone C" },
  { name: "Waqas Ahmed", skills: ["Washer", "Refrigerator"], zone: "Zone A" },
  { name: "Sana Tariq", skills: ["TV", "Microwave"], zone: "Zone B" },
].map((t, i) => ({
  id: id("tech", i + 1),
  name: t.name,
  phone: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
  skills: t.skills as ApplianceCategory[],
  zone: t.zone,
  branchId: pick(BRANCHES).id,
  status: pick(["Available", "On Job", "Off Duty"] as const),
  avatarColor: pick(["#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"]),
}));

export const INVENTORY_LOCATIONS: InventoryLocation[] = [
  { id: "loc-1", name: "Main Store - Downtown", type: "store", branchId: "br-1" },
  { id: "loc-2", name: "Main Store - Al Quoz", type: "store", branchId: "br-2" },
  { id: "loc-3", name: "Main Store - Sharjah", type: "store", branchId: "br-3" },
  ...TECHNICIANS.map((t) => ({ id: `van-${t.id}`, name: `${t.name.split(" ")[0]}'s Van`, type: "van" as const, branchId: t.branchId })),
];

const partNames = [
  "Compressor Relay", "Refrigerant Gas R410a (kg)", "PCB Control Board", "Drain Pump", "Door Gasket",
  "Fan Motor", "Thermostat", "Display Screen Assembly", "Battery Pack", "Charging Port Flex",
  "Water Inlet Valve", "Heating Element", "Remote Control", "Air Filter", "Capacitor 35uF",
  "LED Backlight Strip", "Timer Module", "Magnetron", "Belt Drive", "Evaporator Coil",
];

export const INVENTORY_ITEMS: InventoryItem[] = partNames.map((name, i) => ({
  id: id("item", i + 1),
  name,
  category: pick(["Electrical", "Mechanical", "Consumable", "Electronic"]),
  brand: pick(BRANDS).name,
  partNo: `PN-${int(10000, 99999)}`,
  unitPrice: int(15, 850),
  reorderLevel: int(5, 20),
}));

export const INVENTORY_STOCK: InventoryStock[] = [];
// A handful of fast-moving parts are deliberately kept critically low across every
// location so the dashboard's low-stock alert panel has something real to show.
const LOW_STOCK_ITEM_IDS = new Set(INVENTORY_ITEMS.slice(0, 4).map((i) => i.id));
for (const item of INVENTORY_ITEMS) {
  const isLowStockItem = LOW_STOCK_ITEM_IDS.has(item.id);
  for (const loc of INVENTORY_LOCATIONS) {
    const qty = isLowStockItem ? int(0, 2) : loc.type === "store" ? int(0, 60) : int(0, 8);
    if (qty > 0 || rand() > 0.5) INVENTORY_STOCK.push({ itemId: item.id, locationId: loc.id, qty });
  }
}

export const INVENTORY_TRANSACTIONS: InventoryTransaction[] = Array.from({ length: 140 }, (_, i) => {
  const type = pick(["receive", "issue", "return", "transfer", "adjust"] as const);
  const loc = pick(INVENTORY_LOCATIONS);
  return {
    id: id("txn", i + 1),
    itemId: pick(INVENTORY_ITEMS).id,
    locationId: loc.id,
    type,
    qty: int(1, 12),
    timestamp: daysAgo(int(0, 120)),
    createdBy: pick(TECHNICIANS).name,
    destLocationId: type === "transfer" ? pick(INVENTORY_LOCATIONS.filter((l) => l.id !== loc.id)).id : undefined,
  };
});

const STAGES_WARRANTY: StageName[] = ["Received", "Warranty Validation", "Diagnosis", "Repair", "QA", "Ready for Handover", "Delivered"];
const STAGES_NONWARRANTY: StageName[] = ["Received", "Diagnosis", "Estimate", "Customer Approval", "Repair", "QA", "Ready for Handover", "Delivered"];

const STAGE_TO_STATUS: Record<StageName, JobCard["status"]> = {
  Received: "Received",
  "Warranty Validation": "In Diagnosis",
  Diagnosis: "In Diagnosis",
  Estimate: "Waiting Approval",
  "Customer Approval": "Waiting Approval",
  "OEM Approval": "Waiting Approval",
  Repair: "In Repair",
  QA: "QA",
  "Ready for Handover": "Ready",
  Delivered: "Delivered",
};

const problems = [
  "Not cooling properly", "Making unusual noise", "Not powering on", "Water leakage", "Screen flickering",
  "Battery draining fast", "Error code displayed", "Door not sealing", "Remote not responding", "Overheating during use",
  "Spinning issue during cycle", "Drainage blocked", "Compressor cycling on/off frequently", "Cracked display", "No cold air output",
];

export const JOB_CARDS: JobCard[] = [];
export const STAGE_HISTORY: JobCardStageHistory[] = [];
export const ATTACHMENTS: JobCardAttachment[] = [];
export const PARTS_USED: JobCardPartUsed[] = [];
export const PURCHASE_BILLS: PurchaseBill[] = [];
export const COMMUNICATION_LOGS: CommunicationLog[] = [];

let stageHistId = 1, attId = 1, partId = 1, billId = 1, commId = 1;

for (let i = 0; i < 130; i++) {
  const appliance = pick(APPLIANCES);
  const jobType = appliance.warrantyStatus === "In Warranty" && rand() > 0.3 ? "warranty" : "non_warranty";
  const stages = jobType === "warranty" ? STAGES_WARRANTY : STAGES_NONWARRANTY;
  // progress index: weighted so most jobs are in-flight, some done, a few just received
  const progressRoll = rand();
  const progressIdx = progressRoll < 0.15 ? 0 : progressRoll < 0.85 ? int(1, stages.length - 2) : stages.length - 1;
  const currentStage = stages[progressIdx];
  // ensure enough elapsed time exists for the full stage progression to play out without clamping
  const minDaysNeeded = Math.ceil((progressIdx * 20) / 24) + 1;
  const createdAt = daysAgo(int(Math.min(minDaysNeeded, 20), Math.max(minDaysNeeded, 20)));
  const technician = rand() > 0.1 ? pick(TECHNICIANS) : null;
  const jobCardId = id("job", i + 1);
  const estimateAmount = jobType === "non_warranty" || rand() > 0.7 ? int(80, 1800) : null;
  const isDelivered = currentStage === "Delivered";

  // stage history up to progressIdx — each step advances a realistic 3-20 hours
  let ts = new Date(createdAt).getTime();
  const now = Date.now();
  for (let s = 0; s <= progressIdx; s++) {
    ts = Math.min(ts + int(3, 20) * 3600 * 1000, now);
    STAGE_HISTORY.push({
      id: id("hist", stageHistId++),
      jobcardId: jobCardId,
      stageName: stages[s],
      changedBy: technician?.name ?? "Front Desk",
      timestamp: new Date(ts).toISOString(),
      notes: s === 0 ? "Item received at counter." : `Moved to ${stages[s]}.`,
    });
    if (rand() > 0.4) {
      ATTACHMENTS.push({
        id: id("att", attId++),
        jobcardId: jobCardId,
        stageName: stages[s],
        fileUrl: "#",
        label: `${stages[s]} photo`,
        uploadedBy: technician?.name ?? "Front Desk",
        timestamp: new Date(ts).toISOString(),
      });
    }
  }

  JOB_CARDS.push({
    id: jobCardId,
    customerId: appliance.customerId,
    applianceId: appliance.id,
    technicianId: technician?.id ?? null,
    branchId: pick(BRANCHES).id,
    jobType,
    status: STAGE_TO_STATUS[currentStage],
    currentStage,
    problemDescription: pick(problems),
    estimateAmount,
    finalAmount: isDelivered ? (estimateAmount ?? int(80, 1800)) : null,
    createdAt,
    updatedAt: new Date(ts).toISOString(),
    scheduledAt: technician ? daysAgo(int(-3, 3)) : null,
    customerApproved: jobType === "non_warranty" && progressIdx >= 3 ? true : null,
    oemClaimNo: jobType === "warranty" && progressIdx >= 1 && rand() > 0.5 ? `OEM-${int(100000, 999999)}` : undefined,
  });

  if (progressIdx >= stages.indexOf("Repair") && stages.includes("Repair")) {
    const numParts = int(1, 3);
    for (let p = 0; p < numParts; p++) {
      const item = pick(INVENTORY_ITEMS);
      const qty = int(1, 2);
      PARTS_USED.push({
        id: id("part", partId++),
        jobcardId: jobCardId,
        itemId: item.id,
        qty,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * qty,
      });
    }
  }

  if (jobType === "warranty") {
    PURCHASE_BILLS.push({
      id: id("bill", billId++),
      jobcardId: jobCardId,
      billNo: `INV-${int(100000, 999999)}`,
      billDate: appliance.purchaseDate,
      vendorName: pick(["Sharaf DG", "Emax", "Jumbo Electronics", "Carrefour", "Lulu Hypermarket"]),
    });
  }

  const numMsgs = int(0, 4);
  for (let m = 0; m < numMsgs; m++) {
    const channel = pick(["whatsapp", "sms", "email"] as const);
    COMMUNICATION_LOGS.push({
      id: id("comm", commId++),
      jobcardId: jobCardId,
      channel,
      to: channel === "email" ? "customer@example.com" : "+9715xxxxxxxx",
      message: pick([
        "Your item has been received and is being processed.",
        "Your job estimate is ready for approval.",
        "Repair completed, your item is ready for pickup.",
        "Your item has been delivered. Thank you!",
        "OTP for confirmation: 4821",
      ]),
      status: pick(["sent", "delivered", "read", "failed"] as const),
      timestamp: daysAgo(int(0, 40)),
    });
  }
}

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "wf-1",
    name: "Warranty Appliance Workflow",
    jobType: "warranty",
    active: true,
    description: "Applies to jobs where the appliance is confirmed in-warranty.",
    steps: [
      { stepOrder: 1, stepName: "Received", mandatoryFields: ["customer_id", "appliance_id"], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: false } },
      { stepOrder: 2, stepName: "Warranty Validation", mandatoryFields: ["purchase_bill", "serial_no", "purchase_date"], approvalRequired: true, approverRole: "supervisor", triggers: { whatsapp: false, sms: false, email: true } },
      { stepOrder: 3, stepName: "Diagnosis", mandatoryFields: ["diagnosis_notes"], approvalRequired: false, approverRole: null, triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 4, stepName: "Repair", mandatoryFields: ["parts_used", "repair_notes"], approvalRequired: false, approverRole: null, triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 5, stepName: "QA", mandatoryFields: ["qa_checklist"], approvalRequired: true, approverRole: "qa_supervisor", triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 6, stepName: "Ready for Handover", mandatoryFields: [], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: true } },
      { stepOrder: 7, stepName: "Delivered", mandatoryFields: ["customer_signature"], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: false } },
    ],
  },
  {
    id: "wf-2",
    name: "Non-Warranty Appliance Workflow",
    jobType: "non_warranty",
    active: true,
    description: "Applies to cash-on-delivery jobs and out-of-warranty repairs.",
    steps: [
      { stepOrder: 1, stepName: "Received", mandatoryFields: ["customer_id", "appliance_id"], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: false } },
      { stepOrder: 2, stepName: "Diagnosis", mandatoryFields: ["diagnosis_notes"], approvalRequired: false, approverRole: null, triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 3, stepName: "Estimate", mandatoryFields: ["estimate_amount"], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: true } },
      { stepOrder: 4, stepName: "Customer Approval", mandatoryFields: ["customer_approval_status"], approvalRequired: true, approverRole: "frontdesk", triggers: { whatsapp: true, sms: true, email: false } },
      { stepOrder: 5, stepName: "Repair", mandatoryFields: ["parts_used", "repair_notes"], approvalRequired: false, approverRole: null, triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 6, stepName: "QA", mandatoryFields: ["qa_checklist"], approvalRequired: true, approverRole: "qa_supervisor", triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 7, stepName: "Ready for Handover", mandatoryFields: [], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: true } },
      { stepOrder: 8, stepName: "Delivered", mandatoryFields: ["customer_signature", "final_amount"], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: false } },
    ],
  },
];
