import type { FastifyRequest } from "fastify";

// Supervisor/manager/admin can see across branches (the "main branch sees
// everything" tier); front_desk and technician are pinned to their own home
// branch, both here and on the frontend's branch switcher.
const CROSS_BRANCH_ROLES = ["supervisor", "manager", "admin"];

export function canViewAllBranches(role: string): boolean {
  return CROSS_BRANCH_ROLES.includes(role);
}

// Returns the branchId a list route should filter by, or undefined for no
// filter (see everything). A non-management caller's own branch always wins,
// regardless of what branchId they asked for -- this is the actual security
// boundary; the frontend's branch switcher is just a convenience on top of it.
export function resolveBranchScope(request: FastifyRequest, requestedBranchId?: string): string | undefined {
  const user = request.currentUser!;
  if (canViewAllBranches(user.role)) return requestedBranchId || undefined;
  return user.branchId;
}
