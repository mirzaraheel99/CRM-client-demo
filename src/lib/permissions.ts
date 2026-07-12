import type { Role, StageName } from "./types";

export type DemoAction =
  | "create_customer"
  | "create_appliance"
  | "create_job"
  | "manage_brand"
  | "manage_inventory"
  | "assign_technician"
  | "edit_workflow"
  | "set_diagnosis"
  | "set_estimate"
  | "record_customer_approval"
  | "add_part"
  | "set_repair_notes"
  | "approve_qa"
  | "finalize_job"
  | "capture_signature"
  | "collect_payment"
  | "send_message";

const ALL_ROLES: Role[] = ["front_desk", "technician", "supervisor", "manager", "admin"];
const MANAGEMENT: Role[] = ["supervisor", "manager", "admin"];
const OFFICE: Role[] = ["front_desk", "supervisor", "manager", "admin"];
const TECHNICAL: Role[] = ["technician", "supervisor", "manager", "admin"];

const ACTION_ROLES: Record<DemoAction, Role[]> = {
  create_customer: OFFICE,
  create_appliance: OFFICE,
  create_job: OFFICE,
  manage_brand: ["manager", "admin"],
  manage_inventory: MANAGEMENT,
  assign_technician: MANAGEMENT,
  edit_workflow: ["manager", "admin"],
  set_diagnosis: TECHNICAL,
  set_estimate: TECHNICAL,
  record_customer_approval: OFFICE,
  add_part: TECHNICAL,
  set_repair_notes: TECHNICAL,
  approve_qa: MANAGEMENT,
  finalize_job: OFFICE,
  capture_signature: OFFICE,
  collect_payment: OFFICE,
  send_message: ALL_ROLES,
};

export function canPerform(role: Role, action: DemoAction) {
  return ACTION_ROLES[action].includes(role);
}

export function canAccessPath(role: Role, path: string) {
  if (path.startsWith("/track/")) return true;
  if (path.startsWith("/predictive-maintenance")) return MANAGEMENT.includes(role);
  if (path.startsWith("/brands")) return ["manager", "admin"].includes(role);
  if (path.startsWith("/technicians")) return MANAGEMENT.includes(role);
  if (path.startsWith("/workflow")) return ["manager", "admin"].includes(role);
  if (path.startsWith("/reports")) return MANAGEMENT.includes(role);
  if (path.startsWith("/jobcards/new")) return OFFICE.includes(role);
  return true;
}

export function canAdvanceCurrentStage(role: Role, stage: StageName) {
  if (["manager", "admin"].includes(role)) return true;
  if (role === "supervisor") return true;
  if (role === "technician") return stage === "Diagnosis" || stage === "Repair";
  return stage === "Received" || stage === "Estimate" || stage === "Customer Approval" || stage === "Ready for Handover";
}

export function accessLabel(role: Role) {
  return role === "front_desk" ? "Front Desk" : role.charAt(0).toUpperCase() + role.slice(1);
}
