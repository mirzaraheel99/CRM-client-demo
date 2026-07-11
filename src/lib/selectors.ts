import type { JobCard, JobStatus, InventoryItem, InventoryLocation, InventoryStock, InventoryTransaction, Technician, Appliance, Brand } from "./types";
import { tatHours } from "./utils";

export function filterByBranch<T extends { branchId: string }>(items: T[], branchId: string | "all"): T[] {
  if (branchId === "all") return items;
  return items.filter((i) => i.branchId === branchId);
}

const STATUS_ORDER: JobStatus[] = ["Received", "In Diagnosis", "Waiting Approval", "In Repair", "QA", "Ready", "Delivered"];

export function jobsByStatus(jobCards: JobCard[]) {
  const counts = new Map<JobStatus, number>();
  for (const s of STATUS_ORDER) counts.set(s, 0);
  for (const j of jobCards) counts.set(j.status, (counts.get(j.status) ?? 0) + 1);
  return STATUS_ORDER.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

export function technicianWorkload(jobCards: JobCard[], technicians: Technician[]) {
  const active = jobCards.filter((j) => j.status !== "Delivered" && j.technicianId);
  const counts = new Map<string, number>();
  for (const j of active) counts.set(j.technicianId!, (counts.get(j.technicianId!) ?? 0) + 1);
  return technicians
    .map((t) => ({ name: t.name.split(" ")[0], jobs: counts.get(t.id) ?? 0 }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 8);
}

export function warrantyRatio(jobCards: JobCard[]) {
  const warranty = jobCards.filter((j) => j.jobType === "warranty").length;
  const nonWarranty = jobCards.length - warranty;
  return [
    { name: "Warranty", value: warranty },
    { name: "Non-Warranty", value: nonWarranty },
  ];
}

export function tatTrend(jobCards: JobCard[], days = 14) {
  const buckets: { day: string; avgHours: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const dayJobs = jobCards.filter((j) => {
      const created = new Date(j.createdAt);
      return created.toDateString() === d.toDateString();
    });
    const hrs = dayJobs.length
      ? Math.round(dayJobs.reduce((acc, j) => acc + tatHours(j.createdAt, j.status === "Delivered" ? j.updatedAt : undefined), 0) / dayJobs.length)
      : 0;
    buckets.push({ day: label, avgHours: hrs });
  }
  return buckets;
}

export function inventoryAlerts(items: InventoryItem[], locations: InventoryLocation[], stock: InventoryStock[], branchId: string | "all") {
  const relevantLocIds = new Set(filterByBranch(locations, branchId).map((l) => l.id));
  const totals = new Map<string, number>();
  for (const s of stock) {
    if (!relevantLocIds.has(s.locationId)) continue;
    totals.set(s.itemId, (totals.get(s.itemId) ?? 0) + s.qty);
  }
  return items
    .map((item) => ({ item, total: totals.get(item.id) ?? 0 }))
    .filter((x) => x.total <= x.item.reorderLevel)
    .sort((a, b) => a.total - b.total)
    .slice(0, 8);
}

export function totalStockByItem(stock: InventoryStock[]) {
  const map = new Map<string, number>();
  for (const s of stock) map.set(s.itemId, (map.get(s.itemId) ?? 0) + s.qty);
  return map;
}

export function stockByBranch(
  items: InventoryItem[],
  locations: InventoryLocation[],
  stock: InventoryStock[],
  branches: { id: string; name: string }[]
) {
  return branches.map((branch) => {
    const branchLocIds = new Set(locations.filter((l) => l.branchId === branch.id).map((l) => l.id));
    const totals = new Map<string, number>();
    for (const s of stock) {
      if (!branchLocIds.has(s.locationId)) continue;
      totals.set(s.itemId, (totals.get(s.itemId) ?? 0) + s.qty);
    }
    const totalUnits = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    const totalValue = items.reduce((acc, item) => acc + (totals.get(item.id) ?? 0) * item.unitPrice, 0);
    const lowStockCount = items.filter((item) => (totals.get(item.id) ?? 0) <= item.reorderLevel).length;
    return { branch, totals, totalUnits, totalValue, lowStockCount };
  });
}

export function avgTat(jobCards: JobCard[]) {
  const delivered = jobCards.filter((j) => j.status === "Delivered");
  if (!delivered.length) return 0;
  return Math.round(delivered.reduce((acc, j) => acc + tatHours(j.createdAt, j.updatedAt), 0) / delivered.length);
}

export interface PredictiveMaintenanceCandidate {
  appliance: Appliance;
  ageMonths: number;
  cohortAvgMonths: number;
  cohortSize: number;
  urgencyScore: number;
}

// Heuristic predictive-maintenance scan: for every brand+category combo that has
// enough repair history, work out the average appliance age (in months) at first
// service. Appliances with no job card yet that are approaching that same age are
// flagged — the same "similar units failed around this age" signal real IoT
// telemetry programs use, derived here purely from job-card history instead.
export function predictiveMaintenanceCandidates(
  appliances: Appliance[],
  jobCards: JobCard[],
  brands: Brand[],
  { minCohortSize = 3, windowRatio = 0.22 }: { minCohortSize?: number; windowRatio?: number } = {}
): PredictiveMaintenanceCandidate[] {
  const monthsBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const firstJobByAppliance = new Map<string, string>();
  for (const j of jobCards) {
    const existing = firstJobByAppliance.get(j.applianceId);
    if (!existing || new Date(j.createdAt) < new Date(existing)) firstJobByAppliance.set(j.applianceId, j.createdAt);
  }

  const cohortAges = new Map<string, number[]>();
  for (const a of appliances) {
    const firstJob = firstJobByAppliance.get(a.id);
    if (!firstJob) continue;
    const key = `${a.brandId}|${a.category}`;
    const age = monthsBetween(a.purchaseDate, firstJob);
    if (age <= 0) continue;
    if (!cohortAges.has(key)) cohortAges.set(key, []);
    cohortAges.get(key)!.push(age);
  }

  const cohortAvg = new Map<string, { avg: number; size: number }>();
  for (const [key, ages] of cohortAges) {
    if (ages.length < minCohortSize) continue;
    cohortAvg.set(key, { avg: ages.reduce((a, b) => a + b, 0) / ages.length, size: ages.length });
  }

  const now = new Date().toISOString();
  const candidates: PredictiveMaintenanceCandidate[] = [];
  for (const a of appliances) {
    if (firstJobByAppliance.has(a.id)) continue; // already has service history
    const key = `${a.brandId}|${a.category}`;
    const cohort = cohortAvg.get(key);
    if (!cohort) continue;
    const ageMonths = monthsBetween(a.purchaseDate, now);
    const window = cohort.avg * windowRatio;
    if (Math.abs(ageMonths - cohort.avg) <= window) {
      candidates.push({
        appliance: a,
        ageMonths: Math.round(ageMonths),
        cohortAvgMonths: Math.round(cohort.avg),
        cohortSize: cohort.size,
        urgencyScore: 1 - Math.abs(ageMonths - cohort.avg) / window,
      });
    }
  }
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";
  return candidates.sort((x, y) => y.urgencyScore - x.urgencyScore || brandName(x.appliance.brandId).localeCompare(brandName(y.appliance.brandId)));
}

export interface SmartReorderSuggestion {
  item: InventoryItem;
  currentStock: number;
  weeklyVelocity: number;
  weeksOfCover: number | null;
  suggestedQty: number;
}

// Consumption-velocity reorder planning: looks at "issue" transactions over the
// trailing window to estimate how fast each part actually moves, then flags
// anything that will run out before a replacement lead time — sharper than a
// static reorder-level threshold, and closer to what parts-vendor integrations
// (RepairDesk/MobileSentrix) are approximating from the supply side.
export function smartReorderSuggestions(
  items: InventoryItem[],
  transactions: InventoryTransaction[],
  stock: InventoryStock[],
  { windowDays = 30, leadTimeWeeks = 3, targetCoverWeeks = 6 }: { windowDays?: number; leadTimeWeeks?: number; targetCoverWeeks?: number } = {}
): SmartReorderSuggestion[] {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const issuedByItem = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "issue") continue;
    if (new Date(t.timestamp).getTime() < cutoff) continue;
    issuedByItem.set(t.itemId, (issuedByItem.get(t.itemId) ?? 0) + t.qty);
  }
  const stockByItem = new Map<string, number>();
  for (const s of stock) stockByItem.set(s.itemId, (stockByItem.get(s.itemId) ?? 0) + s.qty);

  const weeks = windowDays / 7;
  const suggestions: SmartReorderSuggestion[] = [];
  for (const item of items) {
    const issued = issuedByItem.get(item.id) ?? 0;
    const currentStock = stockByItem.get(item.id) ?? 0;
    const weeklyVelocity = issued / weeks;
    const weeksOfCover = weeklyVelocity > 0 ? currentStock / weeklyVelocity : null;
    const needsReorder = weeklyVelocity > 0 ? weeksOfCover !== null && weeksOfCover < leadTimeWeeks : currentStock <= item.reorderLevel;
    if (!needsReorder) continue;
    const targetStock = weeklyVelocity > 0 ? Math.ceil(weeklyVelocity * targetCoverWeeks) : item.reorderLevel * 2;
    suggestions.push({
      item,
      currentStock,
      weeklyVelocity: Math.round(weeklyVelocity * 10) / 10,
      weeksOfCover: weeksOfCover != null ? Math.round(weeksOfCover * 10) / 10 : null,
      suggestedQty: Math.max(0, targetStock - currentStock),
    });
  }
  return suggestions.sort((a, b) => (a.weeksOfCover ?? 99) - (b.weeksOfCover ?? 99));
}
