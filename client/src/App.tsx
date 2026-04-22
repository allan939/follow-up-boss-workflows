import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/Sidebar";
import SequencesPage from "@/pages/Sequences";
import ScriptsPage from "@/pages/Scripts";
import DashboardPage from "@/pages/Dashboard";
import AgentsPage from "@/pages/Agents";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main bg-background">
          <Router hook={useHashLocation}>
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/sequences" component={SequencesPage} />
              <Route path="/scripts" component={ScriptsPage} />
              <Route path="/agents" component={AgentsPage} />
              <Route component={NotFound} />
            </Switch>
          </Router>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
