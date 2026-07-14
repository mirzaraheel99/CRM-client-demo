import type { Appliance, ApplianceCategory, EnergyRating } from "./types";

// Shared by every place a product unit gets registered — the standalone
// Product Registry, the New Service Order inline registration, and the
// Job Card Detail "Add Product" flow — so the field set and parsing logic
// live in exactly one place.
export type ApplianceFormState = {
  brandId: string;
  category: ApplianceCategory;
  model: string;
  modelAr: string;
  serialNo: string;
  imeiNo: string;
  purchaseDate: string;
  purchaseInvoiceNo: string;
  retailerName: string;
  purchasePrice: string;
  amcActive: boolean;
  amcExpiryDate: string;
  sasoCertNo: string;
  energyRating: "" | "1" | "2" | "3" | "4" | "5";
  countryOfManufacture: string;
  color: string;
  specification: string;
  installationDate: string;
  installedLocation: string;
  photoUrl: string;
};

export const APPLIANCE_CATEGORIES: ApplianceCategory[] = ["AC", "Refrigerator", "Washer", "Mobile", "TV", "Microwave"];

export function emptyApplianceForm(category: ApplianceCategory = "AC"): ApplianceFormState {
  return {
    brandId: "",
    category,
    model: "",
    modelAr: "",
    serialNo: "",
    imeiNo: "",
    purchaseDate: "",
    purchaseInvoiceNo: "",
    retailerName: "",
    purchasePrice: "",
    amcActive: false,
    amcExpiryDate: "",
    sasoCertNo: "",
    energyRating: "",
    countryOfManufacture: "",
    color: "",
    specification: "",
    installationDate: "",
    installedLocation: "",
    photoUrl: "",
  };
}

export function applianceFormToInput(form: ApplianceFormState): Omit<Appliance, "id" | "documentNo" | "warrantyStatus"> {
  return {
    brandId: form.brandId,
    category: form.category,
    model: form.model.trim(),
    modelAr: form.modelAr.trim() || undefined,
    serialNo: form.serialNo.trim(),
    imeiNo: form.imeiNo.trim() || undefined,
    purchaseDate: form.purchaseDate,
    isSmartConnected: false,
    purchaseInvoiceNo: form.purchaseInvoiceNo.trim() || undefined,
    retailerName: form.retailerName.trim() || undefined,
    purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
    amcActive: form.amcActive || undefined,
    amcExpiryDate: form.amcActive ? (form.amcExpiryDate || undefined) : undefined,
    sasoCertNo: form.sasoCertNo.trim() || undefined,
    energyRating: form.energyRating ? (Number(form.energyRating) as EnergyRating) : undefined,
    countryOfManufacture: form.countryOfManufacture.trim() || undefined,
    color: form.color.trim() || undefined,
    specification: form.specification.trim() || undefined,
    installationDate: form.installationDate || undefined,
    installedLocation: form.installedLocation.trim() || undefined,
    photoUrl: form.photoUrl || undefined,
  };
}
