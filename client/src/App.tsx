import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";

// Lazy-loaded routes for code splitting
const Contacts = lazy(() => import("./pages/Contacts"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const SyncEngine = lazy(() => import("./pages/SyncEngine"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Enrichment = lazy(() => import("./pages/Enrichment"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Backups = lazy(() => import("./pages/Backups"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));
const Settings = lazy(() => import("./pages/Settings"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Channels = lazy(() => import("./pages/Channels"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/import" component={BulkImport} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/sync" component={SyncEngine} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/enrichment" component={Enrichment} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/backups" component={Backups} />
          <Route path="/activity" component={ActivityFeed} />
          <Route path="/settings" component={Settings} />
          <Route path="/ai-insights" component={AIInsights} />
          <Route path="/channels" component={Channels} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
