import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, RotateCcw,
  Inbox, Play, Square, Zap, ArrowDownToLine, Mail, MessageSquare, Linkedin
} from "lucide-react";
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

const PLATFORM_ICONS: Record<string, any> = {
  ghl: Mail, smsit: MessageSquare, dripify: Linkedin,
};

export default function SyncEngine() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: queue, isLoading, refetch } = trpc.sync.queue.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
  });
  const { data: stats } = trpc.sync.stats.useQuery();
  const { data: schedulerStatus, refetch: refetchScheduler } = trpc.syncScheduler.status.useQuery(undefined, { refetchInterval: 5000 });

  const retryMut = trpc.sync.retry.useMutation({ onSuccess: () => { refetch(); toast.success("Item queued for retry"); } });
  const retryAllDlq = trpc.sync.retryAllDlq.useMutation({ onSuccess: () => { refetch(); toast.success("All DLQ items queued for retry"); } });
  const startScheduler = trpc.syncScheduler.start.useMutation({
    onSuccess: () => { refetchScheduler(); toast.success("Sync scheduler started"); },
    onError: (err: any) => toast.error(err.message),
  });
  const stopScheduler = trpc.syncScheduler.stop.useMutation({
    onSuccess: () => { refetchScheduler(); toast.success("Sync scheduler stopped"); },
  });
  const forcePull = trpc.syncScheduler.forcePull.useMutation({
    onSuccess: (data: any) => { refetch(); refetchScheduler(); toast.success(`Pulled ${data.events?.length || 0} events`); },
    onError: (err: any) => toast.error(err.message),
  });

  const dlqCount = stats?.byStatus?.find((s: any) => s.status === "dlq")?.count || 0;
  const pendingCount = stats?.byStatus?.find((s: any) => s.status === "pending")?.count || 0;
  const failedCount = stats?.byStatus?.find((s: any) => s.status === "failed")?.count || 0;
  const completedCount = stats?.byStatus?.find((s: any) => s.status === "completed")?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Sync Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Hybrid sync: polling + webhooks + event-driven across all platforms.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {dlqCount > 0 && (
            <Button size="sm" variant="outline" className="gap-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 min-h-[44px] sm:min-h-0" onClick={() => retryAllDlq.mutate()}>
              <RotateCcw className="h-4 w-4" /> Retry All DLQ ({dlqCount})
            </Button>
          )}
        </div>
      </div>

      {/* ─── Sync Scheduler Control Panel ─── */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${schedulerStatus?.isRunning ? "bg-emerald-500/15" : "bg-muted/50"}`}>
                <RefreshCw className={`h-5 w-5 ${schedulerStatus?.isRunning ? "text-emerald-400 animate-spin" : "text-muted-foreground"}`} style={schedulerStatus?.isRunning ? { animationDuration: "3s" } : {}} />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Hybrid Sync Scheduler</p>
                <p className="text-xs text-muted-foreground">
                  {schedulerStatus?.isRunning
                    ? `Running · Interval: ${Math.round((schedulerStatus.intervalMs || 60000) / 60000)}min`
                    : "Stopped"}
                  {schedulerStatus?.lastPollAt ? ` · Last pull: ${formatDistanceToNow(new Date(schedulerStatus.lastPollAt), { addSuffix: true })}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {schedulerStatus?.isRunning ? (
                <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={() => stopScheduler.mutate()}>
                  <Square className="h-3 w-3" /> Stop
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={() => startScheduler.mutate({
                  intervalMs: 60000,
                  platforms: {
                    ghl: { enabled: true, pullContacts: true, pushContacts: true },
                    smsit: { enabled: true, pullContacts: true },
                    dripify: { enabled: true, pullLeads: true },
                  },
                })}>
                  <Play className="h-3 w-3" /> Start Scheduler
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={() => forcePull.mutate()} disabled={forcePull.isPending}>
                <ArrowDownToLine className="h-3 w-3" /> Force Pull All
              </Button>
            </div>
          </div>

          {/* Platform sync status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["ghl", "smsit", "dripify"] as const).map((platform) => {
              const Icon = PLATFORM_ICONS[platform] || RefreshCw;
              const pStatus = schedulerStatus?.platforms?.[platform];
              const isEnabled = pStatus?.enabled !== false;
              const lastSync = pStatus?.lastSyncAt;
              return (
                <div key={platform} className={`p-3 rounded-lg border ${isEnabled ? "border-border/50 bg-card/50" : "border-border/20 bg-muted/10 opacity-50"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${platform === "ghl" ? "text-blue-400" : platform === "smsit" ? "text-emerald-400" : "text-sky-400"}`} />
                    <span className="text-xs font-medium text-foreground">{PLATFORM_LABELS[platform]}</span>
                    <div className={`ml-auto h-1.5 w-1.5 rounded-full ${isEnabled ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {lastSync ? `Last: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}` : "No sync yet"}
                    {pStatus?.lastError ? ` · Error: ${pStatus.lastError}` : ""}
                  </p>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] mt-1 w-full" onClick={() => forcePull.mutate({ platform })} disabled={forcePull.isPending}>
                    Pull Now
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Queue Stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pendingCount, color: "text-muted-foreground" },
          { label: "Completed", value: completedCount, color: "text-emerald-400" },
          { label: "Failed", value: failedCount, color: "text-red-400" },
          { label: "Dead Letter Queue", value: dlqCount, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
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
          <SelectTrigger className="w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ghl">GoHighLevel</SelectItem>
            <SelectItem value="smsit">SMS-iT</SelectItem>
            <SelectItem value="dripify">Dripify</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* ─── Queue Items ─── */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50"><CardContent className="p-4"><div className="h-12 bg-muted/30 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : queue?.length ? (
          queue.map((item: any) => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const StatusIcon = item.status === "completed" ? CheckCircle2 : item.status === "failed" ? XCircle : item.status === "dlq" ? AlertTriangle : Clock;
            return (
              <Card key={item.id} className="bg-card border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <StatusIcon className={`h-4 w-4 shrink-0 ${sc.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{item.action} — {item.contactName || item.contactId}</p>
                      <Badge className={`text-[10px] ${sc.bg} ${sc.color}`}>{item.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[item.platform] || item.platform}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.errorMessage ? `Error: ${item.errorMessage} · ` : ""}
                      Attempts: {item.retryCount || 0}
                      {item.updatedAt ? ` · ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}` : ""}
                    </p>
                  </div>
                  {(item.status === "failed" || item.status === "dlq") && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => retryMut.mutate({ id: item.id })}>
                      <RotateCcw className="h-3 w-3" /> Retry
                    </Button>
                  )}
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
