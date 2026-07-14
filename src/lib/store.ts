import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as seed from "./seed";
import { canAdvanceCurrentStage, canPerform } from "./permissions";
import { MESSAGE_TEMPLATES, renderTemplate } from "./templates";
import { stageBlockers } from "./workflow";
import { nextStageRefNo } from "./stageRefNo";
import type {
  ActionResult, Customer, Appliance, ApplianceTelemetry, Brand, Technician, InventoryItem, InventoryLocation,
  InventoryStock, InventoryTransaction, JobCard, JobCardStageHistory,
  JobCardAttachment, JobCardPartUsed, PurchaseBill, CommunicationLog,
  WorkflowDefinition, Role, StageName, Branch, Payment, PaymentMethod, Channel, ServiceOrder, RemovedPart, RequestSource,
} from "./types";

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
  purchaseBills: PurchaseBill[];
  communicationLogs: CommunicationLog[];
  workflows: WorkflowDefinition[];
  payments: Payment[];
  removedParts: RemovedPart[];

  role: Role;
  selectedBranchId: string | "all";
  theme: "light" | "dark";
  lang: "en" | "ar";
  sidebarCollapsed: boolean;
  maintenanceRemindersSent: Record<string, string>;

  setRole: (role: Role) => void;
  setBranch: (branchId: string | "all") => void;
  setTheme: (theme: "light" | "dark") => void;
  setLang: (lang: "en" | "ar") => void;
  toggleSidebar: () => void;

  addCustomer: (customer: Omit<Customer, "id" | "documentNo" | "createdAt" | "whatsappVerified" | "name">) => Customer;
  verifyWhatsapp: (customerId: string) => void;
  addAppliance: (appliance: Omit<Appliance, "id" | "documentNo">) => Appliance;
  addBrand: (brand: Omit<Brand, "id">) => Brand;
  addTechnician: (technician: Omit<Technician, "id">) => Technician;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => InventoryItem;
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
  }) => ServiceOrderResult;
  addProductToOrder: (input: {
    serviceOrderId: string;
    applianceId: string;
    jobType: JobCard["jobType"];
    problemDescription: string;
    technicianId?: string | null;
  }) => JobResult;
  createJobCard: (input: {
    customerId: string;
    applianceId: string;
    jobType: JobCard["jobType"];
    problemDescription: string;
    branchId: string;
  }) => JobResult;
  advanceStage: (jobcardId: string, stage: StageName, notes: string, changedBy: string) => ActionResult;
  assignTechnician: (jobcardId: string, technicianId: string) => ActionResult;
  setDiagnosis: (jobcardId: string, notes: string) => ActionResult;
  setEstimate: (jobcardId: string, amount: number) => ActionResult;
  approveCustomer: (jobcardId: string, approved: boolean, source?: "internal" | "customer") => ActionResult;
  setRepairNotes: (jobcardId: string, notes: string) => ActionResult;
  setQaApproved: (jobcardId: string, approved: boolean) => ActionResult;
  setFinalAmount: (jobcardId: string, amount: number) => ActionResult;
  captureCustomerSignature: (jobcardId: string, signature: string) => ActionResult;
  savePurchaseBill: (jobcardId: string, bill: Omit<PurchaseBill, "id" | "jobcardId">) => ActionResult;
  addPartUsed: (jobcardId: string, itemId: string, qty: number) => ActionResult;
  removePartUsed: (partUsedId: string) => ActionResult;
  addAttachment: (jobcardId: string, stageName: StageName, label: string, fileUrl?: string) => ActionResult;
  sendCommunication: (jobcardId: string, channel: CommunicationLog["channel"], message: string) => ActionResult;
  updateWorkflowStep: (workflowId: string, stepOrder: number, patch: Partial<WorkflowDefinition["steps"][number]>) => ActionResult;
  addWorkflowStep: (workflowId: string, step: WorkflowDefinition["steps"][number]) => ActionResult;
  sendMaintenanceReminder: (applianceId: string) => ActionResult;
  recordPayment: (jobcardId: string, method: PaymentMethod, amount: number, installments?: number, source?: "internal" | "customer") => PaymentResult;

  logRemovedPart: (jobcardId: string, description: string, serialNo: string | undefined, removedBy: string) => RemovedPart;
  notifyCustomerOfRemovedPart: (removedPartId: string) => void;
  confirmPartReturned: (removedPartId: string, confirmedBy: string) => void;

  resetDemoData: () => void;
}

const COUNTER_START = 100000;
let counter = COUNTER_START;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function clone<T>(value: T): T {
  return structuredClone(value);
}

const initialSlice = () => ({
  branches: clone(seed.BRANCHES),
  customers: clone(seed.CUSTOMERS),
  brands: clone(seed.BRANDS),
  appliances: clone(seed.APPLIANCES),
  applianceTelemetry: clone(seed.APPLIANCE_TELEMETRY),
  technicians: clone(seed.TECHNICIANS),
  inventoryItems: clone(seed.INVENTORY_ITEMS),
  inventoryLocations: clone(seed.INVENTORY_LOCATIONS),
  inventoryStock: clone(seed.INVENTORY_STOCK),
  inventoryTransactions: clone(seed.INVENTORY_TRANSACTIONS),
  serviceOrders: clone(seed.SERVICE_ORDERS),
  jobCards: clone(seed.JOB_CARDS),
  stageHistory: clone(seed.STAGE_HISTORY),
  attachments: clone(seed.ATTACHMENTS),
  partsUsed: clone(seed.PARTS_USED),
  purchaseBills: clone(seed.PURCHASE_BILLS),
  communicationLogs: clone(seed.COMMUNICATION_LOGS),
  workflows: clone(seed.WORKFLOWS),
  payments: clone(seed.PAYMENTS),
  removedParts: clone(seed.REMOVED_PARTS),
});

const STAGE_TO_STATUS: Record<StageName, JobCard["status"]> = {
  Received: "Received",
  "Warranty Validation": "In Diagnosis",
  Diagnosis: "In Diagnosis",
  Estimate: "Waiting Approval",
  "Customer Approval": "Waiting Approval",
  "OEM Approval": "Waiting Approval",
  Repair: "In Repair",
  QA: "QA",
  "Ready for Handover": "Ready",
  Delivered: "Delivered",
};

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
    }),
    status: "sent",
    timestamp,
  }));
}

function syncTechnicianStatuses(technicians: Technician[], jobs: JobCard[]) {
  const activeTechnicianIds = new Set(jobs.filter((job) => job.status !== "Delivered" && job.technicianId).map((job) => job.technicianId));
  return technicians.map((technician) => ({
    ...technician,
    status: activeTechnicianIds.has(technician.id) ? "On Job" as const : "Available" as const,
  }));
}

function scheduleCommunicationReceipts(logs: CommunicationLog[]) {
  for (const log of logs) {
    const setStatus = (status: CommunicationLog["status"]) => {
      useStore.setState((state) => ({
        communicationLogs: state.communicationLogs.map((communication) => communication.id === log.id ? { ...communication, status } : communication),
      }));
    };
    setTimeout(() => setStatus("delivered"), 2200);
    if (log.channel === "whatsapp") setTimeout(() => setStatus("read"), 5500);
  }
}

function result(ok: boolean, message: string): ActionResult {
  return { ok, message };
}

export const useStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialSlice(),
      role: "admin",
      selectedBranchId: "all",
      theme: "light",
      lang: "en",
      sidebarCollapsed: false,
      maintenanceRemindersSent: {},

      setRole: (role) => set({ role }),
      setBranch: (selectedBranchId) => set({ selectedBranchId }),
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      addCustomer: (input) => {
        const existing = get().customers.find((customer) => customer.phone.replace(/\D/g, "") === input.phone.replace(/\D/g, ""));
        if (existing) return existing;
        const name = [input.firstName, input.fatherName, input.grandfatherName, input.familyName].filter((part) => part?.trim()).join(" ");
        const customer: Customer = {
          ...input,
          name,
          id: nextId("cust"),
          documentNo: `CUST-${String(get().customers.length + 1).padStart(5, "0")}`,
          createdAt: new Date().toISOString(),
          whatsappVerified: false,
        };
        set((state) => ({ customers: [customer, ...state.customers] }));
        return customer;
      },
      verifyWhatsapp: (customerId) => {
        set((state) => ({ customers: state.customers.map((customer) => customer.id === customerId ? { ...customer, whatsappVerified: true } : customer) }));
      },
      addAppliance: (input) => {
        const appliance: Appliance = { ...input, id: nextId("app"), documentNo: `AST-${String(get().appliances.length + 1).padStart(5, "0")}` };
        set((state) => ({ appliances: [appliance, ...state.appliances] }));
        return appliance;
      },
      addBrand: (input) => {
        const brand: Brand = { ...input, id: nextId("brand") };
        set((state) => ({ brands: [brand, ...state.brands] }));
        return brand;
      },
      addTechnician: (input) => {
        const technician: Technician = { ...input, id: nextId("tech") };
        set((state) => ({ technicians: [technician, ...state.technicians] }));
        return technician;
      },
      addInventoryItem: (input) => {
        const item: InventoryItem = { ...input, id: nextId("item") };
        set((state) => ({ inventoryItems: [item, ...state.inventoryItems] }));
        return item;
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

      createServiceOrder: ({ customerId, branchId, lines, shortAddressCode, buildingNo, unitNo, district, postalCode, additionalNo, requestSource, preferredDate, preferredTimeSlot, buyerVatNumber }) => {
        const state = get();
        if (!canPerform(state.role, "create_job")) return { ...result(false, "Your role cannot create service orders.") };
        const customer = state.customers.find((candidate) => candidate.id === customerId);
        if (!customer) return { ...result(false, "Choose a valid customer.") };
        if (branchId !== customer.branchId) return { ...result(false, "Receiving branch must match the customer branch. Transfer the customer before opening this job.") };
        if (!lines.length) return { ...result(false, "Add at least one product to the service order.") };
        if (new Set(lines.map((line) => line.applianceId)).size !== lines.length) return { ...result(false, "Each product can appear only once in the same service order.") };
        for (const line of lines) {
          const appliance = state.appliances.find((candidate) => candidate.id === line.applianceId);
          if (!appliance) return { ...result(false, "Choose a valid product for every sequence.") };
          if (line.problemDescription.trim().length < 4) return { ...result(false, "Describe the reported problem for every product.") };
          if (line.technicianId) {
            const technician = state.technicians.find((candidate) => candidate.id === line.technicianId);
            if (!technician) return { ...result(false, "Choose a valid technician for every assigned sequence.") };
            if (technician.branchId !== branchId) return { ...result(false, "Assigned technician must belong to the receiving branch.") };
            if (!technician.skills.includes(appliance.category)) return { ...result(false, `${technician.name} is not qualified for ${appliance.category}.`) };
            if (technician.status === "Off Duty") return { ...result(false, `${technician.name} is off duty.`) };
          }
        }

        const now = new Date().toISOString();
        const orderIndex = state.serviceOrders.length + 1;
        const documentNo = `SO-${new Date(now).getFullYear()}-${String(orderIndex).padStart(5, "0")}`;
        const serviceOrder: ServiceOrder = {
          id: nextId("order"), documentNo, customerId, branchId, createdAt: now, updatedAt: now,
          shortAddressCode: shortAddressCode || undefined,
          buildingNo: buildingNo || undefined,
          unitNo: unitNo || undefined,
          district: district || undefined,
          postalCode: postalCode || undefined,
          additionalNo: additionalNo || undefined,
          requestSource,
          preferredDate: preferredDate || undefined,
          preferredTimeSlot: preferredTimeSlot || undefined,
          buyerVatNumber: buyerVatNumber || undefined,
        };
        const jobs = lines.map<JobCard>((line, index) => {
          const sequenceNo = index + 1;
          const lineDocumentNo = `${documentNo}-${String(sequenceNo).padStart(2, "0")}`;
          return {
            id: nextId("job"),
            serviceOrderId: serviceOrder.id,
            sequenceNo,
            documentNo: lineDocumentNo,
            invoiceNo: `INV-${lineDocumentNo}`,
            customerId,
            applianceId: line.applianceId,
            technicianId: line.technicianId ?? null,
            branchId,
            jobType: line.jobType,
            status: "Received",
            currentStage: "Received",
            problemDescription: line.problemDescription.trim(),
            estimateAmount: null,
            finalAmount: null,
            createdAt: new Date(new Date(now).getTime() + index).toISOString(),
            updatedAt: new Date(new Date(now).getTime() + index).toISOString(),
            scheduledAt: line.technicianId ? new Date(new Date(now).setDate(new Date(now).getDate() + 1)).toISOString() : null,
            customerApproved: null,
            diagnosisNotes: null,
            repairNotes: null,
            qaApproved: false,
            customerSignature: null,
          };
        });
        const history = jobs.reduce<JobCardStageHistory[]>((acc, job) => {
          const entry: JobCardStageHistory = { id: nextId("hist"), jobcardId: job.id, stageName: "Received", changedBy: "Front Desk", timestamp: job.createdAt, notes: `Product sequence ${String(job.sequenceNo).padStart(2, "0")} received at counter.`, stageRefNo: nextStageRefNo([...state.stageHistory, ...acc], "Received") };
          return [...acc, entry];
        }, []);
        const logs = jobs.flatMap((job) => buildTriggeredLogs(state, job, "Received", job.createdAt));
        set((current) => ({
          serviceOrders: [serviceOrder, ...current.serviceOrders],
          jobCards: [...jobs, ...current.jobCards],
          stageHistory: [...history, ...current.stageHistory],
          communicationLogs: [...logs, ...current.communicationLogs],
          technicians: syncTechnicianStatuses(current.technicians, [...jobs, ...current.jobCards]),
        }));
        scheduleCommunicationReceipts(logs);
        return { ...result(true, `Service order ${documentNo} created with ${jobs.length} product ${jobs.length === 1 ? "sequence" : "sequences"}.`), serviceOrder, jobs };
      },

      addProductToOrder: ({ serviceOrderId, applianceId, jobType, problemDescription, technicianId }) => {
        const state = get();
        if (!canPerform(state.role, "create_job")) return result(false, "Your role cannot add products to service orders.");
        const serviceOrder = state.serviceOrders.find((candidate) => candidate.id === serviceOrderId);
        if (!serviceOrder) return result(false, "Service order not found.");
        const appliance = state.appliances.find((candidate) => candidate.id === applianceId);
        if (!appliance) return result(false, "Choose a valid product.");
        const existingLines = state.jobCards.filter((line) => line.serviceOrderId === serviceOrderId);
        if (existingLines.some((line) => line.applianceId === applianceId)) return result(false, "This product is already part of this service order.");
        if (problemDescription.trim().length < 4) return result(false, "Describe the reported problem.");
        if (technicianId) {
          const technician = state.technicians.find((candidate) => candidate.id === technicianId);
          if (!technician) return result(false, "Choose a valid technician.");
          if (technician.branchId !== serviceOrder.branchId) return result(false, "Assigned technician must belong to the receiving branch.");
          if (!technician.skills.includes(appliance.category)) return result(false, `${technician.name} is not qualified for ${appliance.category}.`);
          if (technician.status === "Off Duty") return result(false, `${technician.name} is off duty.`);
        }

        const now = new Date().toISOString();
        const sequenceNo = existingLines.length + 1;
        const lineDocumentNo = `${serviceOrder.documentNo}-${String(sequenceNo).padStart(2, "0")}`;
        const job: JobCard = {
          id: nextId("job"),
          serviceOrderId,
          sequenceNo,
          documentNo: lineDocumentNo,
          invoiceNo: `INV-${lineDocumentNo}`,
          customerId: serviceOrder.customerId,
          applianceId,
          technicianId: technicianId ?? null,
          branchId: serviceOrder.branchId,
          jobType,
          status: "Received",
          currentStage: "Received",
          problemDescription: problemDescription.trim(),
          estimateAmount: null,
          finalAmount: null,
          createdAt: now,
          updatedAt: now,
          scheduledAt: technicianId ? new Date(new Date(now).setDate(new Date(now).getDate() + 1)).toISOString() : null,
          customerApproved: null,
          diagnosisNotes: null,
          repairNotes: null,
          qaApproved: false,
          customerSignature: null,
        };
        const history: JobCardStageHistory = { id: nextId("hist"), jobcardId: job.id, stageName: "Received", changedBy: "Front Desk", timestamp: now, notes: `Product sequence ${String(sequenceNo).padStart(2, "0")} received at counter.`, stageRefNo: nextStageRefNo(state.stageHistory, "Received") };
        const logs = buildTriggeredLogs(state, job, "Received", now);
        set((current) => ({
          jobCards: [job, ...current.jobCards],
          stageHistory: [history, ...current.stageHistory],
          communicationLogs: [...logs, ...current.communicationLogs],
          technicians: syncTechnicianStatuses(current.technicians, [job, ...current.jobCards]),
          serviceOrders: current.serviceOrders.map((order) => order.id === serviceOrderId ? { ...order, updatedAt: now } : order),
        }));
        scheduleCommunicationReceipts(logs);
        return { ...result(true, `${lineDocumentNo} added to ${serviceOrder.documentNo}.`), job };
      },

      createJobCard: ({ customerId, applianceId, jobType, problemDescription, branchId }) => {
        const created = get().createServiceOrder({ customerId, branchId, lines: [{ applianceId, jobType, problemDescription }] });
        return { ok: created.ok, message: created.message, job: created.jobs?.[0] };
      },

      advanceStage: (jobcardId, targetStage, notes, changedBy) => {
        const state = get();
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (!canAdvanceCurrentStage(state.role, job.currentStage)) return result(false, `${state.role.replace("_", " ")} cannot complete ${job.currentStage}.`);
        const workflow = state.workflows.find((candidate) => candidate.active && candidate.jobType === job.jobType);
        const currentIndex = workflow?.steps.findIndex((step) => step.stepName === job.currentStage) ?? -1;
        const nextStep = currentIndex >= 0 ? workflow?.steps[currentIndex + 1] : undefined;
        if (!nextStep || nextStep.stepName !== targetStage) return result(false, "Workflow changed. Refresh the job before advancing.");
        const blockers = stageBlockers(job, {
          payments: state.payments.filter((payment) => payment.jobcardId === job.id),
          purchaseBill: state.purchaseBills.find((bill) => bill.jobcardId === job.id),
        });
        if (blockers.length) return result(false, `Complete first: ${blockers.join(", ")}.`);

        const now = new Date().toISOString();
        const updatedJob: JobCard = { ...job, currentStage: targetStage, status: STAGE_TO_STATUS[targetStage], updatedAt: now };
        const history: JobCardStageHistory = { id: nextId("hist"), jobcardId, stageName: targetStage, changedBy, timestamp: now, notes, stageRefNo: nextStageRefNo(state.stageHistory, targetStage) };
        const logs = buildTriggeredLogs(state, updatedJob, targetStage, now);
        const jobs = state.jobCards.map((candidate) => candidate.id === jobcardId ? updatedJob : candidate);
        set({
          jobCards: jobs,
          stageHistory: [history, ...state.stageHistory],
          communicationLogs: [...logs, ...state.communicationLogs],
          technicians: syncTechnicianStatuses(state.technicians, jobs),
        });
        scheduleCommunicationReceipts(logs);
        return result(true, `Advanced to ${targetStage}.`);
      },

      assignTechnician: (jobcardId, technicianId) => {
        const state = get();
        if (!canPerform(state.role, "assign_technician")) return result(false, "Your role cannot assign technicians.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        const technician = state.technicians.find((candidate) => candidate.id === technicianId);
        const appliance = state.appliances.find((candidate) => candidate.id === job?.applianceId);
        if (!job || !technician || !appliance) return result(false, "Job, technician, or appliance was not found.");
        if (job.status === "Delivered") return result(false, "Delivered jobs cannot be reassigned.");
        if (technician.branchId !== job.branchId) return result(false, "Technician must belong to the job branch.");
        if (!technician.skills.includes(appliance.category)) return result(false, `Technician is not qualified for ${appliance.category}.`);
        if (technician.status === "Off Duty") return result(false, "Technician is off duty.");
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + 1);
        scheduled.setHours(9, 0, 0, 0);
        const jobs = state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, technicianId, scheduledAt: candidate.scheduledAt ?? scheduled.toISOString(), updatedAt: new Date().toISOString() } : candidate);
        set({ jobCards: jobs, technicians: syncTechnicianStatuses(state.technicians, jobs) });
        return result(true, `Assigned to ${technician.name}.`);
      },

      setDiagnosis: (jobcardId, notes) => {
        const state = get();
        if (!canPerform(state.role, "set_diagnosis")) return result(false, "Your role cannot record diagnosis notes.");
        if (!notes.trim()) return result(false, "Diagnosis notes are required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "Diagnosis") return result(false, "Diagnosis notes can only be changed during Diagnosis.");
        set({ jobCards: state.jobCards.map((job) => job.id === jobcardId ? { ...job, diagnosisNotes: notes.trim(), updatedAt: new Date().toISOString() } : job) });
        return result(true, "Diagnosis notes saved.");
      },
      setEstimate: (jobcardId, amount) => {
        const state = get();
        if (!canPerform(state.role, "set_estimate")) return result(false, "Your role cannot set estimates.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "Estimate" && job.currentStage !== "Customer Approval") return result(false, "Estimates can only be changed before repair begins.");
        const partsTotal = state.partsUsed.filter((part) => part.jobcardId === jobcardId).reduce((sum, part) => sum + part.totalPrice, 0);
        if (!Number.isFinite(amount) || amount <= 0) return result(false, "Estimate must be greater than zero.");
        if (amount < partsTotal) return result(false, `Estimate cannot be below the ${partsTotal.toLocaleString()} SAR parts total.`);
        const now = new Date().toISOString();
        const updatedJob = { ...job, estimateAmount: amount, customerApproved: null, updatedAt: now };
        const logs = job.currentStage === "Customer Approval" ? buildTriggeredLogs(state, updatedJob, "Customer Approval", now) : [];
        set({
          jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? updatedJob : candidate),
          communicationLogs: [...logs, ...state.communicationLogs],
        });
        scheduleCommunicationReceipts(logs);
        return result(true, `Estimate set to SAR ${amount.toLocaleString()}.`);
      },
      approveCustomer: (jobcardId, approved, source = "internal") => {
        const state = get();
        if (source === "internal" && !canPerform(state.role, "record_customer_approval")) return result(false, "Your role cannot record customer approval.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "Customer Approval") return result(false, "Customer approval is only available at the approval stage.");
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
        return result(true, approved ? "Customer approval recorded." : "Customer decline recorded.");
      },
      setRepairNotes: (jobcardId, notes) => {
        const state = get();
        if (!canPerform(state.role, "set_repair_notes")) return result(false, "Your role cannot record repair notes.");
        if (!notes.trim()) return result(false, "Repair notes are required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "Repair") return result(false, "Repair notes can only be changed during Repair.");
        set({ jobCards: state.jobCards.map((job) => job.id === jobcardId ? { ...job, repairNotes: notes.trim(), updatedAt: new Date().toISOString() } : job) });
        return result(true, "Repair notes saved.");
      },
      setQaApproved: (jobcardId, approved) => {
        const state = get();
        if (!canPerform(state.role, "approve_qa")) return result(false, "Supervisor, Manager, or Admin approval is required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "QA") return result(false, "QA can only be approved during the QA stage.");
        set({ jobCards: state.jobCards.map((job) => job.id === jobcardId ? { ...job, qaApproved: approved, updatedAt: new Date().toISOString() } : job) });
        return result(true, approved ? "QA approved." : "QA approval removed.");
      },
      setFinalAmount: (jobcardId, amount) => {
        const state = get();
        if (!canPerform(state.role, "finalize_job")) return result(false, "Your role cannot finalize charges.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "Ready for Handover") return result(false, "Final charges are confirmed at Ready for Handover.");
        if (job.jobType !== "non_warranty") return result(false, "Warranty jobs do not require customer payment.");
        const partsTotal = state.partsUsed.filter((part) => part.jobcardId === jobcardId).reduce((sum, part) => sum + part.totalPrice, 0);
        if (!Number.isFinite(amount) || amount <= 0) return result(false, "Final amount must be greater than zero.");
        if (amount < partsTotal) return result(false, `Final amount cannot be below the ${partsTotal.toLocaleString()} SAR parts total.`);
        if ((job.estimateAmount ?? 0) > 0 && amount > (job.estimateAmount ?? 0)) return result(false, "Final amount cannot exceed the customer-approved estimate.");
        if (state.payments.some((payment) => payment.jobcardId === jobcardId && payment.status === "paid")) return result(false, "Final amount cannot change after payment.");
        set({ jobCards: state.jobCards.map((candidate) => candidate.id === jobcardId ? { ...candidate, finalAmount: amount, updatedAt: new Date().toISOString() } : candidate) });
        return result(true, `Final amount set to SAR ${amount.toLocaleString()}.`);
      },
      captureCustomerSignature: (jobcardId, signature) => {
        const state = get();
        if (!canPerform(state.role, "capture_signature")) return result(false, "Your role cannot capture handover signatures.");
        if (!signature.trim()) return result(false, "Customer name or signature is required.");
        const job = state.jobCards.find((candidate) => candidate.id === jobcardId);
        if (!job) return result(false, "Job card not found.");
        if (job.currentStage !== "Ready for Handover") return result(false, "Customer signature is captured at Ready for Handover.");
        set({ jobCards: state.jobCards.map((job) => job.id === jobcardId ? { ...job, customerSignature: signature.trim(), updatedAt: new Date().toISOString() } : job) });
        return result(true, "Customer signature captured.");
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
        if (job.jobType === "non_warranty" && job.currentStage === "Repair" && job.customerApproved === true && currentPartsTotal + item.unitPrice * qty > (job.estimateAmount ?? 0)) {
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

      resetDemoData: () => {
        counter = COUNTER_START;
        set({
          ...initialSlice(),
          role: "admin",
          selectedBranchId: "all",
          theme: "light",
          lang: "en",
          sidebarCollapsed: false,
          maintenanceRemindersSent: {},
        });
      },

      logRemovedPart: (jobcardId, description, serialNo, removedBy) => {
        const part: RemovedPart = {
          id: nextId("rp"),
          jobcardId,
          description,
          serialNo,
          removedAt: new Date().toISOString(),
          removedBy,
          returnStatus: "pending",
        };
        set((s) => ({ removedParts: [part, ...s.removedParts] }));
        return part;
      },

      notifyCustomerOfRemovedPart: (removedPartId) => {
        set((s) => ({
          removedParts: s.removedParts.map((p) =>
            p.id === removedPartId ? { ...p, customerNotifiedAt: new Date().toISOString() } : p
          ),
        }));
      },

      confirmPartReturned: (removedPartId, confirmedBy) => {
        set((s) => ({
          removedParts: s.removedParts.map((p) =>
            p.id === removedPartId
              ? { ...p, returnStatus: "returned_to_customer", returnConfirmedAt: new Date().toISOString(), returnConfirmedBy: confirmedBy }
              : p
          ),
        }));
      },
    }),
    { name: "crm-demo-store-v3", version: 3 }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "crm-demo-store-v3") void useStore.persist.rehydrate();
  });
}
