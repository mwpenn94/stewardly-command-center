import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Activity, RefreshCw, Bell } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const SEVERITY_CONFIG: Record<string, { dot: string; text: string }> = {
  info: { dot: "bg-blue-400", text: "text-blue-400" },
  success: { dot: "bg-emerald-400", text: "text-emerald-400" },
  warning: { dot: "bg-amber-400", text: "text-amber-400" },
  error: { dot: "bg-red-400", text: "text-red-400" },
};

const TYPE_LABELS: Record<string, string> = {
  sync: "Sync", import: "Import", campaign: "Campaign", webhook: "Webhook", enrichment: "Enrichment", backup: "Backup", system: "System",
};

export default function ActivityFeed() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data, isLoading, refetch } = trpc.activity.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: 50,
  });
  const activities = data?.entries?.filter((a) => severityFilter === "all" || a.severity === severityFilter) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Activity Feed</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time log of events across all connected platforms.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sync">Sync</SelectItem>
            <SelectItem value="import">Import</SelectItem>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="enrichment">Enrichment</SelectItem>
            <SelectItem value="backup">Backup</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border/30" />

        <div className="space-y-1">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pl-10 py-3">
                <div className="h-10 bg-muted/20 rounded animate-pulse" />
              </div>
            ))
          ) : activities.length ? (
            activities.map((a) => {
              const sev = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
              const meta = a.metadata as Record<string, unknown> | null;
              const platform = meta && typeof meta === "object" && typeof meta.platform === "string" ? meta.platform : null;
              return (
                <div key={a.id} className="relative flex items-start gap-4 pl-10 py-2.5 hover:bg-muted/5 rounded-lg transition-colors group">
                  {/* Timeline dot */}
                  <div className={`absolute left-[11px] top-[18px] h-2 w-2 rounded-full ${sev.dot} ring-2 ring-background`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-foreground">{a.description || a.action}</p>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{TYPE_LABELS[a.type] || a.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {a.createdAt ? format(new Date(a.createdAt), "MMM d, h:mm a") : "—"}
                      </span>
                      {platform && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[11px] text-muted-foreground capitalize">{platform}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pl-10 py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here as you use the platform.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
