import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as seed from "./seed";
import { canAdvanceCurrentStage, canPerform, syncActionRolesFromServer, type DemoAction } from "./permissions";
import { setFieldRequired as setFieldRequiredRaw, resetRequiredFields as resetRequiredFieldsRaw, type RequiredFieldEntity } from "./requiredFields";
import { MESSAGE_TEMPLATES, renderTemplate } from "./templates";
import { formatDate } from "./utils";
import { api, ApiError, getToken, setToken } from "./api";
import type {
  ActionResult, Customer, Appliance, ApplianceTelemetry, Brand, Category, UnitOfMeasure, Technician, InventoryItem, InventoryLocation,
  InventoryStock, InventoryTransaction, JobCard, JobCardStageHistory,
  JobCardAttachment, JobCardPartUsed, JobCardEstimateLine, EstimateLineKind, PurchaseBill, CommunicationLog,
  WorkflowDefinition, Role, StageName, Branch, Payment, PaymentMethod, Channel, ServiceOrder, RemovedPart, RequestSource, DemoUser,
} from "./types";

export interface LicenseStatus {
  valid: boolean;
  reason?: string;
  customerName?: string;
  expiresAt?: string;
  daysRemaining?: number;
}

type JobResult = ActionResult & { job?: JobCard };
type ServiceOrderResult = ActionResult & { serviceOrder?: ServiceOrder; jobs?: JobCard[] };
type PaymentResult = ActionResult & { payment?: Payment };
type ServiceOrderLineInput = {
  applianceId: string;
  jobType: JobCard["jobType"];
  problemDescription: string;
  technicianId?: string | null;
};

interface DemoState {
  branches: Branch[];
  customers: Customer[];
  brands: Brand[];
  categories: Category[];
  units: UnitOfMeasure[];
  appliances: Appliance[];
  applianceTelemetry: ApplianceTelemetry[];
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  inventoryLocations: InventoryLocation[];
  inventoryStock: InventoryStock[];
  inventoryTransactions: InventoryTransaction[];
  serviceOrders: ServiceOrder[];
  jobCards: JobCard[];
  stageHistory: JobCardStageHistory[];
  attachments: JobCardAttachment[];
  partsUsed: JobCardPartUsed[];
  estimateLineItems: JobCardEstimateLine[];
  purchaseBills: PurchaseBill[];
  communicationLogs: CommunicationLog[];
  workflows: WorkflowDefinition[];
  payments: Payment[];
  removedParts: RemovedPart[];

  currentUser: (Omit<DemoUser, "password">) | null;
  token: string | null;
  hydrated: boolean;
  hydrating: boolean;
  sessionChecked: boolean;
  licenseStatus: LicenseStatus | null;
  licenseChecked: boolean;
  checkLicense: () => Promise<void>;
  role: Role;
  selectedBranchId: string | "all";
  theme: "light" | "dark";
  lang: "en" | "ar";
  sidebarCollapsed: boolean;
  maintenanceRemindersSent: Record<string, string>;
  aliasFieldsEnabled: boolean;
  permissionsVersion: number;
  requiredFieldsVersion: number;

  setRole: (role: Role) => void;
  setBranch: (branchId: string | "all") => void;
  setTheme: (theme: "light" | "dark") => void;
  setLang: (lang: "en" | "ar") => void;
  toggleSidebar: () => void;
  setAliasFieldsEnabled: (enabled: boolean) => ActionResult;
  login: (username: string, password: string) => Promise<ActionResult>;
  logout: () => void;
  bootstrap: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateRolePermission: (action: DemoAction, targetRole: Role, allowed: boolean) => Promise<ActionResult>;
  resetRolePermissions: () => Promise<ActionResult>;
  setFieldRequired: (entity: RequiredFieldEntity, key: string, required: boolean) => ActionResult;
  resetRequiredFields: () => ActionResult;

  addCustomer: (customer: Omit<Customer, "id" | "documentNo" | "createdAt" | "whatsappVerified" | "name">) => Promise<Customer>;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id" | "documentNo" | "createdAt" | "whatsappVerified" | "name">>) => Promise<ActionResult>;
  deleteCustomer: (id: string) => Promise<ActionResult>;
  verifyWhatsapp: (customerId: string) => void;
  addAppliance: (appliance: Omit<Appliance, "id" | "documentNo">) => Promise<Appliance>;
  updateAppliance: (id: string, patch: Partial<Omit<Appliance, "id" | "documentNo">>) => Promise<ActionResult>;
  deleteAppliance: (id: string) => Promise<ActionResult>;
  addBrand: (brand: Omit<Brand, "id">) => Promise<Brand>;
  updateBrand: (id: string, patch: Partial<Omit<Brand, "id">>) => Promise<ActionResult>;
  deleteBrand: (id: string) => Promise<ActionResult>;
  addCategory: (category: Omit<Category, "id" | "createdAt">) => Promise<ActionResult>;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "createdAt">>) => Promise<ActionResult>;
  deleteCategory: (id: string) => Promise<ActionResult>;
  addUnit: (unit: Omit<UnitOfMeasure, "id" | "createdAt">) => Promise<ActionResult>;
  updateUnit: (id: string, patch: Partial<Omit<UnitOfMeasure, "id" | "createdAt">>) => Promise<ActionResult>;
  deleteUnit: (id: string) => Promise<ActionResult>;
  addTechnician: (technician: Omit<Technician, "id">) => Promise<Technician>;
  updateTechnician: (id: string, patch: Partial<Omit<Technician, "id">>) => Promise<ActionResult>;
  deleteTechnician: (id: string) => Promise<ActionResult>;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => InventoryItem;
  updateInventoryItem: (id: string, patch: Partial<Omit<InventoryItem, "id">>) => ActionResult;
  deleteInventoryItem: (id: string) => ActionResult;
  addInventoryTransaction: (transaction: Omit<InventoryTransaction, "id" | "timestamp">) => ActionResult;

  createServiceOrder: (input: {
    customerId: string;
    branchId: string;
    lines: ServiceOrderLineInput[];
    shortAddressCode?: string;
    buildingNo?: string;
    unitNo?: string;
    district?: string;
    postalCode?: string;
    additionalNo?: string;
    requestSource?: RequestSource;
    preferredDate?: string;
    preferredTimeSlot?: string;
    buyerVatNumber?: string;
  }) => Promise<ServiceOrderResult>;
  addProductToOrder: (input: {
    serviceOrderId: string;
    applianceId: string;
    jobType: JobCard["jobType"];
    problemDescription: string;
    technicianId?: string | null;
  }) => Promise<JobResult>;
  createJobCard: (input: {
    customerId: string;
    applianceId: string;
    jobType: JobCard["jobType"];
    problemDescription: string;
    branchId: string;
  }) => Promise<JobResult>;
  advanceStage: (jobcardId: string, stage: StageName, notes: string, changedBy: string) => Promise<ActionResult>;
  assignTechnician: (jobcardId: string, technicianId: string) => Promise<ActionResult>;
  setDiagnosis: (jobcardId: string, notes: string) => Promise<ActionResult>;
  addEstimateLine: (jobcardId: string, input: { kind: EstimateLineKind; label: string; descriptionAr?: string; catNo?: string; notes?: string; itemId?: string; qty: number; unitPrice: number; discountAmount?: number }) => Promise<ActionResult>;
  updateEstimateLine: (lineId: string, patch: { qty?: number; unitPrice?: number; label?: string; descriptionAr?: string; catNo?: string; notes?: string; discountAmount?: number }) => Promise<ActionResult>;
  removeEstimateLine: (lineId: string) => Promise<ActionResult>;
  setEstimateValidUntil: (jobcardId: string, date: string) => Promise<ActionResult>;
  setEstimateHeader: (jobcardId: string, patch: { preparedBy?: string; termsOfPayment?: string; poNumber?: string; notes?: string; previousQuoteNo?: string; customerRequest?: string; deliveryLeadTime?: string; subject?: string }) => Promise<ActionResult>;
  approveCustomer: (jobcardId: string, approved: boolean, source?: "internal" | "customer") => Promise<ActionResult>;
  setRepairNotes: (jobcardId: string, notes: string) => Promise<ActionResult>;
  setQaApproved: (jobcardId: string, approved: boolean) => Promise<ActionResult>;
  setFinalAmount: (jobcardId: string, amount: number) => Promise<ActionResult>;
  captureCustomerSignature: (jobcardId: string, signature: string) => Promise<ActionResult>;
  confirmAssetReceived: (jobcardId: string, ref: string, receivedBy: string) => Promise<ActionResult>;
  confirmAssetHandover: (jobcardId: string, ref: string, confirmedBy: string) => Promise<ActionResult>;
  savePurchaseBill: (jobcardId: string, bill: Omit<PurchaseBill, "id" | "jobcardId">) => ActionResult;
  addPartUsed: (jobcardId: string, itemId: string, qty: number) => ActionResult;
  removePartUsed: (partUsedId: string) => ActionResult;
  addAttachment: (jobcardId: string, stageName: StageName, label: string, fileUrl?: string) => ActionResult;
  sendCommunication: (jobcardId: string, channel: CommunicationLog["channel"], message: string) => ActionResult;
  retryCommunication: (logId: string) => ActionResult;
  updateWorkflowStep: (workflowId: string, stepOrder: number, patch: Partial<WorkflowDefinition["steps"][number]>) => ActionResult;
  addWorkflowStep: (workflowId: string, step: WorkflowDefinition["steps"][number]) => ActionResult;
  sendMaintenanceReminder: (applianceId: string) => ActionResult;
  recordPayment: (jobcardId: string, method: PaymentMethod, amount: number, installments?: number, source?: "internal" | "customer") => PaymentResult;

  logRemovedPart: (jobcardId: string, description: string, serialNo: string | undefined) => Promise<ActionResult>;
  notifyCustomerOfRemovedPart: (removedPartId: string) => Promise<ActionResult>;
  confirmPartReturned: (removedPartId: string) => Promise<ActionResult>;
}

const COUNTER_START = 100000;
let counter = COUNTER_START;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function clone<T>(value: T): T {
  return structuredClone(value);
}

// Branches, customers, brands, appliances, technicians, service orders, job
// cards, removed parts, and estimate line items are now real, server-persisted
// data (fetched via hydrate() after login) rather than mock seed data, so
// they start empty here. Everything else below has no backend yet (Phase 2),
// so it keeps running on the original browser-only mock seed exactly as before.
const initialSlice = () => ({
  branches: [] as Branch[],
  customers: [] as Customer[],
  brands: [] as Brand[],
  categories: [] as Category[],
  units: [] as UnitOfMeasure[],
  appliances: [] as Appliance[],
  applianceTelemetry: clone(seed.APPLIANCE_TELEMETRY),
  technicians: [] as Technician[],
  inventoryItems: clone(seed.INVENTORY_ITEMS),
  inventoryLocations: clone(seed.INVENTORY_LOCATIONS),
  inventoryStock: clone(seed.INVENTORY_STOCK),
  inventoryTransactions: clone(seed.INVENTORY_TRANSACTIONS),
  serviceOrders: [] as ServiceOrder[],
  jobCards: [] as JobCard[],
  stageHistory: [] as JobCardStageHistory[],
  removedParts: [] as RemovedPart[],
  attachments: clone(seed.ATTACHMENTS),
  partsUsed: clone(seed.PARTS_USED),
  estimateLineItems: [] as JobCardEstimateLine[],
  purchaseBills: clone(seed.PURCHASE_BILLS),
  communicationLogs: clone(seed.COMMUNICATION_LOGS),
  workflows: clone(seed.WORKFLOWS),
  payments: clone(seed.PAYMENTS),
});

const STAGE_TEMPLATE: Partial<Record<StageName, string>> = {
  Received: "received",
  "Customer Approval": "estimate_ready",
  "Ready for Handover": "repair_complete",
  Delivered: "delivered",
};

function contactFor(channel: Channel, customer: Customer) {
  if (channel === "email") return customer.email;
  if (channel === "whatsapp") return customer.whatsapp;
  return customer.phone;
}

function buildTriggeredLogs(state: DemoState, job: JobCard, stageName: StageName, timestamp: string) {
  const workflow = state.workflows.find((candidate) => candidate.active && candidate.jobType === job.jobType);
  const step = workflow?.steps.find((candidate) => candidate.stepName === stageName);
  const templateId = STAGE_TEMPLATE[stageName];
  const template = MESSAGE_TEMPLATES.find((candidate) => candidate.id === templateId);
  const customer = state.customers.find((candidate) => candidate.id === job.customerId);
  const appliance = state.appliances.find((candidate) => candidate.id === job.applianceId);
  if (!step || !template || !customer || !appliance) return [];

  const channels = (Object.keys(step.triggers) as Channel[]).filter((channel) => step.triggers[channel] && template.channels.includes(channel));
  return channels.map<CommunicationLog>((channel) => ({
    id: nextId("comm"),
    jobcardId: job.id,
    customerId: customer.id,
    applianceId: appliance.id,
    stageName,
    channel,
    to: contactFor(channel, customer),
    message: renderTemplate(template.body, {
      customer: customer.name.split(" ")[0],
      appliance: appliance.model,
      jobId: job.documentNo,
      amount: job.estimateAmount == null ? "pending" : `SAR ${job.estimateAmount.toLocaleString()}`,
      validUntil: job.estimateValidUntil ? formatDate(job.estimateValidUntil) : "further notice",
    }),
    status: "sent",
    timestamp,
  }));
}

// Estimates can be built or amended at any stage once diagnosis notes exist
// (the job has been looked at) — revisiting it after repair, QA, etc. is
// expected, e.g. when repair turns up an additional need.
function canEditEstimate(job: JobCard): boolean {
  return Boolean(job.diagnosisNotes?.trim());
}

function scheduleCommunicationReceipts(logs: CommunicationLog[], options: { allowFailure?: boolean } = {}) {
  const allowFailure = options.allowFailure ?? true;
  for (const log of logs) {
    const setStatus = (status: CommunicationLog["status"]) => {
      useStore.setState((state) => ({
        communicationLogs: state.communicationLogs.map((communication) => communication.id === log.id ? { ...communication, status } : communication),
      }));
    };
    setTimeout(() => {
      // Real carrier/API delivery isn't 100% — simulate an occasional failure
      // (bad number, gateway timeout) so the "failed" status and retry flow
      // are genuinely reachable instead of purely decorative.
      const failed = allowFailure && Math.random() < 0.07;
      setStatus(failed ? "failed" : "delivered");
      if (!failed && log.channel === "whatsapp") setTimeout(() => setStatus("read"), 3300);
    }, 2200);
  }
}

function result(ok: boolean, message: string): ActionResult {
  return { ok, message };
}

export const useStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialSlice(),
      currentUser: null,
      token: null,
      hydrated: false,
      hydrating: false,
      sessionChecked: false,
      licenseStatus: null,
      licenseChecked: false,
      checkLicense: async () => {
        try {
          const status = await api.get<LicenseStatus>("/api/license/status");
          set({ licenseStatus: status, licenseChecked: true });
        } catch {
          set({ licenseStatus: { valid: false, reason: "Could not reach the license server." }, licenseChecked: true });
        }
      },
      role: "admin",
      selectedBranchId: "all",
      theme: "light",
      lang: "en",
      sidebarCollapsed: false,
      maintenanceRemindersSent: {},
      aliasFieldsEnabled: true,
      permissionsVersion: 0,
      requiredFieldsVersion: 0,

      setRole: (role) => set({ role }),
      setBranch: (selectedBranchId) => set({ selectedBranchId }),
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      login: async (username, password) => {
        try {
          const response = await api.post<{ ok: boolean; message: string; token: string; user: Omit<DemoUser, "password"> }>(
            "/api/auth/login",
            { username: username.trim(), password }
          );
          setToken(response.token);
          set({ token: response.token, role: response.user.role, selectedBranchId: response.user.branchId });
          await get().hydrate();
          set({ currentUser: response.user });
          return result(true, response.message);
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Unable to sign in. Check your connection and try again.");
        }
      },
      logout: () => {
        setToken(null);
        set({ ...initialSlice(), currentUser: null, token: null, hydrated: false });
      },
      bootstrap: async () => {
        const token = getToken();
        if (!token) { set({ sessionChecked: true }); return; }
        set({ token });
        try {
          const user = await api.get<Omit<DemoUser, "password">>("/api/auth/me");
          await get().hydrate();
          set({ currentUser: user, role: user.role, selectedBranchId: user.branchId, sessionChecked: true });
        } catch {
          setToken(null);
          set({ token: null, currentUser: null, sessionChecked: true });
        }
      },
      hydrate: async () => {
        set({ hydrating: true });
        const state = get();
        // Each entity is fetched independently (not Promise.all) so that one
        // missing/failing endpoint — e.g. a backend that hasn't picked up a
        // brand-new route yet — can't blank out every other already-working
        // entity on screen. Any entity that fails to load keeps whatever it
        // already had rather than being wiped to empty.
        const fetchOr = async <T>(path: string, fallback: T): Promise<T> => {
          try {
            return await api.get<T>(path);
          } catch (err) {
            console.error(`hydrate: failed to load ${path}`, err);
            return fallback;
          }
        };
        const [branches, customers, brands, categories, units, technicians, appliances, serviceOrders, jobCardsRaw, removedParts, estimateLineItems, rolePermissionRows] = await Promise.all([
          fetchOr<Branch[]>("/api/branches", state.branches),
          fetchOr<Customer[]>("/api/customers", state.customers),
          fetchOr<Brand[]>("/api/brands", state.brands),
          fetchOr<Category[]>("/api/categories", state.categories),
          fetchOr<UnitOfMeasure[]>("/api/units", state.units),
          fetchOr<Technician[]>("/api/technicians", state.technicians),
          fetchOr<Appliance[]>("/api/appliances", state.appliances),
          fetchOr<ServiceOrder[]>("/api/service-orders", state.serviceOrders),
          fetchOr<(JobCard & { stageHistory?: JobCardStageHistory[] })[]>("/api/job-cards", state.jobCards),
          fetchOr<RemovedPart[]>("/api/removed-parts", state.removedParts),
          fetchOr<JobCardEstimateLine[]>("/api/estimate-lines", state.estimateLineItems),
          fetchOr<{ action: string; roles: Role[] }[]>("/api/role-permissions", []),
        ]);
        const stageHistory = jobCardsRaw.some((job) => "stageHistory" in job)
          ? jobCardsRaw.flatMap((job) => job.stageHistory ?? [])
          : state.stageHistory;
        syncActionRolesFromServer(rolePermissionRows);
        set({
          branches, customers, brands, categories, units, technicians, appliances, serviceOrders,
          jobCards: jobCardsRaw, stageHistory, removedParts, estimateLineItems,
          permissionsVersion: state.permissionsVersion + 1,
          hydrated: true, hydrating: false,
        });
      },
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setAliasFieldsEnabled: (enabled) => {
        const state = get();
        if (!canPerform(state.role, "manage_settings")) return result(false, "Your role cannot change system settings.");
        set({ aliasFieldsEnabled: enabled });
        return result(true, enabled ? "Arabic alias fields enabled." : "Arabic alias fields disabled.");
      },
      updateRolePermission: async (action, targetRole, allowed) => {
        const state = get();
        if (!canPerform(state.role, "manage_settings")) return result(false, "Your role cannot change role permissions.");
        if (targetRole === "admin" && !allowed) return result(false, "Admin must always retain access — remove other roles instead.");
        try {
          await api.patch("/api/role-permissions", { action, role: targetRole, allowed });
          await get().hydrate();
          return result(true, "Role permissions updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update role permissions.");
        }
      },
      resetRolePermissions: async () => {
        const state = get();
        if (!canPerform(state.role, "manage_settings")) return result(false, "Your role cannot change role permissions.");
        try {
          await api.post("/api/role-permissions/reset", {});
          await get().hydrate();
          return result(true, "Role permissions reset to defaults.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to reset role permissions.");
        }
      },
      setFieldRequired: (entity, key, required) => {
        const state = get();
        if (!canPerform(state.role, "manage_settings")) return result(false, "Your role cannot change required fields.");
        setFieldRequiredRaw(entity, key, required);
        set({ requiredFieldsVersion: state.requiredFieldsVersion + 1 });
        return result(true, "Required fields updated.");
      },
      resetRequiredFields: () => {
        const state = get();
        if (!canPerform(state.role, "manage_settings")) return result(false, "Your role cannot change required fields.");
        resetRequiredFieldsRaw();
        set({ requiredFieldsVersion: state.requiredFieldsVersion + 1 });
        return result(true, "Required fields reset to defaults.");
      },

      addCustomer: async (input) => {
        const customer = await api.post<Customer>("/api/customers", input);
        await get().hydrate();
        return customer;
      },
      updateCustomer: async (id, patch) => {
        try {
          await api.patch(`/api/customers/${id}`, patch);
          await get().hydrate();
          return result(true, "Customer updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update customer.");
        }
      },
      deleteCustomer: async (id) => {
        try {
          await api.delete(`/api/customers/${id}`);
          await get().hydrate();
          return result(true, "Customer deleted.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to delete customer.");
        }
      },
      verifyWhatsapp: (customerId) => {
        set((state) => ({ customers: state.customers.map((customer) => customer.id === customerId ? { ...customer, whatsappVerified: true } : customer) }));
      },
      addAppliance: async (input) => {
        const appliance = await api.post<Appliance>("/api/appliances", input);
        await get().hydrate();
        return appliance;
      },
      updateAppliance: async (id, patch) => {
        try {
          await api.patch(`/api/appliances/${id}`, patch);
          await get().hydrate();
          return result(true, "Product updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update product.");
        }
      },
      deleteAppliance: async (id) => {
        try {
          await api.delete(`/api/appliances/${id}`);
          await get().hydrate();
          return result(true, "Product deleted.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to delete product.");
        }
      },
      addBrand: async (input) => {
        const brand = await api.post<Brand>("/api/brands", input);
        await get().hydrate();
        return brand;
      },
      updateBrand: async (id, patch) => {
        try {
          await api.patch(`/api/brands/${id}`, patch);
          await get().hydrate();
          return result(true, "Brand updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update brand.");
        }
      },
      deleteBrand: async (id) => {
        try {
          await api.delete(`/api/brands/${id}`);
          await get().hydrate();
          return result(true, "Brand deleted.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to delete brand.");
        }
      },
      addCategory: async (input) => {
        try {
          await api.post<Category>("/api/categories", input);
          await get().hydrate();
          return result(true, "Category added.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to add category.");
        }
      },
      updateCategory: async (id, patch) => {
        try {
          await api.patch(`/api/categories/${id}`, patch);
          await get().hydrate();
          return result(true, "Category updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update category.");
        }
      },
      deleteCategory: async (id) => {
        try {
          await api.delete(`/api/categories/${id}`);
          await get().hydrate();
          return result(true, "Category deleted.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to delete category.");
        }
      },
      addUnit: async (input) => {
        try {
          await api.post<UnitOfMeasure>("/api/units", input);
          await get().hydrate();
          return result(true, "Unit added.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to add unit.");
        }
      },
      updateUnit: async (id, patch) => {
        try {
          await api.patch(`/api/units/${id}`, patch);
          await get().hydrate();
          return result(true, "Unit updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update unit.");
        }
      },
      deleteUnit: async (id) => {
        try {
          await api.delete(`/api/units/${id}`);
          await get().hydrate();
          return result(true, "Unit deleted.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to delete unit.");
        }
      },
      addTechnician: async (input) => {
        const technician = await api.post<Technician>("/api/technicians", input);
        await get().hydrate();
        return technician;
      },
      updateTechnician: async (id, patch) => {
        try {
          await api.patch(`/api/technicians/${id}`, patch);
          await get().hydrate();
          return result(true, "Technician updated.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update technician.");
        }
      },
      deleteTechnician: async (id) => {
        try {
          await api.delete(`/api/technicians/${id}`);
          await get().hydrate();
          return result(true, "Technician deleted.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to delete technician.");
        }
      },
      addInventoryItem: (input) => {
        const item: InventoryItem = { ...input, id: nextId("item") };
        set((state) => ({ inventoryItems: [item, ...state.inventoryItems] }));
        return item;
      },
      updateInventoryItem: (id, patch) => {
        const state = get();
        if (!canPerform(state.role, "manage_inventory")) return result(false, "Your role cannot manage inventory.");
        if (!state.inventoryItems.some((item) => item.id === id)) return result(false, "Inventory item not found.");
        set((current) => ({ inventoryItems: current.inventoryItems.map((item) => item.id === id ? { ...item, ...patch } : item) }));
        return result(true, "Inventory item updated.");
      },
      deleteInventoryItem: (id) => {
        const state = get();
        if (!canPerform(state.role, "manage_inventory")) return result(false, "Your role cannot manage inventory.");
        const item = state.inventoryItems.find((candidate) => candidate.id === id);
        if (!item) return result(false, "Inventory item not found.");
        const stockQty = state.inventoryStock.filter((s) => s.itemId === id).reduce((sum, s) => sum + s.qty, 0);
        if (stockQty > 0) return result(false, `Cannot delete: ${stockQty} unit${stockQty === 1 ? "" : "s"} of this item are still in stock.`);
        const hasTransactions = state.inventoryTransactions.some((t) => t.itemId === id);
        if (hasTransactions) return result(false, "Cannot delete: this item has recorded stock transactions.");
        const usedInJobs = state.partsUsed.some((p) => p.itemId === id) || state.estimateLineItems.some((line) => line.itemId === id);
        if (usedInJobs) return result(false, "Cannot delete: this item is referenced by a job card's parts or estimate.");
        set((current) => ({ inventoryItems: current.inventoryItems.filter((candidate) => candidate.id !== id) }));
        return result(true, "Inventory item deleted.");
      },
      addInventoryTransaction: (input) => {
        const state = get();
        if (!canPerform(state.role, "manage_inventory")) return result(false, "Your role cannot manage inventory.");
        if (!state.inventoryItems.some((item) => item.id === input.itemId)) return result(false, "Inventory item not found.");
        if (!state.inventoryLocations.some((location) => location.id === input.locationId)) return result(false, "Inventory location not found.");
        if (input.qty <= 0) return result(false, "Quantity must be greater than zero.");
        if (input.type === "transfer" && (!input.destLocationId || input.destLocationId === input.locationId)) return result(false, "Choose a different destination location.");
        if (input.type === "transfer" && !state.inventoryLocations.some((location) => location.id === input.destLocationId)) return result(false, "Destination location not found.");
        const sourceStock = state.inventoryStock.find((entry) => entry.itemId === input.itemId && entry.locationId === input.locationId)?.qty ?? 0;
        if ((input.type === "issue" || input.type === "transfer") && sourceStock < input.qty) return result(false, `Only ${sourceStock} units are available at the source location.`);

        const transaction: InventoryTransaction = { ...input, id: nextId("txn"), timestamp: new Date().toISOString() };
        set((current) => {
          const stock = [...current.inventoryStock];
          const applyDelta = (locationId: string, delta: number) => {
            const index = stock.findIndex((entry) => entry.itemId === input.itemId && entry.locationId === locationId);
            if (index >= 0) stock[index] = { ...stock[index], qty: stock[index].qty + delta };
            else stock.push({ itemId: input.itemId, locationId, qty: delta });
          };
          if (input.type === "receive" || input.type === "return" || input.type === "adjust") applyDelta(input.locationId, input.qty);
          if (input.type === "issue") applyDelta(input.locationId, -input.qty);
          if (input.type === "transfer" && input.destLocationId) {
            applyDelta(input.locationId, -input.qty);
            applyDelta(input.destLocationId, input.qty);
          }
          return { inventoryTransactions: [transaction, ...current.inventoryTransactions], inventoryStock: stock };
        });
        return result(true, "Inventory transaction recorded.");
      },

      createServiceOrder: async ({ customerId, branchId, lines, shortAddressCode, buildingNo, unitNo, district, postalCode, additionalNo, requestSource, preferredDate, preferredTimeSlot, buyerVatNumber }) => {
        if (!canPerform(get().role, "create_job")) return result(false, "Your role cannot create service orders.");
        try {
          const response = await api.post<{ ok: boolean; message: string; serviceOrder: ServiceOrder; jobCards: JobCard[] }>(
            "/api/service-orders",
            { customerId, branchId, lines, shortAddressCode, buildingNo, unitNo, district, postalCode, additionalNo, requestSource, preferredDate, preferredTimeSlot, buyerVatNumber }
          );
          await get().hydrate();
          return { ok: true, message: response.message, serviceOrder: response.serviceOrder, jobs: response.jobCards };
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to create the service order.");
        }
      },

      addProductToOrder: async ({ serviceOrderId, applianceId, jobType, problemDescription, technicianId }) => {
        if (!canPerform(get().role, "create_job")) return result(false, "Your role cannot add products to service orders.");
        try {
          const response = await api.post<{ ok: boolean; message: string; jobCard: JobCard }>(
            `/api/service-orders/${serviceOrderId}/lines`,
            { applianceId, jobType, problemDescription, technicianId }
          );
          await get().hydrate();
          return { ok: true, message: response.message, job: response.jobCard };
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to add the product.");
        }
      },

      createJobCard: async ({ customerId, applianceId, jobType, problemDescription, branchId }) => {
        const created = await get().createServiceOrder({ customerId, branchId, lines: [{ applianceId, jobType, problemDescription }] });
        return { ok: created.ok, message: created.message, job: created.jobs?.[0] };
      },

      advanceStage: async (jobcardId, _targetStage, notes) => {
        const state = get();
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (!canAdvanceCurrentStage(state.role, job.currentStage)) return result(false, `${state.role.replace("_", " ")} cannot complete ${job.currentStage}.`);
        try {
          const response = await api.post<{ ok: boolean; message: string; jobCard: JobCard }>(`/api/job-cards/${jobcardId}/advance-stage`, { notes });
          await get().hydrate();
          const logs = buildTriggeredLogs(get(), response.jobCard, response.jobCard.currentStage, new Date().toISOString());
          if (logs.length) {
            set((current) => ({ communicationLogs: [...logs, ...current.communicationLogs] }));
            scheduleCommunicationReceipts(logs);
          }
          return result(true, response.message);
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to advance the job card.");
        }
      },

      assignTechnician: async (jobcardId, technicianId) => {
        if (!canPerform(get().role, "assign_technician")) return result(false, "Your role cannot assign technicians.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/technician`, { technicianId });
          const technicianName = get().technicians.find((t) => t.id === technicianId)?.name ?? "technician";
          await get().hydrate();
          return result(true, `Assigned to ${technicianName}.`);
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to assign technician.");
        }
      },

      setDiagnosis: async (jobcardId, notes) => {
        if (!canPerform(get().role, "set_diagnosis")) return result(false, "Your role cannot record diagnosis notes.");
        if (!notes.trim()) return result(false, "Diagnosis notes are required.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/diagnosis`, { diagnosisNotes: notes.trim() });
          await get().hydrate();
          return result(true, "Diagnosis notes saved.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to save diagnosis notes.");
        }
      },
      addEstimateLine: async (jobcardId, input) => {
        const state = get();
        if (!canPerform(state.role, "set_estimate")) return result(false, "Your role cannot set estimates.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (!canEditEstimate(job)) return result(false, "Record diagnosis notes before building an estimate.");
        if (!input.label.trim()) return result(false, "Describe this line item.");
        if (!Number.isFinite(input.qty) || input.qty <= 0) return result(false, "Quantity must be greater than zero.");
        if (!Number.isFinite(input.unitPrice)) return result(false, "Unit price must be a number.");
        if (input.kind === "discount" && input.unitPrice > 0) return result(false, "Discount amount must be zero or negative.");
        if (input.kind !== "discount" && input.unitPrice < 0) return result(false, "Unit price must be zero or more.");
        const gross = input.qty * input.unitPrice;
        const discountAmount = input.kind === "discount" ? undefined : input.discountAmount;
        if (discountAmount !== undefined && (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > gross)) return result(false, "Line discount must be between 0 and the line's gross amount.");
        let line: JobCardEstimateLine;
        try {
          line = await api.post<JobCardEstimateLine>(`/api/job-cards/${jobcardId}/estimate-lines`, {
            kind: input.kind, label: input.label.trim(), descriptionAr: input.descriptionAr?.trim() || undefined,
            catNo: input.catNo?.trim() || undefined, notes: input.notes?.trim() || undefined, itemId: input.itemId,
            qty: input.qty, unitPrice: input.unitPrice, discountAmount: discountAmount || undefined,
          });
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to save estimate line.");
        }
        const lines = [...state.estimateLineItems, line];
        const total = lines.filter((candidate) => candidate.jobcardId === jobcardId).reduce((sum, candidate) => sum + candidate.totalPrice, 0);
        const now = new Date().toISOString();
        const updatedJob = { ...job, estimateAmount: total, customerApproved: null, updatedAt: now };
        const logs = job.currentStage === "Customer Approval" ? buildTriggeredLogs(state, updatedJob, "Customer Approval", now) : [];
        set({
          estimateLineItems: lines,
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? updatedJob : candidate),
          communicationLogs: [...logs, ...state.communicationLogs],
        });
        scheduleCommunicationReceipts(logs);
        try {
          await api.patch(`/api/job-cards/${jobcardId}/estimate`, { estimateAmount: total });
        } catch { /* estimate total sync is best-effort; the line item itself is already saved */ }
        return result(true, `Added "${line.label}" to the estimate.`);
      },
      updateEstimateLine: async (lineId, patch) => {
        const state = get();
        if (!canPerform(state.role, "set_estimate")) return result(false, "Your role cannot edit estimates.");
        const line = state.estimateLineItems.find((candidate) => candidate.id === lineId);
        if (!line) return result(false, "Estimate line not found.");
        const job = state.jobCards.find((candidate) => candidate.id === line.jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (!canEditEstimate(job)) return result(false, "Record diagnosis notes before building an estimate.");
        const qty = patch.qty ?? line.qty;
        const unitPrice = patch.unitPrice ?? line.unitPrice;
        if (!Number.isFinite(qty) || qty <= 0) return result(false, "Quantity must be greater than zero.");
        if (!Number.isFinite(unitPrice)) return result(false, "Unit price must be a number.");
        if (line.kind === "discount" && unitPrice > 0) return result(false, "Discount amount must be zero or negative.");
        if (line.kind !== "discount" && unitPrice < 0) return result(false, "Unit price must be zero or more.");
        const gross = qty * unitPrice;
        const discountAmount = line.kind === "discount" ? undefined : (patch.discountAmount ?? line.discountAmount);
        if (discountAmount !== undefined && (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > gross)) return result(false, "Line discount must be between 0 and the line's gross amount.");
        let updatedLine: JobCardEstimateLine;
        try {
          updatedLine = await api.patch<JobCardEstimateLine>(`/api/estimate-lines/${lineId}`, {
            label: patch.label !== undefined ? (patch.label.trim() || line.label) : undefined,
            descriptionAr: patch.descriptionAr !== undefined ? (patch.descriptionAr.trim() || undefined) : undefined,
            catNo: patch.catNo !== undefined ? (patch.catNo.trim() || undefined) : undefined,
            notes: patch.notes !== undefined ? (patch.notes.trim() || undefined) : undefined,
            qty, unitPrice, discountAmount: discountAmount || undefined,
          });
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to save estimate line.");
        }
        const lines = state.estimateLineItems.map((candidate) => candidate.id === lineId ? updatedLine : candidate);
        const total = lines.filter((candidate) => candidate.jobcardId === job.id).reduce((sum, candidate) => sum + candidate.totalPrice, 0);
        const now = new Date().toISOString();
        const updatedJob = { ...job, estimateAmount: total || null, customerApproved: null, updatedAt: now };
        set({
          estimateLineItems: lines,
          jobCards: state.jobCards.map((candidate) => candidate.id === job.id ? updatedJob : candidate),
        });
        try {
          await api.patch(`/api/job-cards/${job.id}/estimate`, { estimateAmount: total });
        } catch { /* estimate total sync is best-effort; the line item itself is already saved */ }
        return result(true, "Estimate line updated.");
      },
      removeEstimateLine: async (lineId) => {
        const state = get();
        if (!canPerform(state.role, "set_estimate")) return result(false, "Your role cannot edit estimates.");
        const line = state.estimateLineItems.find((candidate) => candidate.id === lineId);
        if (!line) return result(false, "Estimate line not found.");
        const job = state.jobCards.find((candidate) => candidate.id === line.jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (!canEditEstimate(job)) return result(false, "Record diagnosis notes before building an estimate.");
        const remaining = state.estimateLineItems.filter((candidate) => candidate.id !== lineId && candidate.jobcardId === job.id);
        const total = remaining.reduce((sum, candidate) => sum + candidate.totalPrice, 0);
        const partsUsedTotal = state.partsUsed.filter((part) => part.jobcardId === job.id).reduce((sum, part) => sum + part.totalPrice, 0);
        if (total < partsUsedTotal) return result(false, `Estimate cannot drop below the ${partsUsedTotal.toLocaleString()} SAR already issued in parts.`);
        try {
          await api.delete(`/api/estimate-lines/${lineId}`);
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to remove estimate line.");
        }
        const lines = state.estimateLineItems.filter((candidate) => candidate.id !== lineId);
        const now = new Date().toISOString();
        const updatedJob = { ...job, estimateAmount: total || null, customerApproved: null, updatedAt: now };
        set({
          estimateLineItems: lines,
          jobCards: state.jobCards.map((candidate) => candidate.id === job.id ? updatedJob : candidate),
        });
        try {
          await api.patch(`/api/job-cards/${job.id}/estimate`, { estimateAmount: total });
        } catch { /* estimate total sync is best-effort; the line item itself is already saved */ }
        return result(true, "Removed line item from the estimate.");
      },
      setEstimateValidUntil: async (jobcardId, date) => {
        const state = get();
        if (!canPerform(state.role, "set_estimate")) return result(false, "Your role cannot edit estimates.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        set({ jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, estimateValidUntil: date || undefined } : candidate) });
        try {
          await api.patch(`/api/job-cards/${jobcardId}/estimate`, { estimateValidUntil: date || undefined });
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to save estimate validity.");
        }
        return result(true, "Estimate validity updated.");
      },
      setEstimateHeader: async (jobcardId, patch) => {
        const state = get();
        if (!canPerform(state.role, "set_estimate")) return result(false, "Your role cannot edit estimates.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        set({
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? {
            ...candidate,
            estimatePreparedBy: patch.preparedBy !== undefined ? (patch.preparedBy.trim() || undefined) : candidate.estimatePreparedBy,
            estimateTermsOfPayment: patch.termsOfPayment !== undefined ? (patch.termsOfPayment.trim() || undefined) : candidate.estimateTermsOfPayment,
            estimatePoNumber: patch.poNumber !== undefined ? (patch.poNumber.trim() || undefined) : candidate.estimatePoNumber,
            estimateNotes: patch.notes !== undefined ? (patch.notes.trim() || undefined) : candidate.estimateNotes,
            estimatePreviousQuoteNo: patch.previousQuoteNo !== undefined ? (patch.previousQuoteNo.trim() || undefined) : candidate.estimatePreviousQuoteNo,
            estimateCustomerRequest: patch.customerRequest !== undefined ? (patch.customerRequest.trim() || undefined) : candidate.estimateCustomerRequest,
            estimateDeliveryLeadTime: patch.deliveryLeadTime !== undefined ? (patch.deliveryLeadTime.trim() || undefined) : candidate.estimateDeliveryLeadTime,
            estimateSubject: patch.subject !== undefined ? (patch.subject.trim() || undefined) : candidate.estimateSubject,
            updatedAt: new Date().toISOString(),
          } : candidate),
        });
        try {
          await api.patch(`/api/job-cards/${jobcardId}/estimate`, {
            estimatePreparedBy: patch.preparedBy, estimateTermsOfPayment: patch.termsOfPayment, estimatePoNumber: patch.poNumber,
            estimateNotes: patch.notes, estimatePreviousQuoteNo: patch.previousQuoteNo, estimateCustomerRequest: patch.customerRequest,
            estimateDeliveryLeadTime: patch.deliveryLeadTime, estimateSubject: patch.subject,
          });
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to save estimate details.");
        }
        return result(true, "Estimate details updated.");
      },
      approveCustomer: async (jobcardId, approved, source = "internal") => {
        const state = get();
        if (source === "internal" && !canPerform(state.role, "record_customer_approval")) return result(false, "Your role cannot record customer approval.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if ((job.estimateAmount ?? 0) <= 0) return result(false, "Set the estimate before recording approval.");
        if (job.customerApproved === approved) return result(false, approved ? "Customer approval is already recorded." : "Customer decline is already recorded.");
        const now = new Date().toISOString();
        const template = MESSAGE_TEMPLATES.find((candidate) => candidate.id === (approved ? "approval_received" : "approval_declined"));
        const customer = state.customers.find((candidate) => candidate.id === job.customerId);
        const appliance = state.appliances.find((candidate) => candidate.id === job.applianceId);
        const logs: CommunicationLog[] = template && customer && appliance ? [{
          id: nextId("comm"), jobcardId: job.id, customerId: customer.id, applianceId: appliance.id, stageName: job.currentStage,
          channel: "whatsapp", to: customer.whatsapp,
          message: renderTemplate(template.body, { customer: customer.name.split(" ")[0], appliance: appliance.model, jobId: job.documentNo, amount: `SAR ${job.estimateAmount?.toLocaleString()}` }),
          status: "sent", timestamp: now,
        }] : [];
        set({
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, customerApproved: approved, updatedAt: now } : candidate),
          communicationLogs: [...logs, ...state.communicationLogs],
        });
        scheduleCommunicationReceipts(logs);
        if (source === "internal") {
          try {
            await api.patch(`/api/job-cards/${jobcardId}/customer-approval`, { approved });
          } catch (err) {
            return result(false, err instanceof ApiError ? err.message : "Failed to record customer approval.");
          }
        }
        return result(true, approved ? "Customer approval recorded." : "Customer decline recorded.");
      },
      setRepairNotes: async (jobcardId, notes) => {
        const state = get();
        if (!canPerform(state.role, "set_repair_notes")) return result(false, "Your role cannot record repair notes.");
        if (!notes.trim()) return result(false, "Repair notes are required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/repair-notes`, { repairNotes: notes.trim() });
          await get().hydrate();
          return result(true, "Repair notes saved.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to save repair notes.");
        }
      },
      setQaApproved: async (jobcardId, approved) => {
        const state = get();
        if (!canPerform(state.role, "approve_qa")) return result(false, "Supervisor, Manager, or Admin approval is required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/qa-approve`, { qaApproved: approved });
          await get().hydrate();
          return result(true, approved ? "QA approved." : "QA approval removed.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to update QA approval.");
        }
      },
      setFinalAmount: async (jobcardId, amount) => {
        const state = get();
        if (!canPerform(state.role, "finalize_job")) return result(false, "Your role cannot finalize charges.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        const partsTotal = state.partsUsed.filter((part) => part.jobcardId === jobcardId).reduce((sum, part) => sum + part.totalPrice, 0);
        if (!Number.isFinite(amount) || amount <= 0) return result(false, "Final amount must be greater than zero.");
        if (amount < partsTotal) return result(false, `Final amount cannot be below the ${partsTotal.toLocaleString()} SAR parts total.`);
        if ((job.estimateAmount ?? 0) > 0 && amount > (job.estimateAmount ?? 0)) return result(false, "Final amount cannot exceed the customer-approved estimate.");
        if (state.payments.some((payment) => payment.jobcardId === jobcardId && payment.status === "paid")) return result(false, "Final amount cannot change after payment.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/final-amount`, { finalAmount: amount });
          await get().hydrate();
          return result(true, `Final amount set to SAR ${amount.toLocaleString()}.`);
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to set final amount.");
        }
      },
      captureCustomerSignature: async (jobcardId, signature) => {
        const state = get();
        if (!canPerform(state.role, "capture_signature")) return result(false, "Your role cannot capture handover signatures.");
        if (!signature.trim()) return result(false, "Customer name or signature is required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/signature`, { customerSignature: signature.trim() });
          await get().hydrate();
          return result(true, "Customer signature captured.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to capture signature.");
        }
      },
      confirmAssetReceived: async (jobcardId, ref, receivedBy) => {
        const state = get();
        if (!canPerform(state.role, "create_job")) return result(false, "Your role cannot confirm asset receipt.");
        if (!ref.trim()) return result(false, "A reference/tag number is required.");
        if (!receivedBy.trim()) return result(false, "The receiving technician is required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/asset-received`, { ref: ref.trim(), receivedBy: receivedBy.trim() });
          await get().hydrate();
          return result(true, "Asset receipt custody confirmed.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to confirm asset receipt.");
        }
      },
      confirmAssetHandover: async (jobcardId, ref, confirmedBy) => {
        const state = get();
        if (!canPerform(state.role, "capture_signature")) return result(false, "Your role cannot confirm asset handover.");
        if (!ref.trim()) return result(false, "A reference/tag number is required.");
        if (!confirmedBy.trim()) return result(false, "Confirming staff member is required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        try {
          await api.patch(`/api/job-cards/${jobcardId}/asset-handover`, { ref: ref.trim(), confirmedBy: confirmedBy.trim() });
          await get().hydrate();
          return result(true, "Asset handover confirmed.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to confirm asset handover.");
        }
      },
      savePurchaseBill: (jobcardId, input) => {
        const state = get();
        if (!canPerform(state.role, "create_job")) return result(false, "Your role cannot record purchase bills.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.jobType !== "warranty" || job.currentStage !== "Warranty Validation") return result(false, "Purchase bills are recorded during Warranty Validation.");
        if (!input.billNo.trim() || !input.vendorName.trim() || !input.billDate) return result(false, "Bill number, date, and vendor are required.");
        const existing = state.purchaseBills.find((bill) => bill.jobcardId === jobcardId);
        const bill: PurchaseBill = { ...input, id: existing?.id ?? nextId("bill"), jobcardId };
        set({
          purchaseBills: existing ? state.purchaseBills.map((candidate) => candidate.id === existing.id ? bill : candidate) : [bill, ...state.purchaseBills],
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, updatedAt: new Date().toISOString() } : candidate),
        });
        return result(true, "Purchase bill recorded.");
      },

      addPartUsed: (jobcardId, itemId, qty) => {
        const state = get();
        if (!canPerform(state.role, "add_part")) return result(false, "Your role cannot issue parts to jobs.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        const item = state.inventoryItems.find((candidate) => candidate.id === itemId);
        if (!job || !item) return result(false, "Job card or part was not found.");
        if (job.currentStage !== "Diagnosis" && job.currentStage !== "Repair") return result(false, "Parts can only be issued during Diagnosis or Repair.");
        if (!Number.isInteger(qty) || qty <= 0) return result(false, "Part quantity must be a positive whole number.");
        const currentPartsTotal = state.partsUsed.filter((part) => part.jobcardId === jobcardId).reduce((sum, part) => sum + part.totalPrice, 0);
        if (job.currentStage === "Repair" && job.customerApproved === true && currentPartsTotal + item.unitPrice * qty > (job.estimateAmount ?? 0)) {
          return result(false, "This part would exceed the approved estimate. Record a revised estimate and customer approval before repair.");
        }
        const branchLocations = state.inventoryLocations.filter((location) => location.branchId === job.branchId);
        const preferredLocationId = job.technicianId ? `van-${job.technicianId}` : undefined;
        const stockOptions = state.inventoryStock
          .filter((entry) => entry.itemId === itemId && entry.qty >= qty && branchLocations.some((location) => location.id === entry.locationId))
          .sort((a, b) => Number(b.locationId === preferredLocationId) - Number(a.locationId === preferredLocationId) || b.qty - a.qty);
        const source = stockOptions[0];
        if (!source) return result(false, `Insufficient ${item.name} stock in this job's branch.`);
        const now = new Date().toISOString();
        const part: JobCardPartUsed = { id: nextId("part"), jobcardId, itemId, locationId: source.locationId, qty, unitPrice: item.unitPrice, totalPrice: item.unitPrice * qty };
        const transaction: InventoryTransaction = { id: nextId("txn"), itemId, locationId: source.locationId, jobcardId, type: "issue", qty, timestamp: now, createdBy: "Job workflow" };
        set({
          partsUsed: [part, ...state.partsUsed],
          inventoryTransactions: [transaction, ...state.inventoryTransactions],
          inventoryStock: state.inventoryStock.map((entry) => entry.itemId === itemId && entry.locationId === source.locationId ? { ...entry, qty: entry.qty - qty } : entry),
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, updatedAt: now } : candidate),
        });
        return result(true, `${qty} ${item.name} issued to ${job.documentNo}.`);
      },
      removePartUsed: (partUsedId) => {
        const state = get();
        if (!canPerform(state.role, "add_part")) return result(false, "Your role cannot return job parts.");
        const part = state.partsUsed.find((candidate) => candidate.id === partUsedId);
        if (!part) return result(false, "Job part was not found.");
        const job = state.jobCards.find((candidate) => candidate.id === part.jobcardId);
        if (!job || (job.currentStage !== "Diagnosis" && job.currentStage !== "Repair")) return result(false, "Parts can only be returned during Diagnosis or Repair.");
        const now = new Date().toISOString();
        const transaction: InventoryTransaction = { id: nextId("txn"), itemId: part.itemId, locationId: part.locationId, jobcardId: part.jobcardId, type: "return", qty: part.qty, timestamp: now, createdBy: "Job workflow" };
        const existingStock = state.inventoryStock.some((entry) => entry.itemId === part.itemId && entry.locationId === part.locationId);
        set({
          partsUsed: state.partsUsed.filter((candidate) => candidate.id !== partUsedId),
          inventoryTransactions: [transaction, ...state.inventoryTransactions],
          inventoryStock: existingStock
            ? state.inventoryStock.map((entry) => entry.itemId === part.itemId && entry.locationId === part.locationId ? { ...entry, qty: entry.qty + part.qty } : entry)
            : [...state.inventoryStock, { itemId: part.itemId, locationId: part.locationId, qty: part.qty }],
          jobCards: state.jobCards.map((job) => job.id === part.jobcardId ? { ...job, updatedAt: now } : job),
        });
        return result(true, "Part returned to inventory.");
      },
      addAttachment: (jobcardId, stageName, label, fileUrl) => {
        const state = get();
        if (!state.jobCards.some((job) => job.id === jobcardId)) return result(false, "Job card not found.");
        const attachment: JobCardAttachment = { id: nextId("att"), jobcardId, stageName, fileUrl: fileUrl ?? "#", label, uploadedBy: "You", timestamp: new Date().toISOString() };
        set({ attachments: [attachment, ...state.attachments] });
        return result(true, "Attachment added.");
      },
      sendCommunication: (jobcardId, channel, message) => {
        const state = get();
        if (!canPerform(state.role, "send_message")) return result(false, "Your role cannot send customer messages.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        const customer = state.customers.find((candidate) => candidate.id === job?.customerId);
        if (!job || !customer || !message.trim()) return result(false, "Job, customer, and message are required.");
        const log: CommunicationLog = {
          id: nextId("comm"), jobcardId, customerId: customer.id, applianceId: job.applianceId, stageName: job.currentStage,
          channel, to: contactFor(channel, customer), message: message.trim(), status: "sent", timestamp: new Date().toISOString(),
        };
        set({ communicationLogs: [log, ...state.communicationLogs] });
        scheduleCommunicationReceipts([log]);
        return result(true, `Message sent via ${channel === "whatsapp" ? "WhatsApp" : channel.toUpperCase()}.`);
      },
      retryCommunication: (logId) => {
        const state = get();
        if (!canPerform(state.role, "send_message")) return result(false, "Your role cannot resend messages.");
        const log = state.communicationLogs.find((candidate) => candidate.id === logId);
        if (!log) return result(false, "Message not found.");
        if (log.status !== "failed") return result(false, "Only failed messages can be retried.");
        const now = new Date().toISOString();
        set({ communicationLogs: state.communicationLogs.map((candidate) => candidate.id === logId ? { ...candidate, status: "sent", timestamp: now } : candidate) });
        scheduleCommunicationReceipts([{ ...log, status: "sent", timestamp: now }], { allowFailure: false });
        return result(true, "Message resent.");
      },

      updateWorkflowStep: (workflowId, stepOrder, patch) => {
        const state = get();
        if (!canPerform(state.role, "edit_workflow")) return result(false, "Your role cannot edit workflows.");
        set({ workflows: state.workflows.map((workflow) => workflow.id === workflowId ? { ...workflow, steps: workflow.steps.map((step) => step.stepOrder === stepOrder ? { ...step, ...patch } : step) } : workflow) });
        return result(true, "Workflow step updated.");
      },
      addWorkflowStep: (workflowId, step) => {
        const state = get();
        if (!canPerform(state.role, "edit_workflow")) return result(false, "Your role cannot edit workflows.");
        set({ workflows: state.workflows.map((workflow) => workflow.id === workflowId ? { ...workflow, steps: [...workflow.steps, step].sort((a, b) => a.stepOrder - b.stepOrder) } : workflow) });
        return result(true, "Workflow step added.");
      },
      sendMaintenanceReminder: (applianceId) => {
        const state = get();
        const appliance = state.appliances.find((candidate) => candidate.id === applianceId);
        const latestJob = state.jobCards.filter((job) => job.applianceId === applianceId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
        const customer = state.customers.find((candidate) => candidate.id === latestJob?.customerId);
        const template = MESSAGE_TEMPLATES.find((candidate) => candidate.id === "maintenance_reminder");
        if (!appliance || !customer || !template) return result(false, "No recent service customer was found for this product.");
        if (state.maintenanceRemindersSent[applianceId]) return result(false, "A maintenance reminder was already sent for this appliance.");
        const now = new Date().toISOString();
        const log: CommunicationLog = {
          id: nextId("comm"), customerId: customer.id, applianceId: appliance.id, channel: "whatsapp", to: customer.whatsapp,
          message: renderTemplate(template.body, { customer: customer.name.split(" ")[0], appliance: appliance.model, jobId: "", amount: "" }),
          status: "sent", timestamp: now,
        };
        set({ maintenanceRemindersSent: { ...state.maintenanceRemindersSent, [applianceId]: now }, communicationLogs: [log, ...state.communicationLogs] });
        scheduleCommunicationReceipts([log]);
        return result(true, `Maintenance reminder sent for ${appliance.model}.`);
      },
      recordPayment: (jobcardId, method, amount, installments, source = "internal") => {
        const state = get();
        if (source === "internal" && !canPerform(state.role, "collect_payment")) return { ...result(false, "Your role cannot collect customer payments.") };
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job || (job.finalAmount ?? 0) <= 0) return { ...result(false, "Set the final amount before taking payment.") };
        if (job.currentStage !== "Ready for Handover" && job.currentStage !== "Delivered") return { ...result(false, "Payment is collected at handover.") };
        const paid = state.payments.filter((payment) => payment.jobcardId === jobcardId && payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
        const outstanding = Math.max(0, (job.finalAmount ?? 0) - paid);
        if (outstanding <= 0) return { ...result(false, "This job is already paid.") };
        if (Math.abs(amount - outstanding) > 0.01) return { ...result(false, `Payment must match the outstanding SAR ${outstanding.toLocaleString()}.`) };
        const now = new Date().toISOString();
        const payment: Payment = { id: nextId("pay"), jobcardId, method, amount, installments, status: "paid", timestamp: now };
        set({
          payments: [payment, ...state.payments],
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, updatedAt: now } : candidate),
        });
        return { ...result(true, `Payment of SAR ${amount.toLocaleString()} recorded.`), payment };
      },

      logRemovedPart: async (jobcardId, description, serialNo) => {
        if (!canPerform(get().role, "add_part")) return result(false, "Your role cannot log removed parts.");
        if (!description.trim()) return result(false, "Describe the removed part.");
        try {
          await api.post(`/api/job-cards/${jobcardId}/removed-parts`, { description: description.trim(), serialNo });
          const removedParts = await api.get<RemovedPart[]>("/api/removed-parts");
          set({ removedParts });
          return result(true, "Removed part logged.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to log removed part.");
        }
      },

      notifyCustomerOfRemovedPart: async (removedPartId) => {
        if (!canPerform(get().role, "add_part")) return result(false, "Your role cannot notify customers about removed parts.");
        try {
          await api.patch(`/api/removed-parts/${removedPartId}/notify`);
          const removedParts = await api.get<RemovedPart[]>("/api/removed-parts");
          set({ removedParts });
          return result(true, "Customer notified about removed part.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to notify customer.");
        }
      },

      confirmPartReturned: async (removedPartId) => {
        if (!canPerform(get().role, "add_part")) return result(false, "Your role cannot confirm returned parts.");
        try {
          await api.patch(`/api/removed-parts/${removedPartId}/confirm-returned`);
          const removedParts = await api.get<RemovedPart[]>("/api/removed-parts");
          set({ removedParts });
          return result(true, "Marked as returned to customer.");
        } catch (err) {
          return result(false, err instanceof ApiError ? err.message : "Failed to confirm return.");
        }
      },
    }),
    {
      name: "crm-demo-store-v3",
      version: 3,
      // Only Phase 2 (still browser-only) demo state and UI prefs persist
      // across reloads. Auth and Phase 1 entities (customers, job cards,
      // etc.) are real server data now — bootstrap()/hydrate() always
      // re-fetch them fresh rather than trusting a local cache.
      partialize: (state) => ({
        theme: state.theme,
        lang: state.lang,
        sidebarCollapsed: state.sidebarCollapsed,
        aliasFieldsEnabled: state.aliasFieldsEnabled,
        permissionsVersion: state.permissionsVersion,
        maintenanceRemindersSent: state.maintenanceRemindersSent,
        inventoryItems: state.inventoryItems,
        inventoryLocations: state.inventoryLocations,
        inventoryStock: state.inventoryStock,
        inventoryTransactions: state.inventoryTransactions,
        applianceTelemetry: state.applianceTelemetry,
        attachments: state.attachments,
        partsUsed: state.partsUsed,
        purchaseBills: state.purchaseBills,
        communicationLogs: state.communicationLogs,
        workflows: state.workflows,
        payments: state.payments,
      }),
    }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "crm-demo-store-v3") void useStore.persist.rehydrate();
  });
  window.addEventListener("auth:unauthorized", () => {
    useStore.getState().logout();
  });
}
