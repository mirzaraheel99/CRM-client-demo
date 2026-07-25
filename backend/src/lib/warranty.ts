// Single source of truth for warranty math -- used both when an appliance is
// registered/edited (to set its stored snapshot) and, live, on every read and
// on job-type detection, so a product's status doesn't stay frozen forever if
// nobody happens to re-save its record after the manufacturer window lapses.
export function computeWarrantyStatus(purchaseDate: Date | string, warrantyMonths: number): "In Warranty" | "Out of Warranty" {
  const months = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return months < warrantyMonths ? "In Warranty" : "Out of Warranty";
}

// Whether a repair should be treated as covered (free to the customer) --
// broader than the manufacturer warranty alone: a product past its
// manufacturer window is still covered while an active, unexpired AMC /
// extended warranty is on file.
export function isUnderWarrantyCoverage(
  appliance: { purchaseDate: Date | string; amcActive?: boolean | null; amcExpiryDate?: Date | string | null },
  warrantyMonths: number
): boolean {
  if (computeWarrantyStatus(appliance.purchaseDate, warrantyMonths) === "In Warranty") return true;
  if (appliance.amcActive && appliance.amcExpiryDate && new Date(appliance.amcExpiryDate).getTime() >= Date.now()) return true;
  return false;
}
