// Which fields are mandatory on the New Job Card, Add Customer, and Add
// Product forms — admin-editable at runtime (see Settings > Required
// Fields), so this lives in mutable module state persisted under its own
// localStorage key, same pattern as permissions.ts. A handful of fields are
// "locked": the backend/business logic hard-requires them (e.g. a customer
// needs a phone number), so they can't be turned off by an admin.

export type RequiredFieldEntity = "customer" | "appliance" | "jobCardLine" | "serviceOrder";

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
};

export const REQUIRED_FIELD_DEFS: Record<RequiredFieldEntity, RequiredFieldDef[]> = {
  customer: [
    { key: "firstName", label: "First name", labelAr: "الاسم الأول", defaultRequired: true, locked: true },
    { key: "fatherName", label: "Father's name", labelAr: "اسم الأب", defaultRequired: false },
    { key: "familyName", label: "Family name", labelAr: "اسم العائلة", defaultRequired: true, locked: true },
    { key: "phone", label: "Mobile phone", labelAr: "الجوال", defaultRequired: true, locked: true },
    { key: "homePhone", label: "Home phone", labelAr: "الهاتف المنزلي", defaultRequired: false },
    { key: "whatsapp", label: "WhatsApp", labelAr: "واتساب", defaultRequired: false },
    { key: "email", label: "Email", labelAr: "البريد الإلكتروني", defaultRequired: false },
    { key: "address", label: "Address", labelAr: "العنوان", defaultRequired: false },
  ],
  appliance: [
    { key: "brandId", label: "Brand", labelAr: "العلامة التجارية", defaultRequired: true, locked: true },
    { key: "model", label: "Model", labelAr: "الطراز", defaultRequired: true, locked: true },
    { key: "serialNo", label: "Serial / unit number", labelAr: "الرقم التسلسلي", defaultRequired: true, locked: true },
    { key: "purchaseDate", label: "Purchase date", labelAr: "تاريخ الشراء", defaultRequired: true, locked: true },
    { key: "imeiNo", label: "IMEI", labelAr: "الآيمي", defaultRequired: false },
    { key: "purchaseInvoiceNo", label: "Purchase invoice no.", labelAr: "رقم فاتورة الشراء", defaultRequired: false },
    { key: "retailerName", label: "Retailer / dealer name", labelAr: "اسم المتجر / الموزع", defaultRequired: false },
    { key: "installedLocation", label: "Installed location at site", labelAr: "موقع التركيب في الموقع", defaultRequired: false },
  ],
  jobCardLine: [
    { key: "problem", label: "Reported problem", labelAr: "المشكلة المُبلّغ عنها", defaultRequired: true, locked: true },
    { key: "technicianId", label: "Assign technician", labelAr: "إسناد فني", defaultRequired: false },
  ],
  serviceOrder: [
    { key: "shortAddressCode", label: "Short address code", labelAr: "الرمز المختصر للعنوان", defaultRequired: false },
    { key: "buildingNo", label: "Building no.", labelAr: "رقم المبنى", defaultRequired: false },
    { key: "district", label: "District", labelAr: "الحي", defaultRequired: false },
    { key: "postalCode", label: "Postal code", labelAr: "الرمز البريدي", defaultRequired: false },
    { key: "additionalNo", label: "Additional no.", labelAr: "الرقم الإضافي", defaultRequired: false },
    { key: "requestSource", label: "Request source", labelAr: "مصدر الطلب", defaultRequired: false },
    { key: "preferredDate", label: "Preferred date", labelAr: "التاريخ المفضل", defaultRequired: false },
    { key: "preferredTimeSlot", label: "Preferred time slot", labelAr: "الفترة الزمنية المفضلة", defaultRequired: false },
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
