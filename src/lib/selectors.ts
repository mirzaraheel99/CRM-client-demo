import type { JobCard, JobStatus, InventoryItem, InventoryLocation, InventoryStock, Technician } from "./types";
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
