import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";

const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const CirclesPage = lazy(() => import("@/pages/CirclesPage"));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPage"));
const ScreenerPage = lazy(() => import("@/pages/ScreenerPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<AnalyticsPage section="total" />} />
              <Route path="/analytics/total" element={<AnalyticsPage section="total" />} />
              <Route path="/analytics/tables" element={<AnalyticsPage section="tables" />} />
              <Route path="/screener" element={<ScreenerPage />} />
              <Route path="/circles" element={<CirclesPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function PageFallback() {
  return <div className="text-sm text-muted-foreground">Loading...</div>;
}

export default App;
