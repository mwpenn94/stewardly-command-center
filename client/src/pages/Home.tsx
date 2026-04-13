import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Megaphone, RefreshCw, Plug, Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const severityColors: Record<string, string> = {
  success: "text-emerald-400",
  info: "text-blue-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

const platformLabels: Record<string, string> = {
  ghl: "GoHighLevel",
  smsit: "SMS-iT",
  dripify: "Dripify",
  linkedin: "LinkedIn",
};

export default function Home() {
  const { user } = useAuth();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: contactStats } = trpc.dashboard.contactStats.useQuery();
  const { data: platformHealth, isLoading: healthLoading } = trpc.orchestrator.platformHealth.useQuery(
    undefined,
    { refetchInterval: 5 * 60 * 1000 } // Refresh every 5 minutes
  );

  // Use DB-stored integration count (fast) for the stat card.
  // The Platform Health section below shows live API test results.
  const connectedCount = stats?.integrations ?? 0;

  const statCards = [
    { label: "Total Contacts", value: stats?.contacts ?? 0, icon: Users, accent: "text-blue-400" },
    { label: "Active Campaigns", value: stats?.campaigns ?? 0, icon: Megaphone, accent: "text-emerald-400" },
    { label: "Sync Queue", value: stats?.syncPending ?? 0, icon: RefreshCw, accent: "text-amber-400" },
    { label: "Connected Platforms", value: connectedCount, icon: Plug, accent: "text-violet-400" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight text-foreground">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          Your marketing command center at a glance.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="card-hover bg-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    {isLoading ? "—" : s.value.toLocaleString()}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center ${s.accent}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Segment Breakdown */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-foreground">Contact Segments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactStats?.bySegment?.length ? (
              contactStats.bySegment.map((s: any) => {
                const pct = contactStats.total > 0 ? ((s.count / contactStats.total) * 100).toFixed(1) : "0";
                return (
                  <div key={s.segment} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary/60" />
                      <span className="text-muted-foreground capitalize">{(s.segment || "other").replace("_", "/")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground tabular-nums font-medium">{s.count.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs w-12 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No contacts yet. Import or create contacts to see segment breakdown.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3 bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity?.length ? (
              <div className="space-y-3">
                {stats.recentActivity.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${severityColors[a.severity] || "text-muted-foreground"}`} style={{ backgroundColor: "currentColor" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{a.description || a.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                      {a.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet. Actions across the platform will appear here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Health */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking platform connections...
            </div>
          ) : platformHealth?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {platformHealth.map((p: any) => (
                <div
                  key={p.platform}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    p.connected
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }`}
                >
                  {p.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {platformLabels[p.platform] || p.platform}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.details || (p.connected ? "Connected" : "Disconnected")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      p.connected ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"
                    }`}
                  >
                    {p.connected ? "Live" : "Down"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No platforms configured. Go to Integrations to connect your platforms.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
