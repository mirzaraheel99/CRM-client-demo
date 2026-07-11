import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as seed from "./seed";
import type {
  Customer, Appliance, ApplianceTelemetry, Brand, Technician, InventoryItem, InventoryLocation,
  InventoryStock, InventoryTransaction, JobCard, JobCardStageHistory,
  JobCardAttachment, JobCardPartUsed, PurchaseBill, CommunicationLog,
  WorkflowDefinition, Role, StageName, Branch, Payment, PaymentMethod,
} from "./types";

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
  jobCards: JobCard[];
  stageHistory: JobCardStageHistory[];
  attachments: JobCardAttachment[];
  partsUsed: JobCardPartUsed[];
  purchaseBills: PurchaseBill[];
  communicationLogs: CommunicationLog[];
  workflows: WorkflowDefinition[];
  payments: Payment[];

  // UI/global chrome state
  role: Role;
  selectedBranchId: string | "all";
  theme: "light" | "dark";
  lang: "en" | "ar";
  sidebarCollapsed: boolean;
  maintenanceRemindersSent: Record<string, string>;

  setRole: (r: Role) => void;
  setBranch: (b: string | "all") => void;
  setTheme: (t: "light" | "dark") => void;
  setLang: (l: "en" | "ar") => void;
  toggleSidebar: () => void;

  addCustomer: (c: Omit<Customer, "id" | "createdAt" | "whatsappVerified">) => Customer;
  verifyWhatsapp: (customerId: string) => void;
  addAppliance: (a: Omit<Appliance, "id">) => Appliance;
  addBrand: (b: Omit<Brand, "id">) => Brand;
  addTechnician: (t: Omit<Technician, "id">) => Technician;
  addInventoryItem: (i: Omit<InventoryItem, "id">) => InventoryItem;
  addInventoryTransaction: (t: Omit<InventoryTransaction, "id" | "timestamp">) => void;

  createJobCard: (input: {
    customerId: string; applianceId: string; jobType: JobCard["jobType"];
    problemDescription: string; branchId: string;
  }) => JobCard;
  advanceStage: (jobcardId: string, stage: StageName, notes: string, changedBy: string) => void;
  assignTechnician: (jobcardId: string, technicianId: string) => void;
  setEstimate: (jobcardId: string, amount: number) => void;
  approveCustomer: (jobcardId: string, approved: boolean) => void;
  addPartUsed: (jobcardId: string, itemId: string, qty: number) => void;
  addAttachment: (jobcardId: string, stageName: StageName, label: string) => void;
  sendCommunication: (jobcardId: string, channel: CommunicationLog["channel"], message: string) => void;
  updateWorkflowStep: (workflowId: string, stepOrder: number, patch: Partial<WorkflowDefinition["steps"][number]>) => void;
  addWorkflowStep: (workflowId: string, step: WorkflowDefinition["steps"][number]) => void;
  sendMaintenanceReminder: (applianceId: string) => void;
  recordPayment: (jobcardId: string, method: PaymentMethod, amount: number, installments?: number) => Payment;

  resetDemoData: () => void;
}

let counter = 100000;
const nextId = (prefix: string) => `${prefix}-${(counter++).toString(36)}`;

const initialSlice = () => ({
  branches: seed.BRANCHES,
  customers: seed.CUSTOMERS,
  brands: seed.BRANDS,
  appliances: seed.APPLIANCES,
  applianceTelemetry: seed.APPLIANCE_TELEMETRY,
  technicians: seed.TECHNICIANS,
  inventoryItems: seed.INVENTORY_ITEMS,
  inventoryLocations: seed.INVENTORY_LOCATIONS,
  inventoryStock: seed.INVENTORY_STOCK,
  inventoryTransactions: seed.INVENTORY_TRANSACTIONS,
  jobCards: seed.JOB_CARDS,
  stageHistory: seed.STAGE_HISTORY,
  attachments: seed.ATTACHMENTS,
  partsUsed: seed.PARTS_USED,
  purchaseBills: seed.PURCHASE_BILLS,
  communicationLogs: seed.COMMUNICATION_LOGS,
  workflows: seed.WORKFLOWS,
  payments: seed.PAYMENTS,
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

      setRole: (r) => set({ role: r }),
      setBranch: (b) => set({ selectedBranchId: b }),
      setTheme: (t) => set({ theme: t }),
      setLang: (l) => set({ lang: l }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      addCustomer: (c) => {
        const customer: Customer = { ...c, id: nextId("cust"), createdAt: new Date().toISOString(), whatsappVerified: false };
        set((s) => ({ customers: [customer, ...s.customers] }));
        return customer;
      },
      verifyWhatsapp: (customerId) => {
        set((s) => ({ customers: s.customers.map((c) => (c.id === customerId ? { ...c, whatsappVerified: true } : c)) }));
      },
      addAppliance: (a) => {
        const appliance: Appliance = { ...a, id: nextId("app") };
        set((s) => ({ appliances: [appliance, ...s.appliances] }));
        return appliance;
      },
      addBrand: (b) => {
        const brand: Brand = { ...b, id: nextId("brand") };
        set((s) => ({ brands: [brand, ...s.brands] }));
        return brand;
      },
      addTechnician: (t) => {
        const tech: Technician = { ...t, id: nextId("tech") };
        set((s) => ({ technicians: [tech, ...s.technicians] }));
        return tech;
      },
      addInventoryItem: (i) => {
        const item: InventoryItem = { ...i, id: nextId("item") };
        set((s) => ({ inventoryItems: [item, ...s.inventoryItems] }));
        return item;
      },
      addInventoryTransaction: (t) => {
        const txn: InventoryTransaction = { ...t, id: nextId("txn"), timestamp: new Date().toISOString() };
        set((s) => {
          const stock = [...s.inventoryStock];
          const applyDelta = (locationId: string, delta: number) => {
            const idx = stock.findIndex((st) => st.itemId === t.itemId && st.locationId === locationId);
            if (idx >= 0) stock[idx] = { ...stock[idx], qty: Math.max(0, stock[idx].qty + delta) };
            else stock.push({ itemId: t.itemId, locationId, qty: Math.max(0, delta) });
          };
          if (t.type === "receive") applyDelta(t.locationId, t.qty);
          if (t.type === "issue") applyDelta(t.locationId, -t.qty);
          if (t.type === "return") applyDelta(t.locationId, t.qty);
          if (t.type === "adjust") applyDelta(t.locationId, t.qty);
          if (t.type === "transfer" && t.destLocationId) {
            applyDelta(t.locationId, -t.qty);
            applyDelta(t.destLocationId, t.qty);
          }
          return { inventoryTransactions: [txn, ...s.inventoryTransactions], inventoryStock: stock };
        });
      },

      createJobCard: ({ customerId, applianceId, jobType, problemDescription, branchId }) => {
        const now = new Date().toISOString();
        const job: JobCard = {
          id: nextId("job"),
          customerId,
          applianceId,
          technicianId: null,
          branchId,
          jobType,
          status: "Received",
          currentStage: "Received",
          problemDescription,
          estimateAmount: null,
          finalAmount: null,
          createdAt: now,
          updatedAt: now,
          scheduledAt: null,
          customerApproved: null,
        };
        set((s) => ({
          jobCards: [job, ...s.jobCards],
          stageHistory: [
            { id: nextId("hist"), jobcardId: job.id, stageName: "Received", changedBy: "Front Desk", timestamp: now, notes: "Item received at counter." },
            ...s.stageHistory,
          ],
        }));
        return job;
      },

      advanceStage: (jobcardId, stage, notes, changedBy) => {
        const now = new Date().toISOString();
        set((s) => ({
          jobCards: s.jobCards.map((j) =>
            j.id === jobcardId ? { ...j, currentStage: stage, status: STAGE_TO_STATUS[stage], updatedAt: now } : j
          ),
          stageHistory: [
            { id: nextId("hist"), jobcardId, stageName: stage, changedBy, timestamp: now, notes },
            ...s.stageHistory,
          ],
        }));
      },

      assignTechnician: (jobcardId, technicianId) => {
        set((s) => ({
          jobCards: s.jobCards.map((j) => (j.id === jobcardId ? { ...j, technicianId, updatedAt: new Date().toISOString() } : j)),
        }));
      },

      setEstimate: (jobcardId, amount) => {
        set((s) => ({
          jobCards: s.jobCards.map((j) => (j.id === jobcardId ? { ...j, estimateAmount: amount, updatedAt: new Date().toISOString() } : j)),
        }));
      },

      approveCustomer: (jobcardId, approved) => {
        set((s) => ({
          jobCards: s.jobCards.map((j) => (j.id === jobcardId ? { ...j, customerApproved: approved, updatedAt: new Date().toISOString() } : j)),
        }));
      },

      addPartUsed: (jobcardId, itemId, qty) => {
        const item = get().inventoryItems.find((i) => i.id === itemId);
        if (!item) return;
        const part: JobCardPartUsed = { id: nextId("part"), jobcardId, itemId, qty, unitPrice: item.unitPrice, totalPrice: item.unitPrice * qty };
        set((s) => ({ partsUsed: [part, ...s.partsUsed] }));
      },

      addAttachment: (jobcardId, stageName, label) => {
        const att: JobCardAttachment = { id: nextId("att"), jobcardId, stageName, fileUrl: "#", label, uploadedBy: "You", timestamp: new Date().toISOString() };
        set((s) => ({ attachments: [att, ...s.attachments] }));
      },

      sendCommunication: (jobcardId, channel, message) => {
        const id = nextId("comm");
        const log: CommunicationLog = { id, jobcardId, channel, to: "+9665xxxxxxxx", message, status: "sent", timestamp: new Date().toISOString() };
        set((s) => ({ communicationLogs: [log, ...s.communicationLogs] }));
        // Simulate a delivery receipt arriving shortly after send, the way a real
        // WhatsApp/SMS webhook callback would update status asynchronously.
        const setStatus = (status: CommunicationLog["status"]) =>
          set((s) => ({ communicationLogs: s.communicationLogs.map((c) => (c.id === id ? { ...c, status } : c)) }));
        setTimeout(() => setStatus("delivered"), 2200);
        if (channel === "whatsapp") setTimeout(() => setStatus("read"), 5500);
      },

      updateWorkflowStep: (workflowId, stepOrder, patch) => {
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === workflowId
              ? { ...w, steps: w.steps.map((step) => (step.stepOrder === stepOrder ? { ...step, ...patch } : step)) }
              : w
          ),
        }));
      },

      addWorkflowStep: (workflowId, step) => {
        set((s) => ({
          workflows: s.workflows.map((w) => (w.id === workflowId ? { ...w, steps: [...w.steps, step] } : w)),
        }));
      },

      sendMaintenanceReminder: (applianceId) => {
        set((s) => ({ maintenanceRemindersSent: { ...s.maintenanceRemindersSent, [applianceId]: new Date().toISOString() } }));
      },

      recordPayment: (jobcardId, method, amount, installments) => {
        const payment: Payment = { id: nextId("pay"), jobcardId, method, amount, installments, status: "paid", timestamp: new Date().toISOString() };
        set((s) => ({ payments: [payment, ...s.payments] }));
        return payment;
      },

      resetDemoData: () => set({ ...initialSlice(), maintenanceRemindersSent: {} }),
    }),
    { name: "crm-demo-store-v1" }
  )
);
