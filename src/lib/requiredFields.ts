// Which fields are mandatory on the New Job Card, Add Customer, and Add
// Product forms — admin-editable at runtime (see Settings > Required
// Fields), so this lives in mutable module state persisted under its own
// localStorage key, same pattern as permissions.ts. A handful of fields are
// "locked": the backend/business logic hard-requires them (e.g. a customer
// needs a phone number), so they can't be turned off by an admin.

export type RequiredFieldEntity = "customer" | "appliance" | "jobCardLine" | "serviceOrder" | "jobCardStage" | "inventoryItem";

export interface RequiredFieldDef {
  key: string;
  label: string;
  labelAr: string;
  defaultRequired: boolean;
  locked?: boolean;
}

export const REQUIRED_FIELD_ENTITY_LABEL: Record<RequiredFieldEntity, { en: string; ar: string }> = {
  customer: { en: "Customer", ar: "العميل" },
  appliance: { en: "Product / Appliance", ar: "المنتج / الجهاز" },
  jobCardLine: { en: "Job details", ar: "تفاصيل المهمة" },
  serviceOrder: { en: "Service address & intake", ar: "عنوان الخدمة والاستلام" },
  jobCardStage: { en: "Job Card workflow (Diagnosis, Repair, Handover)", ar: "سير عمل بطاقة العمل (التشخيص، الإصلاح، التسليم)" },
  inventoryItem: { en: "Inventory item", ar: "صنف المخزون" },
};

export const REQUIRED_FIELD_DEFS: Record<RequiredFieldEntity, RequiredFieldDef[]> = {
  customer: [
    { key: "firstName", label: "First name (individual)", labelAr: "الاسم الأول (فرد)", defaultRequired: true, locked: true },
    { key: "fatherName", label: "Father's name (individual)", labelAr: "اسم الأب (فرد)", defaultRequired: false },
    { key: "grandfatherName", label: "Grandfather's name (individual)", labelAr: "اسم الجد (فرد)", defaultRequired: false },
    { key: "familyName", label: "Family name (individual)", labelAr: "اسم العائلة (فرد)", defaultRequired: true, locked: true },
    { key: "companyName", label: "Company name (corporate)", labelAr: "اسم الشركة (شركة)", defaultRequired: true, locked: true },
    { key: "crNumber", label: "CR number (corporate)", labelAr: "رقم السجل التجاري (شركة)", defaultRequired: true, locked: true },
    { key: "vatNumber", label: "VAT registration number (corporate)", labelAr: "الرقم الضريبي (شركة)", defaultRequired: true, locked: true },
    { key: "contactPersonName", label: "Contact person name (corporate)", labelAr: "اسم الشخص المسؤول (شركة)", defaultRequired: false },
    { key: "phone", label: "Mobile phone", labelAr: "الجوال", defaultRequired: true, locked: true },
    { key: "homePhone", label: "Home phone", labelAr: "الهاتف المنزلي", defaultRequired: false },
    { key: "whatsapp", label: "WhatsApp", labelAr: "واتساب", defaultRequired: false },
    { key: "email", label: "Email", labelAr: "البريد الإلكتروني", defaultRequired: false },
    { key: "address", label: "Address", labelAr: "العنوان", defaultRequired: false },
    { key: "nationalId", label: "National ID / Iqama no.", labelAr: "رقم الهوية / الإقامة", defaultRequired: false },
    { key: "nationality", label: "Nationality", labelAr: "الجنسية", defaultRequired: false },
    { key: "preferredLanguage", label: "Preferred language", labelAr: "اللغة المفضلة", defaultRequired: false },
    { key: "dateOfBirth", label: "Date of birth", labelAr: "تاريخ الميلاد", defaultRequired: false },
    { key: "gender", label: "Gender", labelAr: "الجنس", defaultRequired: false },
    { key: "notes", label: "Notes", labelAr: "ملاحظات", defaultRequired: false },
  ],
  appliance: [
    { key: "brandId", label: "Brand", labelAr: "العلامة التجارية", defaultRequired: true, locked: true },
    { key: "category", label: "Category", labelAr: "الفئة", defaultRequired: false },
    { key: "model", label: "Model", labelAr: "الطراز", defaultRequired: true, locked: true },
    { key: "serialNo", label: "Serial / unit number", labelAr: "الرقم التسلسلي", defaultRequired: true },
    { key: "purchaseDate", label: "Purchase date", labelAr: "تاريخ الشراء", defaultRequired: true, locked: true },
    { key: "imeiNo", label: "IMEI", labelAr: "الآيمي", defaultRequired: false },
    { key: "purchaseInvoiceNo", label: "Purchase invoice no.", labelAr: "رقم فاتورة الشراء", defaultRequired: false },
    { key: "retailerName", label: "Retailer / dealer name", labelAr: "اسم المتجر / الموزع", defaultRequired: false },
    { key: "purchasePrice", label: "Purchase price", labelAr: "سعر الشراء", defaultRequired: false },
    { key: "amcExpiryDate", label: "AMC / extended warranty expiry", labelAr: "تاريخ انتهاء عقد الصيانة", defaultRequired: false },
    { key: "sasoCertNo", label: "SASO certification no.", labelAr: "رقم شهادة سابر", defaultRequired: false },
    { key: "energyRating", label: "Energy efficiency rating", labelAr: "تصنيف كفاءة الطاقة", defaultRequired: false },
    { key: "countryOfManufacture", label: "Country of manufacture", labelAr: "بلد الصنع", defaultRequired: false },
    { key: "color", label: "Color", labelAr: "اللون", defaultRequired: false },
    { key: "specification", label: "Specification / capacity", labelAr: "المواصفات / السعة", defaultRequired: false },
    { key: "installationDate", label: "Installation date", labelAr: "تاريخ التركيب", defaultRequired: false },
    { key: "installedLocation", label: "Installed location at site", labelAr: "موقع التركيب في الموقع", defaultRequired: false },
    { key: "photoUrl", label: "Product / serial-plate photo", labelAr: "صورة المنتج / لوحة الرقم التسلسلي", defaultRequired: false },
    { key: "notes", label: "Notes", labelAr: "ملاحظات", defaultRequired: false },
  ],
  jobCardLine: [
    { key: "problem", label: "Reported problem", labelAr: "المشكلة المُبلّغ عنها", defaultRequired: true, locked: true },
    { key: "technicianId", label: "Assign technician", labelAr: "إسناد فني", defaultRequired: false },
  ],
  serviceOrder: [
    { key: "shortAddressCode", label: "Short address code", labelAr: "الرمز المختصر للعنوان", defaultRequired: false },
    { key: "buildingNo", label: "Building no.", labelAr: "رقم المبنى", defaultRequired: false },
    { key: "unitNo", label: "Unit no.", labelAr: "رقم الوحدة", defaultRequired: false },
    { key: "district", label: "District", labelAr: "الحي", defaultRequired: false },
    { key: "postalCode", label: "Postal code", labelAr: "الرمز البريدي", defaultRequired: false },
    { key: "additionalNo", label: "Additional no.", labelAr: "الرقم الإضافي", defaultRequired: false },
    { key: "requestSource", label: "Request source", labelAr: "مصدر الطلب", defaultRequired: false },
    { key: "preferredDate", label: "Preferred date", labelAr: "التاريخ المفضل", defaultRequired: false },
    { key: "preferredTimeSlot", label: "Preferred time slot", labelAr: "الفترة الزمنية المفضلة", defaultRequired: false },
    { key: "buyerVatNumber", label: "Buyer VAT number (corporate)", labelAr: "الرقم الضريبي للمشتري (شركة)", defaultRequired: false },
  ],
  // These gate whether the job can advance past that stage on the Job Card
  // Detail page, in addition to just showing an asterisk — turning one off
  // both hides the asterisk and removes it from the "must complete before
  // advancing" checklist (see stageRequirements in workflow.ts).
  jobCardStage: [
    { key: "diagnosisNotes", label: "Diagnosis notes", labelAr: "ملاحظات التشخيص", defaultRequired: true },
    { key: "estimateAmount", label: "Estimate confirmed (Estimate stage, zero counts as covered)", labelAr: "تأكيد التقدير (مرحلة التقدير، الصفر يُعد مغطى)", defaultRequired: true },
    { key: "repairNotes", label: "Repair notes", labelAr: "ملاحظات الإصلاح", defaultRequired: true },
    { key: "purchaseBill", label: "Purchase bill (Warranty Validation)", labelAr: "فاتورة الشراء (التحقق من الضمان)", defaultRequired: true },
    { key: "finalAmount", label: "Final amount (non-warranty jobs)", labelAr: "المبلغ النهائي (المهام بدون ضمان)", defaultRequired: true },
    { key: "customerSignature", label: "Customer signature", labelAr: "توقيع العميل", defaultRequired: true },
  ],
  inventoryItem: [
    { key: "name", label: "Name", labelAr: "الاسم", defaultRequired: true, locked: true },
    { key: "nameAr", label: "Arabic alias", labelAr: "الاسم بالعربية", defaultRequired: false },
    { key: "partNo", label: "Part no.", labelAr: "رقم القطعة", defaultRequired: true, locked: true },
    { key: "brand", label: "Brand", labelAr: "العلامة التجارية", defaultRequired: false },
    { key: "unit", label: "Unit of measure", labelAr: "وحدة القياس", defaultRequired: false },
    { key: "unitPrice", label: "Unit price", labelAr: "سعر الوحدة", defaultRequired: false },
    { key: "reorderLevel", label: "Reorder level", labelAr: "حد إعادة الطلب", defaultRequired: false },
    { key: "notes", label: "Notes", labelAr: "ملاحظات", defaultRequired: false },
  ],
};

const REQUIRED_FIELDS_STORAGE_KEY = "crm-demo-required-fields-v1";

function fieldKey(entity: RequiredFieldEntity, key: string): string {
  return `${entity}.${key}`;
}

function defaultState(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [entity, defs] of Object.entries(REQUIRED_FIELD_DEFS)) {
    for (const def of defs) result[fieldKey(entity as RequiredFieldEntity, def.key)] = def.defaultRequired;
  }
  return result;
}

function loadStoredState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(REQUIRED_FIELDS_STORAGE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw) as Record<string, boolean>;
    return { ...defaultState(), ...saved };
  } catch {
    return defaultState();
  }
}

let REQUIRED_STATE: Record<string, boolean> = loadStoredState();

export function isFieldRequired(entity: RequiredFieldEntity, key: string): boolean {
  return REQUIRED_STATE[fieldKey(entity, key)] ?? false;
}

export function isFieldLocked(entity: RequiredFieldEntity, key: string): boolean {
  return Boolean(REQUIRED_FIELD_DEFS[entity].find((def) => def.key === key)?.locked);
}

export function setFieldRequired(entity: RequiredFieldEntity, key: string, required: boolean): void {
  if (isFieldLocked(entity, key)) return;
  REQUIRED_STATE = { ...REQUIRED_STATE, [fieldKey(entity, key)]: required };
  try {
    localStorage.setItem(REQUIRED_FIELDS_STORAGE_KEY, JSON.stringify(REQUIRED_STATE));
  } catch {
    /* ignore storage failures (private browsing, quota, etc.) */
  }
}

export function resetRequiredFields(): void {
  REQUIRED_STATE = defaultState();
  try {
    localStorage.removeItem(REQUIRED_FIELDS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// Given the current form values for an entity, returns the field definitions
// that are required but still empty — used both to gate submit and to list
// what's missing.
export function getMissingRequiredFields(entity: RequiredFieldEntity, values: Record<string, unknown>): RequiredFieldDef[] {
  return REQUIRED_FIELD_DEFS[entity].filter((def) => {
    if (!isFieldRequired(entity, def.key)) return false;
    const value = values[def.key];
    if (typeof value === "string") return !value.trim();
    return value === undefined || value === null || value === "";
  });
}

// The customer entity's identity fields branch by customerType: an individual
// customer never has companyName/crNumber/vatNumber, and a corporate customer
// never has firstName/fatherName/familyName. Excluding whichever branch
// doesn't apply keeps getMissingRequiredFields from demanding both at once.
const CUSTOMER_INDIVIDUAL_ONLY_KEYS = ["firstName", "fatherName", "grandfatherName", "familyName", "nationalId", "nationality", "dateOfBirth", "gender"];
const CUSTOMER_CORPORATE_ONLY_KEYS = ["companyName", "crNumber", "vatNumber", "contactPersonName"];

export function getMissingCustomerFields(customerType: "individual" | "corporate", values: Record<string, unknown>): RequiredFieldDef[] {
  const excludedKeys = customerType === "corporate" ? CUSTOMER_INDIVIDUAL_ONLY_KEYS : CUSTOMER_CORPORATE_ONLY_KEYS;
  return getMissingRequiredFields("customer", values).filter((def) => !excludedKeys.includes(def.key));
}
