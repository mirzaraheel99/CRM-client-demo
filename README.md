# FixFlow — Appliance Service Suite (Client Demo)

An interactive, fully-clickable demo of the CRM Service Module described in the
functional & technical spec: appliance service and repair job cards, warranty
vs. non-warranty workflows, inventory & spare parts, technician allocation,
WhatsApp/SMS/email triggers, and operational dashboards.

This is a **front-end sales demo**: all data is generated locally and stored in
the browser (`localStorage`), so every action — creating a job card, advancing
a workflow stage, adjusting stock — persists for that visitor without needing a
real backend, database, or third-party integrations. It's built to let a client
click through the actual screens rather than look at static mockups.

## What's implemented

- **Dashboard** — job status funnel, warranty vs. non-warranty split, technician
  workload, turnaround-time trend, inventory alerts, latest job cards.
- **Job Cards** — list with filters, a creation wizard with warranty
  auto-detection, and a detail view with timeline, parts, attachments,
  communication log, technician reassignment, and stage/approval actions.
- **Customers, Appliances, Brand Master** — masters with profile/history views.
- **Inventory & Spare Parts** — item master, stock ledger, receive/issue/return/
  transfer flows, and per-location (store/van) stock.
- **Technicians** — roster with skills/zones and a weekly allocation calendar.
- **Workflow Designer** — the warranty and non-warranty stage flows from the
  spec, visualized as an editable pipeline (mandatory fields, approvals,
  communication triggers).
- **Communication Logs** — WhatsApp/SMS/email trigger history.
- **Reports** — TAT by brand, technician performance, inventory consumption,
  warranty claims, revenue, all exportable as CSV.
- **Mobile Apps preview** — phone-frame mockups of the front-desk and
  technician mobile experience (the production apps ship separately, per the
  Flutter recommendation in the spec).
- **Global chrome** — branch selector, role switcher (Front Desk / Technician /
  Supervisor / Manager / Admin) that gates approval actions to demonstrate
  RBAC, light/dark theme, and an English/Arabic (RTL) language toggle.

## Not implemented (by design, for a sales demo)

- Real WhatsApp/SMS/email delivery — messages are logged, not sent.
- A native mobile app — the Mobile Apps page is a UI preview only.
- A real backend/database/auth — data lives in the browser only; use "Reset
  demo data" (clear site data) to start fresh.

## Running locally

```bash
npm install
npm run dev
```

## Building

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Deployment

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on
every push to `main` or `claude/client-demo-web-app-3antv1`. In the repository
settings, under **Settings → Pages**, set the source to **GitHub Actions**
(one-time) to activate the live URL.
