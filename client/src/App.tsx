import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Contacts from "./pages/Contacts";
import BulkImport from "./pages/BulkImport";
import Campaigns from "./pages/Campaigns";
import SyncEngine from "./pages/SyncEngine";
import Integrations from "./pages/Integrations";
import Enrichment from "./pages/Enrichment";
import Analytics from "./pages/Analytics";
import Backups from "./pages/Backups";
import ActivityFeed from "./pages/ActivityFeed";
import Settings from "./pages/Settings";

function Router() {
  return (
    <DashboardLayout>
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
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
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
