// Mirrors backend/src/lib/warranty.ts -- kept in sync by hand since the two
// runtimes don't share code. Single source of truth for "is this repair
// covered" on the frontend: broader than the manufacturer warranty alone, a
// product past its manufacturer window is still covered while an active,
// unexpired AMC / extended warranty is on file.
export function computeWarrantyStatus(purchaseDate: string, warrantyMonths: number): "In Warranty" | "Out of Warranty" {
  const months = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return months < warrantyMonths ? "In Warranty" : "Out of Warranty";
}

export function isUnderWarrantyCoverage(
  input: { purchaseDate: string; amcActive?: boolean; amcExpiryDate?: string },
  warrantyMonths: number
): boolean {
  if (!input.purchaseDate) return false;
  if (computeWarrantyStatus(input.purchaseDate, warrantyMonths) === "In Warranty") return true;
  if (input.amcActive && input.amcExpiryDate && new Date(input.amcExpiryDate).getTime() >= Date.now()) return true;
  return false;
}
