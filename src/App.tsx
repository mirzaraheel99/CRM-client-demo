import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useStore } from "./lib/store";
import { Shell } from "./components/Shell";
import { PageSkeleton } from "./components/ui";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const PredictiveMaintenance = lazy(() => import("./pages/PredictiveMaintenance"));
const JobCardList = lazy(() => import("./pages/JobCards/List"));
const NewJobCard = lazy(() => import("./pages/JobCards/New"));
const JobCardDetail = lazy(() => import("./pages/JobCards/Detail"));
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
const MobilePreview = lazy(() => import("./pages/Mobile/Preview"));
const TrackingPage = lazy(() => import("./pages/Tracking"));

function ShellRoutes() {
  return (
    <Shell>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predictive-maintenance" element={<PredictiveMaintenance />} />
          <Route path="/jobcards" element={<JobCardList />} />
          <Route path="/jobcards/new" element={<NewJobCard />} />
          <Route path="/jobcards/:id" element={<JobCardDetail />} />
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/track/:jobId" element={<Suspense fallback={<TrackingLoading />}><TrackingPage /></Suspense>} />
        <Route path="/*" element={<ShellRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
