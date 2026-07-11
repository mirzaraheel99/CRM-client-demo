import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useStore } from "./lib/store";
import { Shell } from "./components/Shell";
import Dashboard from "./pages/Dashboard";
import PredictiveMaintenance from "./pages/PredictiveMaintenance";
import JobCardList from "./pages/JobCards/List";
import NewJobCard from "./pages/JobCards/New";
import JobCardDetail from "./pages/JobCards/Detail";
import CustomerList from "./pages/Customers/List";
import CustomerDetail from "./pages/Customers/Detail";
import ApplianceList from "./pages/Appliances/List";
import ApplianceDetail from "./pages/Appliances/Detail";
import Brands from "./pages/Brands";
import Inventory from "./pages/Inventory";
import Technicians from "./pages/Technicians";
import Workflow from "./pages/Workflow";
import Communications from "./pages/Communications";
import Reports from "./pages/Reports";
import MobilePreview from "./pages/Mobile/Preview";
import TrackingPage from "./pages/Tracking";

function ShellRoutes() {
  return (
    <Shell>
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
    </Shell>
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
        <Route path="/track/:jobId" element={<TrackingPage />} />
        <Route path="/*" element={<ShellRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
