export type JobType = "warranty" | "non_warranty";

export type StageName =
  | "Received"
  | "Warranty Validation"
  | "Diagnosis"
  | "Estimate"
  | "Customer Approval"
  | "OEM Approval"
  | "Repair"
  | "QA"
  | "Ready for Handover"
  | "Delivered";

export type JobStatus =
  | "Received"
  | "In Diagnosis"
  | "Waiting Approval"
  | "In Repair"
  | "QA"
  | "Ready"
  | "Delivered";

export type Role = "front_desk" | "technician" | "supervisor" | "manager" | "admin";

export type Channel = "whatsapp" | "sms" | "email";

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export type CustomerType = "individual" | "corporate";
export type Gender = "male" | "female";
export type PreferredLanguage = "ar" | "en";

export interface Customer {
  id: string;
  documentNo: string;
  // Saudi naming convention: given name, father's name, grandfather's name
  // (commonly omitted), family/tribe name. Only applies to individual
  // customers — corporate customers use companyName/crNumber/vatNumber
  // instead. `name` is the composed full name (or the company name) kept
  // for display so the many read sites across the app don't need to
  // rebuild it from parts.
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  familyName?: string;
  name: string;
  // Arabic-script counterparts of the fields above, for staff who read/write
  // Arabic only. `nameAr` is the composed Arabic full name, mirroring `name`.
  firstNameAr?: string;
  fatherNameAr?: string;
  grandfatherNameAr?: string;
  familyNameAr?: string;
  nameAr?: string;
  phone: string;
  homePhone?: string;
  whatsapp: string;
  email: string;
  address: string;
  nationalId?: string;
  nationality?: string;
  preferredLanguage?: PreferredLanguage;
  customerType: CustomerType;
  companyName?: string;
  crNumber?: string;
  // Saudi VAT registration number (15 digits, starts/ends with 3) — required
  // for corporate customers to appear as the buyer on a standard tax invoice.
  vatNumber?: string;
  contactPersonName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  notes?: string;
  branchId: string;
  createdAt: string;
  whatsappVerified: boolean;
}

export interface Brand {
  id: string;
  name: string;
  nameAr?: string;
  warrantyMonths: number;
  rules: string;
}

// A soft reference by name (Appliance.category, Technician.skills are plain
// strings, not a foreign key) — admins can add a new category at runtime
// from the Categories page without any schema change.
export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  code?: string;
  description?: string;
  defaultWarrantyMonths?: number;
  createdAt: string;
}

export type ApplianceCategory = string;

export interface UnitOfMeasure {
  id: string;
  name: string;
  nameAr?: string;
  code?: string;
  unitType: "Base" | "Alternate";
  roundingType?: string;
  decimalPlaces: number;
  baseUnitName?: string;
  conversionFactor?: number;
  createdAt: string;
}

// Saudi Energy Efficiency Program (SEEP) star rating shown on the appliance label.
export type EnergyRating = 1 | 2 | 3 | 4 | 5;

export interface Appliance {
  id: string;
  documentNo: string;
  brandId: string;
  category: ApplianceCategory;
  model: string;
  modelAr?: string;
  serialNo: string;
  imeiNo?: string;
  purchaseDate: string;
  warrantyStatus: "In Warranty" | "Out of Warranty" | "Unknown";
  isSmartConnected: boolean;
  // Purchase & warranty proof
  purchaseInvoiceNo?: string;
  retailerName?: string;
  purchasePrice?: number;
  amcActive?: boolean;
  amcExpiryDate?: string;
  // Saudi compliance & specs
  sasoCertNo?: string;
  energyRating?: EnergyRating;
  countryOfManufacture?: string;
  color?: string;
  specification?: string;
  installationDate?: string;
  // Site & photo
  installedLocation?: string;
  photoUrl?: string;
  notes?: string;
}

// Simulated IoT telemetry — in production this would come from the brand's
// own platform (Samsung SmartThings, LG ThinQ, GE SmartHQ) via their service
// API, keyed by appliance serial number.
export interface ApplianceTelemetry {
  applianceId: string;
  lastErrorCode: string | null;
  lastErrorDescription: string | null;
  cycleCount: number;
  lastSyncAt: string;
}

export interface Technician {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  skills: ApplianceCategory[];
  zone: string;
  branchId: string;
  status: "Available" | "On Job" | "Off Duty";
  avatarColor: string;
  notes?: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  type: "store" | "van" | "branch";
  branchId: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  brand: string;
  partNo: string;
  unit?: string;
  unitPrice: number;
  reorderLevel: number;
  notes?: string;
}

export interface InventoryStock {
  itemId: string;
  locationId: string;
  qty: number;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  locationId: string;
  jobcardId?: string;
  type: "receive" | "issue" | "return" | "transfer" | "adjust";
  qty: number;
  timestamp: string;
  createdBy: string;
  destLocationId?: string;
  photoUrl?: string;
}

export interface JobCardStageHistory {
  id: string;
  jobcardId: string;
  stageName: StageName;
  changedBy: string;
  timestamp: string;
  notes: string;
  stageRefNo?: string;
}

export interface JobCardAttachment {
  id: string;
  jobcardId: string;
  stageName: StageName;
  fileUrl: string;
  label: string;
  uploadedBy: string;
  timestamp: string;
}

export interface JobCardPartUsed {
  id: string;
  jobcardId: string;
  itemId: string;
  locationId: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

// A quoted line on the estimate — distinct from JobCardPartUsed, which tracks
// parts actually issued from stock. An estimated part is a priced guess made
// before repair; it has no locationId because nothing has left inventory yet.
export type EstimateLineKind = "labor" | "part" | "other" | "discount";

export interface JobCardEstimateLine {
  id: string;
  jobcardId: string;
  kind: EstimateLineKind;
  catNo?: string;
  label: string;
  descriptionAr?: string;
  notes?: string;
  itemId?: string;
  qty: number;
  unitPrice: number;
  // Per-line discount amount (SAR), distinct from a standalone "discount"
  // kind line — this shaves an amount off THIS line's gross (qty * unitPrice).
  discountAmount?: number;
  totalPrice: number;
}

export interface RemovedPart {
  id: string;
  jobcardId: string;
  description: string;
  serialNo?: string;
  removedAt: string;
  removedBy: string;
  customerNotifiedAt?: string;
  returnStatus: "pending" | "returned_to_customer" | "customer_declined";
  returnConfirmedAt?: string;
  returnConfirmedBy?: string;
}

export interface PurchaseBill {
  id: string;
  jobcardId: string;
  billNo: string;
  billDate: string;
  vendorName: string;
}

export interface CommunicationLog {
  id: string;
  jobcardId?: string;
  customerId: string;
  applianceId?: string;
  stageName?: StageName;
  channel: Channel;
  to: string;
  message: string;
  status: "sent" | "delivered" | "failed" | "read";
  timestamp: string;
}

export type RequestSource = "walk_in" | "phone" | "whatsapp" | "app" | "referral";

export interface ServiceOrder {
  id: string;
  documentNo: string;
  customerId: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
  // Saudi National Address (Saudi Post) for the service location
  shortAddressCode?: string;
  buildingNo?: string;
  unitNo?: string;
  district?: string;
  postalCode?: string;
  additionalNo?: string;
  // Intake
  requestSource?: RequestSource;
  preferredDate?: string;
  preferredTimeSlot?: string;
  buyerVatNumber?: string;
}

export interface JobCard {
  id: string;
  serviceOrderId: string;
  sequenceNo: number;
  documentNo: string;
  invoiceNo: string;
  customerId: string;
  applianceId: string;
  technicianId: string | null;
  branchId: string;
  jobType: JobType;
  status: JobStatus;
  currentStage: StageName;
  problemDescription: string;
  estimateAmount: number | null;
  finalAmount: number | null;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  customerApproved: boolean | null;
  diagnosisNotes: string | null;
  repairNotes: string | null;
  qaApproved: boolean;
  customerSignature: string | null;
  oemClaimNo?: string;
  estimateValidUntil?: string;
  estimatePreparedBy?: string;
  estimateTermsOfPayment?: string;
  estimatePoNumber?: string;
  estimateNotes?: string;
  estimatePreviousQuoteNo?: string;
  estimateCustomerRequest?: string;
  estimateDeliveryLeadTime?: string;
  estimateSubject?: string;
  assetReceivedRef?: string;
  assetReceivedBy?: string;
  assetReceivedAt?: string;
  assetHandedOver: boolean;
  assetHandedOverRef?: string;
  assetHandedOverAt?: string;
  assetHandedOverBy?: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface WorkflowStep {
  stepOrder: number;
  stepName: StageName;
  mandatoryFields: string[];
  approvalRequired: boolean;
  approverRole: string | null;
  triggers: { whatsapp: boolean; sms: boolean; email: boolean };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  jobType: JobType;
  active: boolean;
  description: string;
  steps: WorkflowStep[];
}

// Client-side-only demo credentials — this app has no backend, so authentication
// is simulated for the purpose of demonstrating role-gated UI, not real security.
export interface DemoUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  branchId: string;
}

export type PaymentMethod = "mada" | "apple_pay" | "stc_pay" | "tabby" | "tamara" | "cash";

export interface Payment {
  id: string;
  jobcardId: string;
  method: PaymentMethod;
  amount: number;
  installments?: number;
  status: "paid" | "failed";
  timestamp: string;
}
