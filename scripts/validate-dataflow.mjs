import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const seedSource = readFileSync(new URL("../src/lib/seed.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(seedSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const seed = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const {
  APPLIANCES, BRANCHES, COMMUNICATION_LOGS, CUSTOMERS, INVENTORY_LOCATIONS,
  INVENTORY_STOCK, INVENTORY_TRANSACTIONS, JOB_CARDS, PARTS_USED, PAYMENTS,
  PURCHASE_BILLS, SERVICE_ORDERS, STAGE_HISTORY, TECHNICIANS, WORKFLOWS,
} = seed;

const failures = [];
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function assertUnique(rows, label) {
  const ids = rows.map((row) => row.id);
  assert(new Set(ids).size === ids.length, `${label} contains duplicate IDs.`);
}

const customerById = new Map(CUSTOMERS.map((customer) => [customer.id, customer]));
const applianceById = new Map(APPLIANCES.map((appliance) => [appliance.id, appliance]));
const serviceOrderById = new Map(SERVICE_ORDERS.map((order) => [order.id, order]));
const branchById = new Map(BRANCHES.map((branch) => [branch.id, branch]));
const technicianById = new Map(TECHNICIANS.map((technician) => [technician.id, technician]));
const locationById = new Map(INVENTORY_LOCATIONS.map((location) => [location.id, location]));
const workflowByType = new Map(WORKFLOWS.map((workflow) => [workflow.jobType, workflow]));
const statusByStage = {
  Received: "Received", "Warranty Validation": "In Diagnosis", Diagnosis: "In Diagnosis",
  Estimate: "Waiting Approval", "Customer Approval": "Waiting Approval", "OEM Approval": "Waiting Approval",
  Repair: "In Repair", QA: "QA", "Ready for Handover": "Ready", Delivered: "Delivered",
};

for (const [rows, label] of [
  [CUSTOMERS, "Customers"], [APPLIANCES, "Appliances"], [TECHNICIANS, "Technicians"],
  [SERVICE_ORDERS, "Service orders"], [JOB_CARDS, "Job cards"], [STAGE_HISTORY, "Stage history"], [PARTS_USED, "Parts used"],
  [INVENTORY_TRANSACTIONS, "Inventory transactions"], [COMMUNICATION_LOGS, "Communications"],
  [PAYMENTS, "Payments"],
]) assertUnique(rows, label);

for (const customer of CUSTOMERS) {
  const branch = branchById.get(customer.branchId);
  assert(Boolean(branch), `${customer.id} references a missing branch.`);
  assert(Boolean(branch && customer.address.includes(branch.city)), `${customer.id} address does not match ${branch?.city ?? "its branch"}.`);
}

assert(new Set(CUSTOMERS.map((customer) => customer.documentNo)).size === CUSTOMERS.length, "Customer document numbers are not unique.");
assert(new Set(APPLIANCES.map((appliance) => appliance.documentNo)).size === APPLIANCES.length, "Product document numbers are not unique.");
assert(new Set(SERVICE_ORDERS.map((order) => order.documentNo)).size === SERVICE_ORDERS.length, "Service order document numbers are not unique.");
assert(new Set(JOB_CARDS.map((job) => job.documentNo)).size === JOB_CARDS.length, "Job line document numbers are not unique.");
assert(new Set(JOB_CARDS.map((job) => job.invoiceNo)).size === JOB_CARDS.length, "Invoice numbers are not unique.");

for (const order of SERVICE_ORDERS) {
  const customer = customerById.get(order.customerId);
  const lines = JOB_CARDS.filter((job) => job.serviceOrderId === order.id).sort((a, b) => a.sequenceNo - b.sequenceNo);
  assert(Boolean(customer), `${order.id} references a missing customer.`);
  assert(customer?.branchId === order.branchId, `${order.id} branch differs from its customer branch.`);
  assert(lines.length > 0, `${order.id} has no product sequences.`);
  assert(lines.every((line, index) => line.sequenceNo === index + 1), `${order.id} sequence numbers are not contiguous.`);
  assert(new Set(lines.map((line) => line.applianceId)).size === lines.length, `${order.id} repeats a product within the same order.`);
  assert(lines.every((line) => line.customerId === order.customerId && line.branchId === order.branchId), `${order.id} line ownership or branch is inconsistent.`);
}

for (const job of JOB_CARDS) {
  const customer = customerById.get(job.customerId);
  const appliance = applianceById.get(job.applianceId);
  const serviceOrder = serviceOrderById.get(job.serviceOrderId);
  const workflow = workflowByType.get(job.jobType);
  const stages = workflow?.steps.map((step) => step.stepName) ?? [];
  const stageIndex = stages.indexOf(job.currentStage);
  const history = STAGE_HISTORY.filter((entry) => entry.jobcardId === job.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const technician = job.technicianId ? technicianById.get(job.technicianId) : null;

  assert(Boolean(customer), `${job.id} references a missing customer.`);
  assert(Boolean(appliance), `${job.id} references a missing appliance.`);
  assert(Boolean(serviceOrder), `${job.id} references a missing service order.`);
  assert(serviceOrder?.customerId === job.customerId, `${job.id} customer differs from its service order.`);
  assert(job.documentNo === `${serviceOrder?.documentNo}-${String(job.sequenceNo).padStart(2, "0")}`, `${job.id} document number does not match its order sequence.`);
  assert(job.invoiceNo === `INV-${job.documentNo}`, `${job.id} invoice number does not match its job line.`);
  assert(customer?.branchId === job.branchId, `${job.id} branch differs from its customer branch.`);
  assert(stageIndex >= 0, `${job.id} current stage is outside its workflow.`);
  assert(job.status === statusByStage[job.currentStage], `${job.id} status disagrees with its current stage.`);
  assert(history.length === stageIndex + 1, `${job.id} history length does not match its current stage.`);
  assert(history.every((entry, index) => entry.stageName === stages[index]), `${job.id} history is out of workflow order.`);
  assert(history.every((entry) => new Date(entry.timestamp) >= new Date(job.createdAt) && new Date(entry.timestamp) <= new Date(job.updatedAt)), `${job.id} has stage timestamps outside the job lifetime.`);

  if (stageIndex > 0) assert(Boolean(technician), `${job.id} progressed without a technician.`);
  if (technician && appliance) {
    assert(technician.branchId === job.branchId, `${job.id} technician belongs to another branch.`);
    assert(technician.skills.includes(appliance.category), `${job.id} technician lacks the ${appliance.category} skill.`);
  }

  const indexOf = (stage) => stages.indexOf(stage);
  if (job.jobType === "warranty" && stageIndex > indexOf("Warranty Validation")) {
    assert(PURCHASE_BILLS.some((bill) => bill.jobcardId === job.id), `${job.id} passed warranty validation without a purchase bill.`);
  }
  if (stageIndex > indexOf("Diagnosis")) assert(Boolean(job.diagnosisNotes), `${job.id} passed diagnosis without notes.`);
  if (job.jobType === "non_warranty" && stageIndex > indexOf("Estimate")) assert((job.estimateAmount ?? 0) > 0, `${job.id} passed estimate without an amount.`);
  if (job.jobType === "non_warranty" && stageIndex > indexOf("Customer Approval")) assert(job.customerApproved === true, `${job.id} passed approval without customer consent.`);
  if (stageIndex > indexOf("Repair")) assert(Boolean(job.repairNotes), `${job.id} passed repair without notes.`);
  if (stageIndex > indexOf("QA")) assert(job.qaApproved === true, `${job.id} passed QA without approval.`);
  const partsTotal = PARTS_USED.filter((part) => part.jobcardId === job.id).reduce((sum, part) => sum + part.totalPrice, 0);
  if (job.jobType === "non_warranty" && stageIndex >= indexOf("Repair")) assert((job.estimateAmount ?? 0) >= partsTotal, `${job.id} parts exceed the approved estimate.`);
  if (job.jobType === "non_warranty" && job.finalAmount != null) assert(job.finalAmount <= (job.estimateAmount ?? 0), `${job.id} final amount exceeds the approved estimate.`);

  if (job.currentStage === "Delivered") {
    assert(Boolean(job.customerSignature), `${job.id} was delivered without a signature.`);
    if (job.jobType === "non_warranty") {
      const paid = PAYMENTS.filter((payment) => payment.jobcardId === job.id && payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
      assert((job.finalAmount ?? 0) > 0, `${job.id} was delivered without a final amount.`);
      assert(paid >= (job.finalAmount ?? 0), `${job.id} was delivered before full payment.`);
    }
  }
}

for (const part of PARTS_USED) {
  const job = JOB_CARDS.find((candidate) => candidate.id === part.jobcardId);
  const location = locationById.get(part.locationId);
  const matchingIssue = INVENTORY_TRANSACTIONS.find((transaction) =>
    transaction.type === "issue" && transaction.jobcardId === part.jobcardId &&
    transaction.itemId === part.itemId && transaction.locationId === part.locationId && transaction.qty === part.qty
  );
  assert(Boolean(matchingIssue), `${part.id} has no matching stock issue transaction.`);
  assert(Boolean(job && location && job.branchId === location.branchId), `${part.id} was issued from another branch.`);
}

for (const stock of INVENTORY_STOCK) assert(stock.qty >= 0, `${stock.itemId}/${stock.locationId} has negative stock.`);

for (const communication of COMMUNICATION_LOGS) {
  const customer = customerById.get(communication.customerId);
  assert(Boolean(customer), `${communication.id} references a missing customer.`);
  if (!communication.jobcardId) continue;
  const job = JOB_CARDS.find((candidate) => candidate.id === communication.jobcardId);
  assert(Boolean(job), `${communication.id} references a missing job.`);
  assert(job?.customerId === communication.customerId, `${communication.id} targets the wrong customer.`);
  const expectedContact = communication.channel === "email" ? customer?.email : communication.channel === "whatsapp" ? customer?.whatsapp : customer?.phone;
  assert(communication.to === expectedContact, `${communication.id} uses the wrong ${communication.channel} destination.`);
  assert(Boolean(job && new Date(communication.timestamp) >= new Date(job.createdAt) && new Date(communication.timestamp) <= new Date(job.updatedAt)), `${communication.id} falls outside the job lifetime.`);
  assert(!communication.stageName || STAGE_HISTORY.some((entry) => entry.jobcardId === job?.id && entry.stageName === communication.stageName), `${communication.id} references a stage the job never reached.`);
  if (communication.stageName === "Delivered") assert(job?.status === "Delivered", `${communication.id} announces delivery for an open job.`);
}

for (const technician of TECHNICIANS) {
  const hasActiveJob = JOB_CARDS.some((job) => job.status !== "Delivered" && job.technicianId === technician.id);
  assert(technician.status === (hasActiveJob ? "On Job" : "Available"), `${technician.id} status disagrees with active assignments.`);
}

for (const payment of PAYMENTS) {
  const job = JOB_CARDS.find((candidate) => candidate.id === payment.jobcardId);
  assert(Boolean(job), `${payment.id} references a missing job.`);
  assert(payment.amount > 0 && payment.amount <= (job?.finalAmount ?? 0), `${payment.id} exceeds the job final amount.`);
}

if (failures.length) {
  console.error(`Data-flow validation failed: ${failures.length} issue(s) across ${checks} checks.`);
  for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
  if (failures.length > 30) console.error(`- ...and ${failures.length - 30} more`);
  process.exit(1);
}

console.log(`Data-flow validation passed: ${checks} checks across ${SERVICE_ORDERS.length} service orders, ${JOB_CARDS.length} job lines, ${PARTS_USED.length} part issues, and ${COMMUNICATION_LOGS.length} messages.`);
