import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../../lib/store";
import { Card, CardHeader, Field, Select, Textarea, Button } from "../../components/ui";
import { JobTypeBadge } from "../../components/StatusBadge";
import type { JobType } from "../../lib/types";

export default function NewJobCard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customers, appliances, brands, branches, createJobCard } = useStore();
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [applianceId, setApplianceId] = useState(searchParams.get("applianceId") ?? "");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [problem, setProblem] = useState("");
  const [jobTypeOverride, setJobTypeOverride] = useState<JobType | "auto">("auto");

  const customerAppliances = useMemo(() => appliances.filter((a) => a.customerId === customerId), [appliances, customerId]);
  const selectedAppliance = appliances.find((a) => a.id === applianceId);
  const brand = brands.find((b) => b.id === selectedAppliance?.brandId);

  const detectedJobType: JobType = selectedAppliance?.warrantyStatus === "In Warranty" ? "warranty" : "non_warranty";
  const finalJobType = jobTypeOverride === "auto" ? detectedJobType : jobTypeOverride;

  const canSubmit = customerId && applianceId && problem.trim().length > 3;

  function submit() {
    if (!canSubmit) return;
    const job = createJobCard({ customerId, applianceId, jobType: finalJobType, problemDescription: problem, branchId });
    navigate(`/jobcards/${job.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold">New Job Card</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">Receive an item, auto-detect warranty status, and open the workflow.</p>
      </div>

      <Card className="space-y-4">
        <CardHeader title="1. Customer" />
        <Field label="Select customer">
          <Select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setApplianceId(""); }}>
            <option value="">Choose a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="2. Appliance" subtitle="Warranty status is detected from purchase date and brand rules" />
        <Field label="Select appliance">
          <Select value={applianceId} onChange={(e) => setApplianceId(e.target.value)} disabled={!customerId}>
            <option value="">{customerId ? "Choose an appliance…" : "Select a customer first"}</option>
            {customerAppliances.map((a) => <option key={a.id} value={a.id}>{a.model} · SN {a.serialNo}</option>)}
          </Select>
        </Field>
        {selectedAppliance && (
          <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3 text-sm flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-medium">{selectedAppliance.model}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{brand?.name} · Purchased {selectedAppliance.purchaseDate.slice(0, 10)} · Serial {selectedAppliance.serialNo}</p>
            </div>
            <JobTypeBadge jobType={detectedJobType} />
          </div>
        )}
        <Field label="Job type override (optional)">
          <Select value={jobTypeOverride} onChange={(e) => setJobTypeOverride(e.target.value as JobType | "auto")}>
            <option value="auto">Auto-detect ({detectedJobType === "warranty" ? "Warranty" : "Non-Warranty"})</option>
            <option value="warranty">Force Warranty</option>
            <option value="non_warranty">Force Non-Warranty</option>
          </Select>
        </Field>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="3. Issue & Branch" />
        <Field label="Problem description">
          <Textarea rows={3} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. Not cooling properly, makes a rattling noise…" />
        </Field>
        <Field label="Receiving branch">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Image upload, customer signature capture, and purchase-bill attachment happen on the mobile front-desk app at the receive step — see the Mobile Apps preview.
        </p>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit}>Create Job Card</Button>
      </div>
    </div>
  );
}
