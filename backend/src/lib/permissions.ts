import type { Role } from "@prisma/client";

// Server-side mirror of the frontend's src/lib/permissions.ts default table —
// this is the authoritative copy now; RolePermission rows in the database
// (seeded from DEFAULT_ACTION_ROLES) are what admins actually edit at runtime.
export type DemoAction =
  | "create_customer"
  | "create_appliance"
  | "create_job"
  | "manage_branch"
  | "manage_zone"
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

export const DEFAULT_ACTION_ROLES: Record<DemoAction, Role[]> = {
  create_customer: OFFICE,
  create_appliance: OFFICE,
  create_job: OFFICE,
  manage_branch: ["admin"],
  manage_zone: ["manager", "admin"],
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

export const ALL_ACTIONS = Object.keys(DEFAULT_ACTION_ROLES) as DemoAction[];
