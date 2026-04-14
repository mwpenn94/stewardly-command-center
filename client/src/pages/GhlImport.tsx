import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Download, Play, Pause, Square, RefreshCw, Loader2, CheckCircle2,
  XCircle, Clock, ArrowDownToLine, AlertTriangle, RotateCcw
} from "lucide-react";
import QueryError from "@/components/QueryError";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  pending: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />,
  paused: <Pause className="h-4 w-4 text-amber-400" />,
  completed: <CheckCircle2 className="h-4 w-4 text-blue-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export default function GhlImport() {
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = trpc.ghlImport.list.useQuery();
  const startMut = trpc.ghlImport.start.useMutation({
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast.success(`Import job #${data.jobId} started`);
      refetchJobs();
    },
    onError: (err) => toast.error(err.message),
  });
  const pauseMut = trpc.ghlImport.pause.useMutation({
    onSuccess: () => { toast.success("Import paused"); },
    onError: (err) => toast.error(err.message),
  });
  const resumeMut = trpc.ghlImport.resume.useMutation({
    onSuccess: () => { toast.success("Import resumed"); refetchJobs(); },
    onError: (err) => toast.error(err.message),
  });
  const stopMut = trpc.ghlImport.stop.useMutation({
    onSuccess: () => { toast.success("Import stopped"); setActiveJobId(null); refetchJobs(); },
    onError: (err) => toast.error(err.message),
  });

  // Poll progress for active job
  const { data: progress } = trpc.ghlImport.progress.useQuery(
    { jobId: activeJobId! },
    {
      enabled: !!activeJobId,
      refetchInterval: activeJobId ? 3000 : false,
    }
  );

  // Auto-detect active job from list
  const runningJob = jobs?.find((j: any) => j.status === "running" || j.status === "paused");
  useEffect(() => {
    if (runningJob && !activeJobId) {
      setActiveJobId(runningJob.id);
    }
  }, [runningJob, activeJobId]);

  const liveProgress = progress || (activeJobId && runningJob ? {
    jobId: runningJob.id,
    status: runningJob.status,
    totalContacts: runningJob.totalContacts || 0,
    importedCount: runningJob.importedCount || 0,
    updatedCount: runningJob.updatedCount || 0,
    skippedCount: runningJob.skippedCount || 0,
    failedCount: runningJob.failedCount || 0,
    rate: 0,
    eta: 0,
    errors: [],
  } : null);

  const processed = liveProgress
    ? (liveProgress.importedCount || 0) + (liveProgress.updatedCount || 0) + (liveProgress.skippedCount || 0) + (liveProgress.failedCount || 0)
    : 0;
  const pct = liveProgress?.totalContacts ? Math.round((processed / liveProgress.totalContacts) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">GHL Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pull contacts from GoHighLevel into the local database
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetchJobs()}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => startMut.mutate({})}
            disabled={startMut.isPending || (liveProgress?.status === "running")}
          >
            {startMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Start New Import
          </Button>
        </div>
      </div>

      {/* Active Import Progress */}
      {liveProgress && (liveProgress.status === "running" || liveProgress.status === "paused") && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {STATUS_ICONS[liveProgress.status]}
                Import Job #{liveProgress.jobId}
                <Badge className={STATUS_COLORS[liveProgress.status]}>{liveProgress.status}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                {liveProgress.status === "running" ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => pauseMut.mutate({ jobId: liveProgress.jobId })}>
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </Button>
                ) : liveProgress.status === "paused" ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => resumeMut.mutate({ jobId: liveProgress.jobId })}>
                    <Play className="h-3.5 w-3.5" /> Resume
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => stopMut.mutate({ jobId: liveProgress.jobId })}>
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {processed.toLocaleString()} / {(liveProgress.totalContacts || 0).toLocaleString()} contacts
                </span>
                <span className="text-foreground font-medium">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">New</p>
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">{(liveProgress.importedCount || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Updated</p>
                <p className="text-lg font-semibold text-blue-400 tabular-nums">{(liveProgress.updatedCount || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Skipped</p>
                <p className="text-lg font-semibold text-muted-foreground tabular-nums">{(liveProgress.skippedCount || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Failed</p>
                <p className="text-lg font-semibold text-red-400 tabular-nums">{(liveProgress.failedCount || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Speed</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">
                  {liveProgress.rate ? `${liveProgress.rate}/min` : "—"}
                </p>
                {liveProgress.eta ? (
                  <p className="text-[10px] text-muted-foreground">~{liveProgress.eta} min left</p>
                ) : null}
              </div>
            </div>
            {/* Errors */}
            {liveProgress.errors && liveProgress.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Recent Errors ({liveProgress.errors.length})
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                  {liveProgress.errors.slice(-5).map((err: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-red-500/5 border border-red-500/10">
                      <span className="text-red-400 font-mono shrink-0">{err.ghlId?.slice(0, 8)}</span>
                      <span className="text-muted-foreground truncate">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsError ? (
            <QueryError message="Failed to load import jobs." onRetry={() => refetchJobs()} />
          ) : jobsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center py-12">
              <Download className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No import jobs yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Click "Start New Import" to pull contacts from GoHighLevel
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: any) => {
                const jobProcessed = (job.importedCount || 0) + (job.updatedCount || 0) + (job.skippedCount || 0) + (job.failedCount || 0);
                const jobPct = job.totalContacts ? Math.round((jobProcessed / job.totalContacts) * 100) : 0;
                return (
                  <div key={job.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/30 hover:bg-muted/5 transition-colors">
                    {STATUS_ICONS[job.status] || STATUS_ICONS.pending}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Job #{job.id}</span>
                        <Badge className={`text-[9px] ${STATUS_COLORS[job.status] || STATUS_COLORS.pending}`}>{job.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {jobProcessed.toLocaleString()} / {(job.totalContacts || 0).toLocaleString()} contacts
                        {job.importedCount ? ` · ${job.importedCount.toLocaleString()} new` : ""}
                        {job.updatedCount ? ` · ${job.updatedCount.toLocaleString()} updated` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {job.totalContacts > 0 && (
                        <p className="text-sm font-medium text-foreground tabular-nums">{jobPct}%</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : "—"}
                      </p>
                    </div>
                    {(job.status === "failed" || job.status === "paused") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          startMut.mutate({ resumeJobId: job.id });
                          setActiveJobId(job.id);
                        }}
                        title="Resume import"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
