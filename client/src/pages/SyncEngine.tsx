import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, RotateCcw, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-muted-foreground", bg: "bg-muted" },
  processing: { color: "text-blue-400", bg: "bg-blue-500/15" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/15" },
  failed: { color: "text-red-400", bg: "bg-red-500/15" },
  dlq: { color: "text-amber-400", bg: "bg-amber-500/15" },
};

const PLATFORM_LABELS: Record<string, string> = {
  ghl: "GoHighLevel", dripify: "Dripify", linkedin: "LinkedIn", smsit: "SMS-iT",
};

export default function SyncEngine() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: queue, isLoading, refetch } = trpc.sync.queue.useQuery({ status: statusFilter !== "all" ? statusFilter : undefined, platform: platformFilter !== "all" ? platformFilter : undefined });
  const { data: stats } = trpc.sync.stats.useQuery();
  const retryMut = trpc.sync.retry.useMutation({ onSuccess: () => { refetch(); toast.success("Item queued for retry"); } });
  const retryAllDlq = trpc.sync.retryAllDlq.useMutation({ onSuccess: () => { refetch(); toast.success("All DLQ items queued for retry"); } });

  const dlqCount = stats?.byStatus?.find((s: any) => s.status === "dlq")?.count || 0;
  const pendingCount = stats?.byStatus?.find((s: any) => s.status === "pending")?.count || 0;
  const failedCount = stats?.byStatus?.find((s: any) => s.status === "failed")?.count || 0;
  const completedCount = stats?.byStatus?.find((s: any) => s.status === "completed")?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Sync Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-platform sync queue with DLQ retry logic.</p>
        </div>
        {dlqCount > 0 && (
          <Button size="sm" variant="outline" className="gap-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => retryAllDlq.mutate()}>
            <RotateCcw className="h-4 w-4" /> Retry All DLQ ({dlqCount})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pendingCount, color: "text-muted-foreground" },
          { label: "Completed", value: completedCount, color: "text-emerald-400" },
          { label: "Failed", value: failedCount, color: "text-red-400" },
          { label: "Dead Letter Queue", value: dlqCount, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-semibold tabular-nums mt-1 ${s.color}`}>{s.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Breakdown */}
      {stats?.byPlatform?.length ? (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-foreground">Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {stats.byPlatform.map((p: any) => (
                <div key={p.platform} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                  <span className="text-foreground font-medium tabular-nums">{p.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="dlq">DLQ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ghl">GoHighLevel</SelectItem>
            <SelectItem value="dripify">Dripify</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="smsit">SMS-iT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queue Items */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50"><CardContent className="p-4"><div className="h-12 bg-muted/30 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : queue?.length ? (
          queue.map((item: any) => {
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            return (
              <Card key={item.id} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <Badge className={`text-[10px] ${cfg.bg} ${cfg.color} shrink-0`}>{item.status.toUpperCase()}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-foreground font-medium">{item.direction === "push" ? "→" : "←"} {PLATFORM_LABELS[item.platform] || item.platform}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-xs">{item.entityType} #{item.entityId}</span>
                    </div>
                    {item.lastError && <p className="text-xs text-red-400/80 mt-0.5 truncate">{item.lastError}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums">{item.attempts}/{item.maxAttempts}</span>
                    {(item.status === "failed" || item.status === "dlq") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => retryMut.mutate({ id: item.id })}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Sync queue is empty</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Items will appear here when contacts are synced across platforms.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
