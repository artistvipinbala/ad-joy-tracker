import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import DailyData from "@/pages/DailyData";
import MonthlyOverview from "@/pages/MonthlyOverview";
import Expenses from "@/pages/Expenses";
import ProfitCalculator from "@/pages/ProfitCalculator";
import AIAdvisor from "@/pages/AIAdvisor";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/daily" element={<DailyData />} />
            <Route path="/monthly" element={<MonthlyOverview />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/profit" element={<ProfitCalculator />} />
            <Route path="/advisor" element={<AIAdvisor />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
