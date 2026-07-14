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
  // (commonly omitted), family/tribe name. `name` is the composed full name
  // kept for display so the many read sites across the app don't need to
  // rebuild it from parts.
  firstName: string;
  fatherName: string;
  grandfatherName?: string;
  familyName: string;
  name: string;
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
  warrantyMonths: number;
  rules: string;
}

export type ApplianceCategory = "AC" | "Refrigerator" | "Washer" | "Mobile" | "TV" | "Microwave";

export interface Appliance {
  id: string;
  documentNo: string;
  brandId: string;
  category: ApplianceCategory;
  model: string;
  serialNo: string;
  imeiNo?: string;
  purchaseDate: string;
  warrantyStatus: "In Warranty" | "Out of Warranty" | "Unknown";
  isSmartConnected: boolean;
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
  phone: string;
  skills: ApplianceCategory[];
  zone: string;
  branchId: string;
  status: "Available" | "On Job" | "Off Duty";
  avatarColor: string;
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
  unitPrice: number;
  reorderLevel: number;
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

export interface ServiceOrder {
  id: string;
  documentNo: string;
  customerId: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
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
