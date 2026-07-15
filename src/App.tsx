import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useStore } from "./lib/store";
import { canAccessPath } from "./lib/permissions";
import { Shell } from "./components/Shell";
import { PageSkeleton } from "./components/ui";
import { LicenseBlocker } from "./components/LicenseBlocker";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const PredictiveMaintenance = lazy(() => import("./pages/PredictiveMaintenance"));
const JobCardList = lazy(() => import("./pages/JobCards/List"));
const NewJobCard = lazy(() => import("./pages/JobCards/New"));
const JobCardDetail = lazy(() => import("./pages/JobCards/Detail"));
const JobCardEstimate = lazy(() => import("./pages/JobCards/Estimate"));
const CustomerList = lazy(() => import("./pages/Customers/List"));
const CustomerDetail = lazy(() => import("./pages/Customers/Detail"));
const ApplianceList = lazy(() => import("./pages/Appliances/List"));
const ApplianceDetail = lazy(() => import("./pages/Appliances/Detail"));
const Brands = lazy(() => import("./pages/Brands"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Technicians = lazy(() => import("./pages/Technicians"));
const Workflow = lazy(() => import("./pages/Workflow"));
const Communications = lazy(() => import("./pages/Communications"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const MobilePreview = lazy(() => import("./pages/Mobile/Preview"));
const TrackingPage = lazy(() => import("./pages/Tracking"));
const Login = lazy(() => import("./pages/Login"));

function ShellRoutes() {
  const role = useStore((state) => state.role);
  const currentUser = useStore((state) => state.currentUser);
  const sessionChecked = useStore((state) => state.sessionChecked);
  const location = useLocation();

  if (!sessionChecked) {
    return <TrackingLoading />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPath(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Shell>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predictive-maintenance" element={<PredictiveMaintenance />} />
          <Route path="/jobcards" element={<JobCardList />} />
          <Route path="/jobcards/new" element={<NewJobCard />} />
          <Route path="/jobcards/:id" element={<JobCardDetail />} />
          <Route path="/jobcards/:id/estimate" element={<JobCardEstimate />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/appliances" element={<ApplianceList />} />
          <Route path="/appliances/:id" element={<ApplianceDetail />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/technicians" element={<Technicians />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/mobile" element={<MobilePreview />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}

function TrackingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-page)]" role="status" aria-label="Loading page">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand-1)]" />
    </div>
  );
}

export default function App() {
  const { theme, lang } = useStore();
  const licenseStatus = useStore((state) => state.licenseStatus);
  const licenseChecked = useStore((state) => state.licenseChecked);

  useEffect(() => {
    void useStore.getState().checkLicense();
    void useStore.getState().bootstrap();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Only nav/dashboard labels are translated (not the full app), so we keep
    // the layout LTR even in Arabic — flipping the whole page to RTL here
    // would mirror the sidebar/header around content that's still English,
    // which reads as broken rather than bilingual.
    document.documentElement.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  if (!licenseChecked) {
    return <TrackingLoading />;
  }

  if (licenseStatus && !licenseStatus.valid) {
    return <LicenseBlocker status={licenseStatus} />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/track/:jobId" element={<Suspense fallback={<TrackingLoading />}><TrackingPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<TrackingLoading />}><Login /></Suspense>} />
        <Route path="/*" element={<ShellRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
