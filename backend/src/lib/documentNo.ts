import { prisma } from "./prisma.js";

// Mirrors the frontend's incrementing document-number schemes (CUST-00001,
// SO-2026-00001, etc.) so numbers stay familiar across both data sources.
export async function nextCustomerDocumentNo(): Promise<string> {
  const count = await prisma.customer.count();
  return `CUST-${String(count + 1).padStart(5, "0")}`;
}

export async function nextApplianceDocumentNo(): Promise<string> {
  const count = await prisma.appliance.count();
  return `AST-${String(count + 1).padStart(5, "0")}`;
}

export async function nextServiceOrderDocumentNo(): Promise<string> {
  const count = await prisma.serviceOrder.count();
  const year = new Date().getFullYear();
  return `SO-${year}-${String(count + 1).padStart(5, "0")}`;
}
