import type { Role, StageName } from "./types";

export type DemoAction =
  | "create_customer"
  | "create_appliance"
  | "create_job"
  | "manage_brand"
  | "manage_category"
  | "manage_unit"
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
  | "send_message"
  | "manage_settings";

const ALL_ROLES: Role[] = ["front_desk", "technician", "supervisor", "manager", "admin"];
const MANAGEMENT: Role[] = ["supervisor", "manager", "admin"];
const OFFICE: Role[] = ["front_desk", "supervisor", "manager", "admin"];
const TECHNICAL: Role[] = ["technician", "supervisor", "manager", "admin"];

const DEFAULT_ACTION_ROLES: Record<DemoAction, Role[]> = {
  create_customer: OFFICE,
  create_appliance: OFFICE,
  create_job: OFFICE,
  manage_brand: ["manager", "admin"],
  manage_category: ["manager", "admin"],
  manage_unit: ["manager", "admin"],
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
  manage_settings: ["admin"],
};

// The permission matrix is admin-editable at runtime (see Settings > Role
// Permissions) and enforced server-side by the backend's own RolePermission
// table -- this module-level cache is populated from that table (via
// store.ts's hydrate(), see syncActionRolesFromServer below) so canPerform()
// can stay a plain synchronous function usable from anywhere without every
// call site needing store access. It starts out as the shared defaults so
// there's a sane fallback before the first hydrate() completes.
function cloneActionRoles(table: Record<DemoAction, Role[]>): Record<DemoAction, Role[]> {
  return Object.fromEntries(Object.entries(table).map(([action, roles]) => [action, [...roles]])) as Record<DemoAction, Role[]>;
}

let ACTION_ROLES: Record<DemoAction, Role[]> = cloneActionRoles(DEFAULT_ACTION_ROLES);

export function canPerform(role: Role, action: DemoAction) {
  return ACTION_ROLES[action].includes(role);
}

export function getActionRoles(): Record<DemoAction, Role[]> {
  return cloneActionRoles(ACTION_ROLES);
}

export function getDefaultActionRoles(): Record<DemoAction, Role[]> {
  return cloneActionRoles(DEFAULT_ACTION_ROLES);
}

// Called from store.ts's hydrate() with the backend's effective permission
// table (GET /api/role-permissions). Any action the server doesn't mention
// keeps its built-in default, so a partial/failed fetch never locks anyone out.
export function syncActionRolesFromServer(rows: { action: string; roles: Role[] }[]) {
  const next = cloneActionRoles(DEFAULT_ACTION_ROLES);
  for (const row of rows) {
    if (row.action in next) next[row.action as DemoAction] = [...row.roles];
  }
  ACTION_ROLES = next;
}

export function canAccessPath(role: Role, path: string) {
  if (path.startsWith("/track/")) return true;
  if (path.startsWith("/predictive-maintenance")) return MANAGEMENT.includes(role);
  if (path.startsWith("/brands")) return ["manager", "admin"].includes(role);
  if (path.startsWith("/categories")) return ["manager", "admin"].includes(role);
  if (path.startsWith("/units")) return ["manager", "admin"].includes(role);
  if (path.startsWith("/technicians")) return MANAGEMENT.includes(role);
  if (path.startsWith("/workflow")) return ["manager", "admin"].includes(role);
  if (path.startsWith("/reports")) return MANAGEMENT.includes(role);
  if (path.startsWith("/jobcards/new")) return OFFICE.includes(role);
  if (path.startsWith("/settings")) return role === "admin";
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
