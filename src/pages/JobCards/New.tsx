import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Field, Select, Textarea, Button, Badge } from "../../components/ui";
import { JobTypeBadge } from "../../components/StatusBadge";
import { toast } from "../../lib/toast";
import { filterByBranch } from "../../lib/selectors";
import { formatDate, formatSequence } from "../../lib/utils";
import type { JobType } from "../../lib/types";

type IntakeLine = {
  key: number;
  applianceId: string;
  problem: string;
  jobTypeOverride: JobType | "auto";
};

let lineKey = 1;

function emptyLine(applianceId = ""): IntakeLine {
  return { key: lineKey++, applianceId, problem: "", jobTypeOverride: "auto" };
}

export default function NewJobCard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customers, appliances, brands, branches, selectedBranchId, createServiceOrder } = useStore();
  const initialCustomerId = searchParams.get("customerId") ?? "";
  const initialCustomer = customers.find((customer) => customer.id === initialCustomerId);
  const initialApplianceId = searchParams.get("applianceId") ?? "";
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [branchId, setBranchId] = useState(initialCustomer?.branchId ?? (selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId));
  const [lines, setLines] = useState<IntakeLine[]>([emptyLine(initialApplianceId)]);

  const scopedCustomers = useMemo(() => filterByBranch(customers, selectedBranchId), [customers, selectedBranchId]);
  const brandMap = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const applianceMap = useMemo(() => new Map(appliances.map((appliance) => [appliance.id, appliance])), [appliances]);
  const selectedIds = useMemo(() => new Set(lines.map((line) => line.applianceId).filter(Boolean)), [lines]);
  const canSubmit = Boolean(
    customerId && branchId && lines.length > 0 &&
    lines.every((line) => line.applianceId && line.problem.trim().length > 3) &&
    selectedIds.size === lines.length
  );

  function selectCustomer(nextCustomerId: string) {
    const customer = customers.find((candidate) => candidate.id === nextCustomerId);
    setCustomerId(nextCustomerId);
    if (customer) setBranchId(customer.branchId);
  }

  function patchLine(key: number, patch: Partial<IntakeLine>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function submit() {
    if (!canSubmit) return;
    const result = createServiceOrder({
      customerId,
      branchId,
      lines: lines.map((line) => {
        const appliance = applianceMap.get(line.applianceId);
        const detected: JobType = appliance?.warrantyStatus === "In Warranty" ? "warranty" : "non_warranty";
        return {
          applianceId: line.applianceId,
          jobType: line.jobTypeOverride === "auto" ? detected : line.jobTypeOverride,
          problemDescription: line.problem,
        };
      }),
    });
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok && result.jobs?.[0]) navigate(`/jobcards/${result.jobs[0].id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">New Service Order</h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">One customer order with a separate numbered workflow for every product received.</p>
      </div>

      <Card className="space-y-4">
        <CardHeader title="Customer and receiving branch" subtitle="The phone number identifies the customer; products are associated through this service order." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer">
            <Select value={customerId} onChange={(event) => selectCustomer(event.target.value)}>
              <option value="">Choose by name or phone...</option>
              {scopedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.documentNo} - {customer.name} - {customer.phone}</option>)}
            </Select>
          </Field>
          <Field label="Receiving branch">
            <Select value={branchId} disabled={Boolean(customerId)} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardHeader title="Product sequences" subtitle="Each sequence keeps its own dates, warranty, diagnosis, estimate, invoice, technician, and status." />
          <Button variant="secondary" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>
            <Plus size={14} /> Add product
          </Button>
        </div>

        <div className="divide-y [border-color:var(--color-border)]">
          {lines.map((line, index) => {
            const appliance = applianceMap.get(line.applianceId);
            const brand = appliance ? brandMap.get(appliance.brandId) : undefined;
            const detectedJobType: JobType = appliance?.warrantyStatus === "In Warranty" ? "warranty" : "non_warranty";
            return (
              <section key={line.key} className="py-5 first:pt-1 last:pb-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">Sequence {formatSequence(index + 1)}</Badge>
                    {appliance && <span className="text-xs text-[var(--color-ink-muted)]">{appliance.documentNo}</span>}
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      title={`Remove sequence ${formatSequence(index + 1)}`}
                      aria-label={`Remove sequence ${formatSequence(index + 1)}`}
                      onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-black/[0.05] hover:text-[var(--color-status-critical)] dark:hover:bg-white/[0.08]"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Product / equipment">
                    <Select value={line.applianceId} onChange={(event) => patchLine(line.key, { applianceId: event.target.value })}>
                      <option value="">Choose a registered product...</option>
                      {appliances.map((candidate) => (
                        <option key={candidate.id} value={candidate.id} disabled={selectedIds.has(candidate.id) && candidate.id !== line.applianceId}>
                          {candidate.documentNo} - {candidate.model} - SN {candidate.serialNo}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Warranty handling">
                    <Select value={line.jobTypeOverride} onChange={(event) => patchLine(line.key, { jobTypeOverride: event.target.value as JobType | "auto" })}>
                      <option value="auto">Auto-detect ({detectedJobType === "warranty" ? "Warranty" : "Non-Warranty"})</option>
                      <option value="warranty">Force Warranty</option>
                      <option value="non_warranty">Force Non-Warranty</option>
                    </Select>
                  </Field>
                </div>

                {appliance && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-black/[0.03] p-3 text-sm dark:bg-white/[0.05]">
                    <div>
                      <p className="font-medium">{appliance.model}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">{brand?.name} | Purchased {formatDate(appliance.purchaseDate)} | Serial {appliance.serialNo}</p>
                    </div>
                    <JobTypeBadge jobType={detectedJobType} />
                  </div>
                )}

                <div className="mt-4">
                  <Field label="Reported problem / requested service">
                    <Textarea rows={3} value={line.problem} onChange={(event) => patchLine(line.key, { problem: event.target.value })} placeholder="Describe the issue for this product sequence..." />
                  </Field>
                </div>
              </section>
            );
          })}
        </div>

        {lines.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--color-ink-muted)]">
            <PackagePlus size={22} />
            <p className="text-sm">Add at least one product to this service order.</p>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit}>Create service order ({lines.length} {lines.length === 1 ? "sequence" : "sequences"})</Button>
      </div>
    </div>
  );
}
