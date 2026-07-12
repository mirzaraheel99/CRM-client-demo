import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Field, Select, Textarea, Button } from "../../components/ui";
import { JobTypeBadge } from "../../components/StatusBadge";
import { toast } from "../../lib/toast";
import { filterByBranch } from "../../lib/selectors";
import type { JobType } from "../../lib/types";

export default function NewJobCard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customers, appliances, brands, branches, selectedBranchId, createJobCard } = useStore();
  const initialCustomerId = searchParams.get("customerId") ?? "";
  const initialCustomer = customers.find((customer) => customer.id === initialCustomerId);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [applianceId, setApplianceId] = useState(searchParams.get("applianceId") ?? "");
  const [branchId, setBranchId] = useState(initialCustomer?.branchId ?? (selectedBranchId === "all" ? branches[0]?.id ?? "" : selectedBranchId));
  const [problem, setProblem] = useState("");
  const [jobTypeOverride, setJobTypeOverride] = useState<JobType | "auto">("auto");

  const scopedCustomers = useMemo(() => filterByBranch(customers, selectedBranchId), [customers, selectedBranchId]);
  const customerAppliances = useMemo(() => appliances.filter((appliance) => appliance.customerId === customerId), [appliances, customerId]);
  const selectedAppliance = appliances.find((appliance) => appliance.id === applianceId);
  const brand = brands.find((candidate) => candidate.id === selectedAppliance?.brandId);

  const detectedJobType: JobType = selectedAppliance?.warrantyStatus === "In Warranty" ? "warranty" : "non_warranty";
  const finalJobType = jobTypeOverride === "auto" ? detectedJobType : jobTypeOverride;
  const canSubmit = Boolean(customerId && applianceId && problem.trim().length > 3 && branchId);

  function selectCustomer(nextCustomerId: string) {
    const customer = customers.find((candidate) => candidate.id === nextCustomerId);
    setCustomerId(nextCustomerId);
    setApplianceId("");
    if (customer) setBranchId(customer.branchId);
  }

  function submit() {
    if (!canSubmit) return;
    const result = createJobCard({ customerId, applianceId, jobType: finalJobType, problemDescription: problem, branchId });
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok && result.job) navigate(`/jobcards/${result.job.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="animate-rise-in">
        <h1 className="text-xl font-semibold tracking-tight">New Job Card</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Receive an item, auto-detect warranty status, and open the workflow.</p>
      </div>

      <Card className="space-y-4">
        <CardHeader title="1. Customer" />
        <Field label="Select customer">
          <Select value={customerId} onChange={(event) => selectCustomer(event.target.value)}>
            <option value="">Choose a customer...</option>
            {scopedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="2. Appliance" subtitle="Warranty status is detected from purchase date and brand rules" />
        <Field label="Select appliance">
          <Select value={applianceId} onChange={(event) => setApplianceId(event.target.value)} disabled={!customerId}>
            <option value="">{customerId ? "Choose an appliance..." : "Select a customer first"}</option>
            {customerAppliances.map((appliance) => <option key={appliance.id} value={appliance.id}>{appliance.model} - SN {appliance.serialNo}</option>)}
          </Select>
        </Field>
        {selectedAppliance && (
          <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3 text-sm flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-medium">{selectedAppliance.model}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{brand?.name} - Purchased {selectedAppliance.purchaseDate.slice(0, 10)} - Serial {selectedAppliance.serialNo}</p>
            </div>
            <JobTypeBadge jobType={detectedJobType} />
          </div>
        )}
        <Field label="Job type override (optional)">
          <Select value={jobTypeOverride} onChange={(event) => setJobTypeOverride(event.target.value as JobType | "auto")}>
            <option value="auto">Auto-detect ({detectedJobType === "warranty" ? "Warranty" : "Non-Warranty"})</option>
            <option value="warranty">Force Warranty</option>
            <option value="non_warranty">Force Non-Warranty</option>
          </Select>
        </Field>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="3. Issue & Branch" />
        <Field label="Problem description">
          <Textarea rows={3} value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="e.g. Not cooling properly, makes a rattling noise..." />
        </Field>
        <Field label="Receiving branch">
          <Select value={branchId} disabled={Boolean(customerId)} onChange={(event) => setBranchId(event.target.value)}>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </Select>
          {customerId && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Receiving branch follows the customer's registered branch.</p>}
        </Field>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit}>Create Job Card</Button>
      </div>
    </div>
  );
}
