# FixFlow - Appliance Service Suite

A client-ready, interactive appliance service CRM demo for Saudi service-center operations.

**Live demo:** https://mirzaraheel99.github.io/CRM-client-demo/

## Feature coverage

### Core CRM

- Dashboard KPIs, job-status funnel, warranty split, turnaround trend, technician workload, and inventory alerts
- Customer profiles, contact details, appliance ownership, and WhatsApp verification state
- Appliance registry with brand, model, serial/IMEI, warranty calculation, and service history
- Job-card workflow from receipt through diagnosis, approval, repair, QA, handover, and delivery
- Technician assignment, workload, skills, zones, and performance reporting
- Inventory, purchase vendors, stock movements, reorder thresholds, van stock, and branch stock
- CSV-exportable TAT, technician, inventory, warranty, revenue, and payment reports
- Riyadh, Jeddah, and Dammam branch views
- Admin, manager, supervisor, technician, and front-desk role views
- English/Arabic direction switching, dark mode, SAR currency, Saudi cities, and +966 sample data

### Service workflow enhancements

- Visual spare-parts product grid with stock-aware quantity controls
- Message sent, delivered, read, and failed status history on each job
- Fixed and customizable WhatsApp-style templates with token substitution
- Stage-level photo attachments
- Separate printable estimate and tax-invoice views
- Simulated WhatsApp OTP verification
- Inventory quantities split by branch

### Competitive demo features

- Illustrative Saudi tax invoice with TLV QR data
- Local pattern-matching diagnosis assistant with likely causes, parts, and confidence scores
- Public customer tracking route with QR code, timeline, messages, estimate approval, and payment
- Predictive-maintenance candidates generated from service-history cohorts
- Simulated mada, Apple Pay, STC Pay, Tabby, and Tamara payment flows
- Simulated connected-appliance telemetry for supported Samsung, LG, and Apple sample units
- Consumption-velocity smart reorder suggestions based on weeks of cover

## Demo architecture

| Layer | Technology |
|---|---|
| Framework | Vite, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| State | Zustand persisted to browser localStorage |
| Charts | Recharts |
| Icons | Lucide React |
| QR codes | qrcode |
| Hosting | GitHub Pages through GitHub Actions |

The demo is intentionally client-side. Its deterministic sample dataset is generated in the browser and persisted only for that visitor.

## Important limitations

- There is no production backend, database, authentication provider, or multi-user concurrency.
- WhatsApp, OTP, payments, IoT telemetry, and tax-invoice submission are simulated. No external API calls are made.
- The tax invoice and QR code are illustrative and are not a substitute for ZATCA Phase 2 onboarding, CSID issuance, cryptographic signing, clearance/reporting, or compliance review.
- Stage photos are demo records rather than durable object-storage uploads.
- Resetting browser storage restores the deterministic seed dataset.

## Run locally

```bash
npm install
npm run dev
```

## Validate a production build

```bash
npm run lint
npm run build
npm run preview
```

The build creates both `dist/index.html` and `dist/404.html`, allowing direct client-side routes such as `/track/:jobId` to resolve on GitHub Pages.

## Deployment

`.github/workflows/deploy.yml` installs dependencies, builds `dist/`, and publishes it through GitHub Pages on every push to the configured deployment branches. In repository settings, the Pages source must remain set to **GitHub Actions**.

## Production direction

For a real service center, add PostgreSQL, secure authentication and RBAC, audit logging, object storage, official Meta WhatsApp integration, a Saudi payment gateway, compliant ZATCA Phase 2 integration, queues for background jobs, and deployment in an approved regional environment. The existing React UI can remain the frontend while these production services replace the simulated browser state.
