import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, RotateCcw,
  Inbox, Play, Square, ArrowDownToLine, ArrowUpFromLine, Mail, MessageSquare, Linkedin, Loader2,
  Activity, Upload, Download, Zap, Settings2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import QueryError from "@/components/QueryError";

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

const EVENT_TYPE_ICON: Record<string, { icon: any; color: string }> = {
  pull: { icon: Download, color: "text-blue-400" },
  push: { icon: Upload, color: "text-emerald-400" },
  webhook: { icon: Zap, color: "text-purple-400" },
  error: { icon: AlertTriangle, color: "text-red-400" },
};

export default function SyncEngine() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showEvents, setShowEvents] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Sync settings state (persisted in localStorage)
  const [syncInterval, setSyncInterval] = useState(() =>
    localStorage.getItem("sync-interval") || "60000"
  );
  const [ghlPull, setGhlPull] = useState(() =>
    localStorage.getItem("sync-ghl-pull") !== "false"
  );
  const [ghlPush, setGhlPush] = useState(() =>
    localStorage.getItem("sync-ghl-push") !== "false"
  );
  const [smsitEnabled, setSmsitEnabled] = useState(() =>
    localStorage.getItem("sync-smsit-enabled") !== "false"
  );
  const [dripifyEnabled, setDripifyEnabled] = useState(() =>
    localStorage.getItem("sync-dripify-enabled") !== "false"
  );
  const [autoStart, setAutoStart] = useState(() =>
    localStorage.getItem("sync-auto-start") === "true"
  );

  const saveSyncPref = (key: string, value: string) => {
    localStorage.setItem(key, value);
  };

  const applySettings = () => {
    const config = {
      intervalMs: parseInt(syncInterval),
      platforms: {
        ghl: { enabled: ghlPull || ghlPush, pullContacts: ghlPull, pushContacts: ghlPush },
        smsit: { enabled: smsitEnabled, pullContacts: smsitEnabled },
        dripify: { enabled: dripifyEnabled, pullLeads: dripifyEnabled },
      },
    };
    if (schedulerStatus?.isRunning) {
      stopScheduler.mutate(undefined, {
        onSuccess: () => {
          startScheduler.mutate(config);
        },
      });
    } else {
      startScheduler.mutate(config);
    }
  };

  const { data: queue, isLoading, isError, refetch } = trpc.sync.queue.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
  });
  const { data: stats } = trpc.sync.stats.useQuery();
  const { data: schedulerStatus, refetch: refetchScheduler } = trpc.syncScheduler.status.useQuery(undefined, { refetchInterval: 5000 });
  const { data: pendingData } = trpc.contacts.pendingCount.useQuery(undefined, { refetchInterval: 10000 });

  const retryMut = trpc.sync.retry.useMutation({ onSuccess: () => { refetch(); toast.success("Item queued for retry"); }, onError: (err: any) => toast.error(err.message) });
  const retryAllDlq = trpc.sync.retryAllDlq.useMutation({ onSuccess: () => { refetch(); toast.success("All DLQ items queued for retry"); }, onError: (err: any) => toast.error(err.message) });
  const startScheduler = trpc.syncScheduler.start.useMutation({
    onSuccess: () => { refetchScheduler(); toast.success("Sync scheduler started"); },
    onError: (err: any) => toast.error(err.message),
  });
  const stopScheduler = trpc.syncScheduler.stop.useMutation({
    onSuccess: () => { refetchScheduler(); toast.success("Sync scheduler stopped"); },
    onError: (err: any) => toast.error(err.message),
  });
  const forcePull = trpc.syncScheduler.forcePull.useMutation({
    onSuccess: (data: any) => { refetch(); refetchScheduler(); toast.success(`Pulled ${data.events?.length || 0} events`); },
    onError: (err: any) => toast.error(err.message),
  });
  const forcePush = trpc.syncScheduler.forcePush.useMutation({
    onSuccess: (data: any) => { refetchScheduler(); toast.success(`Push complete: ${data.events?.length || 0} events`); },
    onError: (err: any) => toast.error(err.message),
  });
  const pushDirtyBatch = trpc.contacts.pushDirtyBatch.useMutation({
    onSuccess: (data: any) => { refetchScheduler(); toast.success(`Pushed ${data.pushed} contacts (${data.failed} failed)`); },
    onError: (err: any) => toast.error(err.message),
  });

  const dlqCount = stats?.byStatus?.find((s: any) => s.status === "dlq")?.count || 0;
  const queuePendingCount = stats?.byStatus?.find((s: any) => s.status === "pending")?.count || 0;
  const failedCount = stats?.byStatus?.find((s: any) => s.status === "failed")?.count || 0;
  const completedCount = stats?.byStatus?.find((s: any) => s.status === "completed")?.count || 0;
  const dirtyCount = pendingData?.count || schedulerStatus?.pendingPushCount || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Sync Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Bidirectional sync: push local changes &amp; pull platform updates across all integrations.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {dlqCount > 0 && (
            <Button size="sm" variant="outline" className="gap-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 min-h-[44px] sm:min-h-0" disabled={retryAllDlq.isPending} onClick={() => retryAllDlq.mutate()}>
              {retryAllDlq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Retry All DLQ ({dlqCount})
            </Button>
          )}
        </div>
      </div>

      {/* ─── Bidirectional Sync Dashboard ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scheduler Control */}
        <Card className="bg-card border-border/50 lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${schedulerStatus?.isRunning ? "bg-emerald-500/15" : "bg-muted/50"}`}>
                  <RefreshCw className={`h-5 w-5 ${schedulerStatus?.isRunning ? "text-emerald-400 animate-spin" : "text-muted-foreground"}`} style={schedulerStatus?.isRunning ? { animationDuration: "3s" } : {}} />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Bidirectional Sync Scheduler</p>
                  <p className="text-xs text-muted-foreground">
                    {schedulerStatus?.isRunning
                      ? `Running · Interval: ${Math.round((schedulerStatus.intervalMs || 60000) / 60000)}min`
                      : "Stopped"}
                    {schedulerStatus?.lastPollAt ? ` · Last poll: ${formatDistanceToNow(new Date(schedulerStatus.lastPollAt), { addSuffix: true })}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {schedulerStatus?.isRunning ? (
                  <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={() => stopScheduler.mutate()}>
                    <Square className="h-3 w-3" /> Stop
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={applySettings}>
                    <Play className="h-3 w-3" /> Start Scheduler
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={() => forcePull.mutate()} disabled={forcePull.isPending}>
                  {forcePull.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownToLine className="h-3 w-3" />} Pull All
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 min-h-[44px] sm:min-h-0 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => forcePush.mutate()} disabled={forcePush.isPending}>
                  {forcePush.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />} Push All
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
                      {pStatus?.syncCount ? ` · ${pStatus.syncCount} cycles` : ""}
                      {pStatus?.lastError ? ` · Error: ${pStatus.lastError}` : ""}
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1 gap-1" onClick={() => forcePull.mutate({ platform })} disabled={forcePull.isPending}>
                        <ArrowDownToLine className="h-2.5 w-2.5" /> Pull
                      </Button>
                      {platform === "ghl" && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1 gap-1 text-emerald-400" onClick={() => forcePush.mutate()} disabled={forcePush.isPending}>
                          <ArrowUpFromLine className="h-2.5 w-2.5" /> Push
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings Card */}
        <Card className="bg-card border-border/50 lg:col-span-3">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Sync Configuration</p>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowSettings(!showSettings)}>
                {showSettings ? "Hide" : "Configure"}
              </Button>
            </div>
            {showSettings && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sync Interval */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Sync Interval</Label>
                    <Select value={syncInterval} onValueChange={(v) => { setSyncInterval(v); saveSyncPref("sync-interval", v); }}>
                      <SelectTrigger className="bg-muted/30 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30000">30 seconds</SelectItem>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                        <SelectItem value="600000">10 minutes</SelectItem>
                        <SelectItem value="900000">15 minutes</SelectItem>
                        <SelectItem value="1800000">30 minutes</SelectItem>
                        <SelectItem value="3600000">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* GHL Direction */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">GoHighLevel</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">Pull from GHL</span>
                        <Switch checked={ghlPull} onCheckedChange={(v) => { setGhlPull(v); saveSyncPref("sync-ghl-pull", String(v)); }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">Push to GHL</span>
                        <Switch checked={ghlPush} onCheckedChange={(v) => { setGhlPush(v); saveSyncPref("sync-ghl-push", String(v)); }} />
                      </div>
                    </div>
                  </div>

                  {/* SMS-iT */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">SMS-iT</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">Pull contacts</span>
                      <Switch checked={smsitEnabled} onCheckedChange={(v) => { setSmsitEnabled(v); saveSyncPref("sync-smsit-enabled", String(v)); }} />
                    </div>
                  </div>

                  {/* Dripify */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Dripify</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">Pull leads</span>
                      <Switch checked={dripifyEnabled} onCheckedChange={(v) => { setDripifyEnabled(v); saveSyncPref("sync-dripify-enabled", String(v)); }} />
                    </div>
                  </div>
                </div>

                <Separator className="border-border/30" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={autoStart} onCheckedChange={(v) => { setAutoStart(v); saveSyncPref("sync-auto-start", String(v)); }} />
                      <span className="text-xs text-foreground">Auto-start on page load</span>
                    </div>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={applySettings}>
                    {schedulerStatus?.isRunning ? "Restart with Settings" : "Start with Settings"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Push Card */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Upload className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Pending Push</p>
                <p className="text-[10px] text-muted-foreground">Local changes awaiting sync</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className={`text-4xl font-bold ${dirtyCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>{dirtyCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{dirtyCount > 0 ? "contacts need push" : "all synced"}</p>
            </div>
            {dirtyCount > 0 && (
              <Button size="sm" className="mt-3 gap-1.5 w-full" onClick={() => pushDirtyBatch.mutate({ limit: 100 })} disabled={pushDirtyBatch.isPending}>
                {pushDirtyBatch.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />}
                Push {Math.min(dirtyCount, 100)} to GHL
              </Button>
            )}
            {/* Sync totals */}
            <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold text-blue-400">{schedulerStatus?.totalPulled || 0}</p>
                <p className="text-[10px] text-muted-foreground">Total Pulled</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-400">{schedulerStatus?.totalPushed || 0}</p>
                <p className="text-[10px] text-muted-foreground">Total Pushed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Sync Events Timeline ─── */}
      {schedulerStatus?.recentEvents && schedulerStatus.recentEvents.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Recent Sync Events</p>
                <Badge variant="outline" className="text-[10px]">{schedulerStatus.recentEvents.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowEvents(!showEvents)}>
                {showEvents ? "Hide" : "Show"}
              </Button>
            </div>
            {showEvents && (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {schedulerStatus.recentEvents.slice(0, 20).map((event: any, idx: number) => {
                  const evConfig = EVENT_TYPE_ICON[event.type] || EVENT_TYPE_ICON.pull;
                  const EvIcon = evConfig.icon;
                  return (
                    <div key={idx} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-muted/20 transition-colors">
                      <EvIcon className={`h-3 w-3 mt-0.5 shrink-0 ${evConfig.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground truncate">{event.message}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] h-4">{PLATFORM_LABELS[event.platform] || event.platform}</Badge>
                          <Badge className={`text-[9px] h-4 ${event.type === "push" ? "bg-emerald-500/15 text-emerald-400" : event.type === "error" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>{event.type}</Badge>
                          {event.count !== undefined && <span className="text-[9px] text-muted-foreground">{event.count} items</span>}
                          <span className="text-[9px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Queue Stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Queue Pending", value: queuePendingCount, color: "text-muted-foreground" },
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
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
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
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
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
        {isError ? (
          <QueryError message="Failed to load sync queue. Check your connection." onRetry={() => refetch()} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50"><CardContent className="p-4"><div className="h-12 bg-muted/30 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : queue?.length ? (
          queue.map((item: any) => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const StatusIcon = item.status === "completed" ? CheckCircle2 : item.status === "failed" ? XCircle : item.status === "dlq" ? AlertTriangle : Clock;
            return (
              <Card key={item.id} className="bg-card border-border/50">
                <CardContent className="p-3 flex items-start sm:items-center gap-3">
                  <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 sm:mt-0 ${sc.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate max-w-full">{item.action} — {item.contactName || item.contactId}</p>
                      <Badge className={`text-[10px] shrink-0 ${sc.bg} ${sc.color}`}>{item.status}</Badge>
                      <Badge variant="outline" className="text-[10px] shrink-0">{PLATFORM_LABELS[item.platform] || item.platform}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.errorMessage ? `Error: ${item.errorMessage} · ` : ""}
                      Attempts: {item.retryCount || 0}
                      {item.updatedAt ? ` · ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}` : ""}
                    </p>
                  </div>
                  {(item.status === "failed" || item.status === "dlq") && (
                    <Button variant="ghost" size="sm" className="h-9 min-h-[44px] text-xs gap-1" disabled={retryMut.isPending} onClick={() => retryMut.mutate({ id: item.id })}>
                      <RotateCcw className="h-3.5 w-3.5" /> Retry
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 sm:p-12 text-center">
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
