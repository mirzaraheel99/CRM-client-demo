import type {
  Branch,
  Customer,
  Brand,
  Appliance,
  ApplianceTelemetry,
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
  Payment,
  ServiceOrder,
  RemovedPart,
  CustomerType,
  Gender,
  PreferredLanguage,
  EnergyRating,
  RequestSource,
  JobCardEstimateLine,
  DemoUser,
} from "./types";

// Kept local (not imported from ./stageRefNo) so this file has zero runtime
// cross-file imports — scripts/validate-dataflow.mjs transpiles seed.ts in
// isolation via a data: URI, which cannot resolve relative imports.
const STAGE_REF_PREFIX: Record<StageName, string> = {
  Received: "RCV",
  "Warranty Validation": "WV",
  Diagnosis: "DX",
  Estimate: "EST",
  "Customer Approval": "APR",
  "OEM Approval": "OEM",
  Repair: "RPR",
  QA: "QA",
  "Ready for Handover": "RFH",
  Delivered: "DLV",
};
function nextStageRefNo(history: JobCardStageHistory[], stageName: StageName): string {
  const prefix = STAGE_REF_PREFIX[stageName];
  const count = history.filter((h) => h.stageName === stageName && h.stageRefNo).length;
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

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
const pickN = <T,>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

export const BRANCHES: Branch[] = [
  { id: "br-1", name: "Riyadh Service Center", city: "Riyadh" },
  { id: "br-2", name: "Jeddah Branch", city: "Jeddah" },
  { id: "br-3", name: "Dammam Branch", city: "Dammam" },
];

// Demo credentials only — this app has no backend, so these accounts exist to
// demonstrate role-gated login/UI, not to provide real authentication security.
export const USERS: DemoUser[] = [
  { id: "user-admin", name: "Abdullah Al-Faisal", username: "admin", password: "demo123", role: "admin", branchId: "br-1" },
  { id: "user-manager", name: "Sara Al-Qahtani", username: "manager", password: "demo123", role: "manager", branchId: "br-1" },
  { id: "user-supervisor", name: "Khalid Al-Harbi", username: "supervisor", password: "demo123", role: "supervisor", branchId: "br-2" },
  { id: "user-technician", name: "Tariq Al-Dosari", username: "technician", password: "demo123", role: "technician", branchId: "br-3" },
  { id: "user-frontdesk", name: "Noura Al-Shehri", username: "frontdesk", password: "demo123", role: "front_desk", branchId: "br-1" },
];

const firstNames = ["Ahmed", "Fatima", "Omar", "Sara", "Yusuf", "Layla", "Hamdan", "Mariam", "Khalid", "Noura", "Rashid", "Aisha", "Tariq", "Huda", "Salem", "Amina", "Faisal", "Reem", "Bilal", "Dana"];
const femaleFirstNames = new Set(["Fatima", "Sara", "Layla", "Mariam", "Noura", "Aisha", "Huda", "Amina", "Reem", "Dana"]);
const maleGivenNames = ["Ahmed", "Omar", "Yusuf", "Khalid", "Rashid", "Tariq", "Salem", "Faisal", "Bilal", "Abdullah", "Mohammed", "Ibrahim", "Abdulaziz", "Sultan"];
const lastNames = ["Al-Ghamdi", "Al-Qahtani", "Al-Otaibi", "Al-Harbi", "Al-Zahrani", "Al-Shehri", "Al-Dosari", "Al-Mutairi", "Al-Amri", "Al-Anazi"];
const NATIONALITIES = ["Saudi", "Saudi", "Saudi", "Saudi", "Saudi", "Saudi", "Egyptian", "Pakistani", "Indian", "Filipino", "Jordanian", "Yemeni"];

const CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];

export const BRANDS: Brand[] = [
  { id: "brand-1", name: "Samsung", warrantyMonths: 12, rules: "Standard 12-month manufacturer warranty from purchase date; OEM claim required for parts over SAR 200." },
  { id: "brand-2", name: "LG", warrantyMonths: 24, rules: "24-month warranty on compressors/inverters, 12-month on general parts." },
  { id: "brand-3", name: "Daikin", warrantyMonths: 12, rules: "12-month warranty; requires original AC unit invoice and installation certificate." },
  { id: "brand-4", name: "Apple", warrantyMonths: 12, rules: "12-month limited warranty; IMEI must match Apple GSX record." },
  { id: "brand-5", name: "Whirlpool", warrantyMonths: 12, rules: "12-month warranty on all major appliances." },
  { id: "brand-6", name: "Sony", warrantyMonths: 12, rules: "12-month warranty; panel replacements require regional OEM approval." },
];

export const CUSTOMERS: Customer[] = Array.from({ length: 60 }, (_, i) => {
  const firstName = pick(firstNames);
  const fatherName = pick(maleGivenNames);
  const grandfatherName = rand() > 0.3 ? pick(maleGivenNames) : "";
  const familyName = pick(lastNames);
  const name = [firstName, fatherName, grandfatherName, familyName].filter(Boolean).join(" ");
  const gender: Gender = femaleFirstNames.has(firstName) ? "female" : "male";
  const nationality = pick(NATIONALITIES);
  const customerType: CustomerType = rand() > 0.85 ? "corporate" : "individual";
  const preferredLanguage: PreferredLanguage = rand() > 0.4 ? "ar" : "en";
  const branch = pick(BRANCHES);
  return {
    id: id("cust", i + 1),
    documentNo: `CUST-${String(i + 1).padStart(5, "0")}`,
    firstName,
    fatherName,
    grandfatherName: grandfatherName || undefined,
    familyName,
    name,
    phone: `+9665${int(0, 9)}${int(1000000, 9999999)}`,
    homePhone: rand() > 0.5 ? `+9661${int(1000000, 9999999)}` : undefined,
    whatsapp: `+9665${int(0, 9)}${int(1000000, 9999999)}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    address: `Building ${int(1, 40)}, Street ${int(1, 20)}, ${branch.city}`,
    nationalId: `${nationality === "Saudi" ? "1" : "2"}${int(100000000, 999999999)}`,
    nationality,
    preferredLanguage,
    customerType,
    companyName: customerType === "corporate" ? `${familyName} Trading Est.` : undefined,
    crNumber: customerType === "corporate" ? `CR-${int(1000000000, 9999999999)}` : undefined,
    dateOfBirth: daysAgo(int(6570, 25550)).slice(0, 10),
    gender,
    branchId: branch.id,
    createdAt: daysAgo(int(10, 700)),
    whatsappVerified: rand() > 0.35,
  };
});

const modelSuffixes = ["Pro", "Neo", "X2", "Max", "Lite", "Plus", "Ultra", "SE", "Turbo", "Eco"];

const SMART_CAPABLE_BRANDS = new Set(["Samsung", "LG", "Apple"]);

const RETAILERS = ["eXtra Stores", "Jarir Bookstore", "Al-Futtaim ACE", "Sharaf DG", "Carrefour", "Danube Home"];
const MANUFACTURE_COUNTRIES = ["China", "South Korea", "Saudi Arabia", "Egypt", "Turkey", "Thailand", "Vietnam"];
const APPLIANCE_COLORS = ["White", "Silver", "Black", "Stainless Steel", "Graphite"];
const ENERGY_RATED_CATEGORIES = new Set<ApplianceCategory>(["AC", "Refrigerator", "Washer"]);
const INSTALLED_CATEGORIES = new Set<ApplianceCategory>(["AC", "TV"]);
const PRICE_RANGES: Record<ApplianceCategory, [number, number]> = {
  AC: [1200, 6000],
  Refrigerator: [1500, 8000],
  Washer: [900, 4000],
  Mobile: [800, 6000],
  TV: [1000, 9000],
  Microwave: [300, 1500],
};
function applianceSpec(category: ApplianceCategory): string {
  if (category === "AC") return `${pick(["1", "1.5", "2", "3"])} Ton`;
  if (category === "Refrigerator") return `${int(14, 26)} Cu.Ft`;
  if (category === "Washer") return `${pick([7, 8, 9, 10, 12])} Kg`;
  if (category === "Mobile") return `${pick([64, 128, 256, 512])} GB`;
  if (category === "TV") return `${pick([43, 50, 55, 65, 75])}"`;
  return `${pick([20, 25, 30, 32])} L`;
}

export const APPLIANCES: Appliance[] = Array.from({ length: 90 }, (_, i) => {
  const category = pick(CATEGORIES);
  const brand = category === "Mobile" ? BRANDS.find((b) => b.name === "Apple")! : pick(BRANDS.filter((b) => b.name !== "Apple"));
  const purchaseDate = daysAgo(int(20, 900));
  const monthsSince = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  // Newer appliances from brands with a real connected-app ecosystem (SmartThings/ThinQ) are more likely IoT-enabled.
  const isSmartConnected = category !== "Mobile" && SMART_CAPABLE_BRANDS.has(brand.name) && monthsSince < 30 && rand() > 0.45;
  const [minPrice, maxPrice] = PRICE_RANGES[category];
  const amcActive = rand() > 0.7;
  return {
    id: id("app", i + 1),
    documentNo: `AST-${String(i + 1).padStart(5, "0")}`,
    brandId: brand.id,
    category,
    model: `${brand.name} ${category} ${pick(modelSuffixes)}-${int(100, 999)}`,
    serialNo: `SN${int(100000, 999999)}`,
    imeiNo: category === "Mobile" ? `${int(100000000000000, 999999999999999)}` : undefined,
    purchaseDate,
    warrantyStatus: monthsSince < brand.warrantyMonths ? "In Warranty" : "Out of Warranty",
    isSmartConnected,
    purchaseInvoiceNo: `INV-PUR-${int(100000, 999999)}`,
    retailerName: pick(RETAILERS),
    purchasePrice: int(minPrice, maxPrice),
    amcActive,
    amcExpiryDate: amcActive ? daysAgo(-int(30, 700)) : undefined,
    sasoCertNo: rand() > 0.15 ? `SASO-${int(100000, 999999)}` : undefined,
    energyRating: ENERGY_RATED_CATEGORIES.has(category) ? (int(1, 5) as EnergyRating) : undefined,
    countryOfManufacture: pick(MANUFACTURE_COUNTRIES),
    color: pick(APPLIANCE_COLORS),
    specification: applianceSpec(category),
    installationDate: category === "AC" ? daysAgo(int(15, 895)) : undefined,
    installedLocation: INSTALLED_CATEGORIES.has(category) ? pick(["Majlis", "Living Room", "Master Bedroom", "Kitchen", "Office"]) : undefined,
  };
});

const ERROR_CODES: Record<string, { code: string; desc: string }[]> = {
  AC: [{ code: "E1", desc: "Refrigerant pressure sensor fault" }, { code: "E5", desc: "Compressor overcurrent" }, { code: "F0", desc: "Indoor/outdoor unit communication error" }],
  Refrigerator: [{ code: "Er FF", desc: "Freezer fan fault" }, { code: "Er dh", desc: "Defrost heater fault" }, { code: "Er 5C", desc: "Compressor start failure" }],
  Washer: [{ code: "E4", desc: "Drain blockage detected" }, { code: "UE", desc: "Unbalanced load" }, { code: "E2", desc: "Water inlet timeout" }],
  Mobile: [{ code: "—", desc: "No diagnostic codes reported" }],
  TV: [{ code: "E101", desc: "Panel backlight driver fault" }, { code: "E204", desc: "HDMI port communication error" }],
  Microwave: [{ code: "E-3", desc: "Door switch fault" }, { code: "F-1", desc: "Magnetron overheat" }],
};

export const APPLIANCE_TELEMETRY: ApplianceTelemetry[] = APPLIANCES.filter((a) => a.isSmartConnected).map((a) => {
  const codes = ERROR_CODES[a.category] ?? [];
  const hasError = codes.length > 0 && rand() > 0.55;
  const chosen = hasError ? pick(codes) : null;
  return {
    applianceId: a.id,
    lastErrorCode: chosen?.code ?? null,
    lastErrorDescription: chosen?.desc ?? null,
    cycleCount: int(40, 2200),
    lastSyncAt: daysAgo(int(0, 3)),
  };
});

export const TECHNICIANS: Technician[] = [
  { name: "Imran Qureshi", skills: ["AC", "Refrigerator", "Mobile"], zone: "Riyadh North", branchId: "br-1" },
  { name: "Zainab Malik", skills: ["Mobile", "TV", "AC"], zone: "Jeddah Central", branchId: "br-2" },
  { name: "Hassan Raza", skills: ["Washer", "Microwave", "TV"], zone: "Dammam East", branchId: "br-3" },
  { name: "Priya Nair", skills: ["AC", "Washer", "Microwave"], zone: "Riyadh South", branchId: "br-1" },
  { name: "Ali Akbar", skills: ["Refrigerator", "TV", "Washer"], zone: "Jeddah North", branchId: "br-2" },
  { name: "Nadia Farooq", skills: ["Mobile", "AC", "Refrigerator"], zone: "Dammam West", branchId: "br-3" },
  { name: "Waqas Ahmed", skills: ["Washer", "Refrigerator", "TV"], zone: "Riyadh Central", branchId: "br-1" },
  { name: "Sana Tariq", skills: ["TV", "Microwave", "Mobile"], zone: "Jeddah South", branchId: "br-2" },
].map((t, i) => ({
  id: id("tech", i + 1),
  name: t.name,
  phone: `+9665${int(0, 9)}${int(1000000, 9999999)}`,
  skills: t.skills as ApplianceCategory[],
  zone: t.zone,
  branchId: t.branchId,
  status: "Available" as const,
  avatarColor: pick(["#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"]),
}));

export const INVENTORY_LOCATIONS: InventoryLocation[] = [
  { id: "loc-1", name: "Main Store - Riyadh", type: "store", branchId: "br-1" },
  { id: "loc-2", name: "Main Store - Jeddah", type: "store", branchId: "br-2" },
  { id: "loc-3", name: "Main Store - Dammam", type: "store", branchId: "br-3" },
  ...TECHNICIANS.map((t) => ({ id: `van-${t.id}`, name: `${t.name.split(" ")[0]}'s Van`, type: "van" as const, branchId: t.branchId })),
];

const partNames = [
  "Compressor Relay", "Refrigerant Gas R410a (kg)", "PCB Control Board", "Drain Pump", "Door Gasket",
  "Fan Motor", "Thermostat", "Display Screen Assembly", "Battery Pack", "Charging Port Flex",
  "Water Inlet Valve", "Heating Element", "Remote Control", "Air Filter", "Capacitor 35uF",
  "LED Backlight Strip", "Timer Module", "Magnetron", "Belt Drive", "Evaporator Coil",
];

// Arabic alias shown on customer-facing output (invoices, WhatsApp, printed job
// card) — the internal staff UI stays English, only these labels are bilingual.
const partNamesAr: Record<string, string> = {
  "Compressor Relay": "مرحل الضاغط",
  "Refrigerant Gas R410a (kg)": "غاز التبريد R410a (كجم)",
  "PCB Control Board": "لوحة التحكم الإلكترونية",
  "Drain Pump": "مضخة التصريف",
  "Door Gasket": "حشية الباب",
  "Fan Motor": "محرك المروحة",
  Thermostat: "منظم الحرارة",
  "Display Screen Assembly": "وحدة شاشة العرض",
  "Battery Pack": "حزمة البطارية",
  "Charging Port Flex": "شريط منفذ الشحن",
  "Water Inlet Valve": "صمام دخول الماء",
  "Heating Element": "عنصر التسخين",
  "Remote Control": "جهاز التحكم عن بعد",
  "Air Filter": "فلتر الهواء",
  "Capacitor 35uF": "مكثف 35 ميكروفاراد",
  "LED Backlight Strip": "شريط الإضاءة الخلفية LED",
  "Timer Module": "وحدة المؤقت",
  Magnetron: "الماغنترون",
  "Belt Drive": "سير النقل",
  "Evaporator Coil": "ملف المبخر",
};

export const INVENTORY_ITEMS: InventoryItem[] = partNames.map((name, i) => ({
  id: id("item", i + 1),
  name,
  nameAr: partNamesAr[name],
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

// Deliberately seed a couple of "fast movers": parts whose stock looks fine
// against a static reorder level, but whose recent consumption velocity means
// they'll run out well before a lead-time restock — the exact case a
// velocity-based reorder view catches that a static threshold misses.
let fastMoverTxnId = 1000;
const stockTotalByItem = new Map<string, number>();
for (const s of INVENTORY_STOCK) stockTotalByItem.set(s.itemId, (stockTotalByItem.get(s.itemId) ?? 0) + s.qty);
const fastMoverCandidates = INVENTORY_ITEMS.filter((i) => (stockTotalByItem.get(i.id) ?? 0) > 60 && !LOW_STOCK_ITEM_IDS.has(i.id));
for (const item of pickN(fastMoverCandidates, 3)) {
  const totalStock = stockTotalByItem.get(item.id) ?? 100;
  const targetWeeksOfCover = 1 + rand() * 1.5; // lands between 1.0 and 2.5 weeks
  const weeklyVelocity = Math.max(4, Math.round(totalStock / targetWeeksOfCover));
  for (let week = 0; week < 4; week++) {
    const loc = pick(INVENTORY_LOCATIONS.filter((l) => l.type === "van"));
    INVENTORY_TRANSACTIONS.push({
      id: id("txn", 900 + fastMoverTxnId++),
      itemId: item.id,
      locationId: loc.id,
      type: "issue",
      qty: Math.max(1, Math.round(weeklyVelocity / 2)),
      timestamp: daysAgo(week * 7 + int(0, 5)),
      createdBy: pick(TECHNICIANS).name,
    });
  }
}

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

const DISTRICTS = ["Al Olaya", "Al Malaz", "An Nuzhah", "Al Naseem", "Ash Shifa", "Al Rawdah", "Al Hamra", "Ar Rabwah"];
const TIME_SLOTS = ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00"];
const REQUEST_SOURCES: RequestSource[] = ["walk_in", "phone", "whatsapp", "app", "referral"];

export const SERVICE_ORDERS: ServiceOrder[] = [];
export const JOB_CARDS: JobCard[] = [];
export const STAGE_HISTORY: JobCardStageHistory[] = [];
export const ATTACHMENTS: JobCardAttachment[] = [];
export const PARTS_USED: JobCardPartUsed[] = [];
export const ESTIMATE_LINE_ITEMS: JobCardEstimateLine[] = [];
export const PURCHASE_BILLS: PurchaseBill[] = [];
export const COMMUNICATION_LOGS: CommunicationLog[] = [];
export const REMOVED_PARTS: RemovedPart[] = [];

let stageHistId = 1, attId = 1, partId = 1, billId = 1, commId = 1, jobTxnId = 5000, serviceOrderId = 1, removedPartId = 1, estimateLineId = 1;
let activeOrder: ServiceOrder | null = null;
let activeOrderCustomer: Customer | null = null;
let activeOrderRemaining = 0;
let activeOrderSequence = 0;
let activeOrderApplianceIds = new Set<string>();

for (let i = 0; i < 130; i++) {
  if (!activeOrderCustomer || activeOrderRemaining === 0) {
    activeOrderCustomer = pick(CUSTOMERS);
    activeOrderRemaining = rand() < 0.42 ? int(2, 3) : 1;
    activeOrderSequence = 0;
    activeOrderApplianceIds = new Set<string>();
    activeOrder = null;
  }
  const appliance = pick(APPLIANCES.filter((candidate) => !activeOrderApplianceIds.has(candidate.id)));
  activeOrderApplianceIds.add(appliance.id);
  const customer = activeOrderCustomer;
  activeOrderSequence += 1;
  const jobType = appliance.warrantyStatus === "In Warranty" && rand() > 0.3 ? "warranty" : "non_warranty";
  const stages = jobType === "warranty" ? STAGES_WARRANTY : STAGES_NONWARRANTY;
  // progress index: weighted so most jobs are in-flight, some done, a few just received
  const progressRoll = rand();
  const progressIdx = progressRoll < 0.15 ? 0 : progressRoll < 0.85 ? int(1, stages.length - 2) : stages.length - 1;
  const currentStage = stages[progressIdx];
  // ensure enough elapsed time exists for the full stage progression to play out without clamping
  const minDaysNeeded = Math.ceil((progressIdx * 20) / 24) + 1;
  const createdAt = daysAgo(int(Math.min(minDaysNeeded, 20), Math.max(minDaysNeeded, 20)));
  if (!activeOrder) {
    activeOrder = {
      id: id("order", serviceOrderId),
      documentNo: `SO-${new Date().getFullYear()}-${String(serviceOrderId).padStart(5, "0")}`,
      customerId: customer.id,
      branchId: customer.branchId,
      createdAt,
      updatedAt: createdAt,
      shortAddressCode: `${pick(["RAHM", "JEDD", "DMAM", "RAFH", "ALOL"])}${int(1000, 9999)}`,
      buildingNo: `${int(1000, 9999)}`,
      unitNo: rand() > 0.5 ? `${int(1, 20)}` : undefined,
      district: pick(DISTRICTS),
      postalCode: `${int(10000, 99999)}`,
      additionalNo: `${int(1000, 9999)}`,
      requestSource: pick(REQUEST_SOURCES),
      preferredDate: daysAgo(-int(1, 5)),
      preferredTimeSlot: pick(TIME_SLOTS),
      buyerVatNumber: customer.customerType === "corporate" ? `3${int(100000000, 999999999)}00003` : undefined,
    };
    serviceOrderId += 1;
    SERVICE_ORDERS.push(activeOrder);
  }
  const eligibleTechnicians = TECHNICIANS.filter((candidate) => candidate.branchId === customer.branchId && candidate.skills.includes(appliance.category));
  const technician = eligibleTechnicians.length && (progressIdx > 0 || rand() > 0.35) ? pick(eligibleTechnicians) : null;
  const jobCardId = id("job", i + 1);
  let estimateAmount = jobType === "non_warranty" && progressIdx >= stages.indexOf("Estimate") ? int(350, 2200) : null;
  const isDelivered = currentStage === "Delivered";

  // stage history up to progressIdx — each step advances a realistic 3-20 hours
  let ts = new Date(createdAt).getTime();
  const now = Date.now();
  for (let s = 0; s <= progressIdx; s++) {
    ts = Math.min(ts + int(3, 20) * 3600 * 1000, now);
    const stageName = stages[s];
    const changedBy = stageName === "Received" || stageName === "Ready for Handover" || stageName === "Delivered"
      ? "Front Desk"
      : stageName === "QA" || stageName === "Warranty Validation"
        ? "Service Supervisor"
        : technician?.name ?? "Service Team";
    STAGE_HISTORY.push({
      id: id("hist", stageHistId++),
      jobcardId: jobCardId,
      stageName,
      changedBy,
      timestamp: new Date(ts).toISOString(),
      notes: s === 0 ? "Item received at counter." : `Moved to ${stageName}.`,
      stageRefNo: nextStageRefNo(STAGE_HISTORY, stageName),
    });
    if (rand() > 0.4) {
      ATTACHMENTS.push({
        id: id("att", attId++),
        jobcardId: jobCardId,
        stageName,
        fileUrl: "#",
        label: `${stageName} photo`,
        uploadedBy: changedBy,
        timestamp: new Date(ts).toISOString(),
      });
    }
  }

  const diagnosisIndex = stages.indexOf("Diagnosis");
  const repairIndex = stages.indexOf("Repair");
  const qaIndex = stages.indexOf("QA");
  const approvalIndex = stages.indexOf("Customer Approval");
  const readyIndex = stages.indexOf("Ready for Handover");
  const job: JobCard = {
    id: jobCardId,
    serviceOrderId: activeOrder.id,
    sequenceNo: activeOrderSequence,
    documentNo: `${activeOrder.documentNo}-${String(activeOrderSequence).padStart(2, "0")}`,
    invoiceNo: `INV-${activeOrder.documentNo}-${String(activeOrderSequence).padStart(2, "0")}`,
    customerId: customer.id,
    applianceId: appliance.id,
    technicianId: technician?.id ?? null,
    branchId: customer.branchId,
    jobType,
    status: STAGE_TO_STATUS[currentStage],
    currentStage,
    problemDescription: pick(problems),
    estimateAmount,
    finalAmount: null,
    createdAt,
    updatedAt: new Date(ts).toISOString(),
    scheduledAt: technician ? daysAgo(int(-3, 3)) : null,
    customerApproved: jobType === "non_warranty" && approvalIndex >= 0 && progressIdx > approvalIndex ? true : null,
    diagnosisNotes: diagnosisIndex >= 0 && progressIdx > diagnosisIndex ? `Confirmed ${appliance.category.toLowerCase()} fault after diagnostic inspection.` : null,
    repairNotes: repairIndex >= 0 && progressIdx > repairIndex ? "Repair completed and unit tested under normal operating load." : null,
    qaApproved: qaIndex >= 0 && progressIdx > qaIndex,
    customerSignature: isDelivered ? customer.name : null,
    oemClaimNo: jobType === "warranty" && progressIdx >= 1 && rand() > 0.5 ? `OEM-${int(100000, 999999)}` : undefined,
    assetHandedOver: isDelivered,
    assetHandedOverAt: isDelivered ? new Date(ts).toISOString() : undefined,
    assetHandedOverBy: isDelivered ? "Front Desk" : undefined,
  };
  JOB_CARDS.push(job);
  activeOrder.createdAt = new Date(activeOrder.createdAt) < new Date(job.createdAt) ? activeOrder.createdAt : job.createdAt;
  activeOrder.updatedAt = new Date(activeOrder.updatedAt) > new Date(job.updatedAt) ? activeOrder.updatedAt : job.updatedAt;
  activeOrderRemaining -= 1;

  if (repairIndex >= 0 && progressIdx >= repairIndex) {
    const numParts = int(1, 3);
    let firstReplacedItem: InventoryItem | null = null;
    for (let p = 0; p < numParts; p++) {
      const branchLocationIds = new Set(INVENTORY_LOCATIONS.filter((location) => location.branchId === job.branchId).map((location) => location.id));
      const stockOptions = INVENTORY_STOCK.filter((entry) => branchLocationIds.has(entry.locationId) && entry.qty > 0);
      if (!stockOptions.length) break;
      const stockEntry = pick(stockOptions);
      const item = INVENTORY_ITEMS.find((candidate) => candidate.id === stockEntry.itemId)!;
      if (!firstReplacedItem) firstReplacedItem = item;
      const qty = Math.min(stockEntry.qty, int(1, 2));
      stockEntry.qty -= qty;
      PARTS_USED.push({
        id: id("part", partId++),
        jobcardId: jobCardId,
        itemId: item.id,
        locationId: stockEntry.locationId,
        qty,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * qty,
      });
      INVENTORY_TRANSACTIONS.push({
        id: id("txn", jobTxnId++),
        itemId: item.id,
        locationId: stockEntry.locationId,
        jobcardId: jobCardId,
        type: "issue",
        qty,
        timestamp: STAGE_HISTORY.find((history) => history.jobcardId === jobCardId && history.stageName === "Repair")?.timestamp ?? job.updatedAt,
        createdBy: technician?.name ?? "Service Team",
      });
    }
    // The old/failed part physically has to be handed back to the customer
    // even if it's junk — track that custody chain separately from billing.
    if (firstReplacedItem && rand() > 0.25) {
      const notified = rand() > 0.15;
      const returned = isDelivered ? rand() > 0.1 : rand() > 0.55;
      const notifiedAt = notified ? new Date(Math.min(ts + int(1, 6) * 3600 * 1000, now)).toISOString() : undefined;
      const confirmedAt = returned ? new Date(Math.min(ts + int(6, 48) * 3600 * 1000, now)).toISOString() : undefined;
      REMOVED_PARTS.push({
        id: id("rp", removedPartId++),
        jobcardId: jobCardId,
        description: `${firstReplacedItem.name} (old — removed during repair)`,
        serialNo: rand() > 0.5 ? appliance.serialNo : undefined,
        removedAt: new Date(ts).toISOString(),
        removedBy: technician?.name ?? "Technician",
        customerNotifiedAt: notifiedAt,
        returnStatus: returned ? "returned_to_customer" : "pending",
        returnConfirmedAt: confirmedAt,
        returnConfirmedBy: returned ? "Front Desk" : undefined,
      });
    }
  }

  const partsTotal = PARTS_USED.filter((part) => part.jobcardId === jobCardId).reduce((sum, part) => sum + part.totalPrice, 0);
  if (jobType === "non_warranty" && estimateAmount != null && partsTotal > 0) {
    estimateAmount = Math.max(estimateAmount, partsTotal + 350);
    job.estimateAmount = estimateAmount;
  }
  if (jobType === "non_warranty" && estimateAmount != null) {
    const estimateParts = PARTS_USED.filter((part) => part.jobcardId === jobCardId);
    for (const part of estimateParts) {
      const item = INVENTORY_ITEMS.find((candidate) => candidate.id === part.itemId);
      ESTIMATE_LINE_ITEMS.push({
        id: id("estl", estimateLineId++),
        jobcardId: jobCardId,
        kind: "part",
        label: item?.name ?? "Replacement part",
        itemId: part.itemId,
        qty: part.qty,
        unitPrice: part.unitPrice,
        totalPrice: part.totalPrice,
      });
    }
    const laborAmount = estimateAmount - estimateParts.reduce((sum, part) => sum + part.totalPrice, 0);
    ESTIMATE_LINE_ITEMS.push({
      id: id("estl", estimateLineId++),
      jobcardId: jobCardId,
      kind: "labor",
      label: "Diagnostic & labor charge",
      qty: 1,
      unitPrice: laborAmount,
      totalPrice: laborAmount,
    });
    const validUntilDate = new Date(ts);
    validUntilDate.setDate(validUntilDate.getDate() + int(5, 10));
    job.estimateValidUntil = validUntilDate.toISOString().slice(0, 10);
  }
  if (jobType === "non_warranty" && readyIndex >= 0 && progressIdx >= readyIndex) {
    job.finalAmount = partsTotal + int(120, 350);
  }

  if (jobType === "warranty" && progressIdx >= 1) {
    PURCHASE_BILLS.push({
      id: id("bill", billId++),
      jobcardId: jobCardId,
      billNo: `INV-${int(100000, 999999)}`,
      billDate: appliance.purchaseDate,
      vendorName: pick(["eXtra Stores", "Jarir Bookstore", "Carrefour Saudi", "Al Yousifi Electronics", "Saco"]),
    });
  }

  const addMessage = (stageName: StageName, channel: "whatsapp" | "sms" | "email", message: string) => {
    const stageEvent = STAGE_HISTORY.find((history) => history.jobcardId === jobCardId && history.stageName === stageName);
    if (!stageEvent) return;
    COMMUNICATION_LOGS.push({
      id: id("comm", commId++),
      jobcardId: jobCardId,
      customerId: customer.id,
      applianceId: appliance.id,
      stageName,
      channel,
      to: channel === "email" ? customer.email : channel === "whatsapp" ? customer.whatsapp : customer.phone,
      message,
      status: rand() < 0.04 ? "failed" : channel === "whatsapp" && rand() > 0.35 ? "read" : "delivered",
      timestamp: stageEvent.timestamp,
    });
  };

  addMessage("Received", "whatsapp", `Hi ${customer.name.split(" ")[0]}, we received your ${appliance.model} (${job.documentNo}).`);
  addMessage("Received", "sms", `FixFlow received ${job.documentNo}. We will share a diagnosis shortly.`);
  if (jobType === "non_warranty" && approvalIndex >= 0 && progressIdx >= approvalIndex) {
    addMessage("Customer Approval", "whatsapp", `Estimate ready for ${job.documentNo}: SAR ${estimateAmount?.toLocaleString()} for parts and labor.`);
    addMessage("Customer Approval", "email", `Your FixFlow estimate for ${job.documentNo} is ready for approval.`);
  }
  if (readyIndex >= 0 && progressIdx >= readyIndex) {
    addMessage("Ready for Handover", "whatsapp", `Your ${appliance.model} is repaired and ready for pickup.`);
    addMessage("Ready for Handover", "sms", `${job.documentNo} is ready for handover.`);
  }
  if (isDelivered) {
    addMessage("Delivered", "whatsapp", `Your ${appliance.model} (${job.documentNo}) has been delivered. Thank you.`);
  }
}

for (const technician of TECHNICIANS) {
  technician.status = JOB_CARDS.some((job) => job.status !== "Delivered" && job.technicianId === technician.id) ? "On Job" : "Available";
}

export const PAYMENTS: Payment[] = [];
let paymentId = 1;
const PAYMENT_METHOD_WEIGHTS: { method: Payment["method"]; weight: number }[] = [
  { method: "mada", weight: 40 },
  { method: "stc_pay", weight: 20 },
  { method: "apple_pay", weight: 18 },
  { method: "tabby", weight: 10 },
  { method: "tamara", weight: 7 },
  { method: "cash", weight: 5 },
];
function pickPaymentMethod(): Payment["method"] {
  const total = PAYMENT_METHOD_WEIGHTS.reduce((a, w) => a + w.weight, 0);
  let roll = rand() * total;
  for (const w of PAYMENT_METHOD_WEIGHTS) {
    if (roll < w.weight) return w.method;
    roll -= w.weight;
  }
  return "mada";
}

for (const job of JOB_CARDS) {
  if (job.jobType !== "non_warranty" || job.status !== "Delivered" || job.finalAmount == null) continue;
  const method = pickPaymentMethod();
  const isBnpl = method === "tabby" || method === "tamara";
  PAYMENTS.push({
    id: id("pay", paymentId++),
    jobcardId: job.id,
    method,
    amount: job.finalAmount,
    installments: isBnpl ? pick([3, 4]) : undefined,
    status: "paid",
    timestamp: job.updatedAt,
  });
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
      { stepOrder: 5, stepName: "QA", mandatoryFields: ["qa_approved"], approvalRequired: true, approverRole: "supervisor", triggers: { whatsapp: false, sms: false, email: false } },
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
      { stepOrder: 3, stepName: "Estimate", mandatoryFields: ["estimate_amount"], approvalRequired: false, approverRole: null, triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 4, stepName: "Customer Approval", mandatoryFields: ["customer_approval_status"], approvalRequired: true, approverRole: "front_desk", triggers: { whatsapp: true, sms: true, email: true } },
      { stepOrder: 5, stepName: "Repair", mandatoryFields: ["parts_used", "repair_notes"], approvalRequired: false, approverRole: null, triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 6, stepName: "QA", mandatoryFields: ["qa_approved"], approvalRequired: true, approverRole: "supervisor", triggers: { whatsapp: false, sms: false, email: false } },
      { stepOrder: 7, stepName: "Ready for Handover", mandatoryFields: [], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: true } },
      { stepOrder: 8, stepName: "Delivered", mandatoryFields: ["customer_signature", "final_amount"], approvalRequired: false, approverRole: null, triggers: { whatsapp: true, sms: true, email: false } },
    ],
  },
];
