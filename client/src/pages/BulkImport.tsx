import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, FileText, Play, Pause, CheckCircle2, XCircle, Clock,
  RotateCcw, StopCircle, Zap, Key, AlertTriangle, Loader2,
  ArrowUpCircle, Table2, Timer, ChevronLeft, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  running: { icon: Play, color: "text-blue-400", label: "Running" },
  paused: { icon: Pause, color: "text-amber-400", label: "Paused" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV parser (handles quoted fields)
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

export default function BulkImport() {
  const IMPORTS_PER_PAGE = 10;
  const [importPage, setImportPage] = useState(0);
  const importQueryInput = useMemo(() => ({ limit: IMPORTS_PER_PAGE, offset: importPage * IMPORTS_PER_PAGE }), [importPage]);
  const { data: paginatedImports, isLoading, refetch } = trpc.imports.listPaginated.useQuery(importQueryInput);
  const imports = paginatedImports?.imports;
  const totalImports = paginatedImports?.total ?? 0;
  const totalImportPages = Math.max(1, Math.ceil(totalImports / IMPORTS_PER_PAGE));
  const { data: syncProgress, refetch: refetchProgress } = trpc.imports.syncProgress.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const createMut = trpc.imports.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Import job created"); },
    onError: (err) => toast.error(err.message),
  });
  const startSyncMut = trpc.imports.startSync.useMutation({
    onSuccess: () => { toast.success("Sync started — monitoring progress..."); },
    onError: (err) => { toast.error(err.message); },
  });
  const pauseSyncMut = trpc.imports.pauseSync.useMutation({
    onSuccess: () => { refetchProgress(); toast.info("Sync paused"); },
  });
  const resumeSyncMut = trpc.imports.resumeSync.useMutation({
    onSuccess: () => { refetchProgress(); toast.success("Sync resumed"); },
    onError: (err) => { toast.error(err.message); },
  });
  const cancelSyncMut = trpc.imports.cancelSync.useMutation({
    onSuccess: () => { refetchProgress(); refetch(); toast.info("Sync cancelled"); },
  });
  const updateTokenMut = trpc.imports.updateToken.useMutation({
    onSuccess: (data) => {
      toast.success(`Token updated — ${data.remainingMinutes.toFixed(0)} minutes remaining`);
      refetchProgress();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[]; fileName: string } | null>(null);
  const [workerCount, setWorkerCount] = useState(4);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [jwtInput, setJwtInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Auto-refresh imports list when sync is running
  useEffect(() => {
    if (syncProgress?.status === "running") {
      const interval = setInterval(() => refetch(), 10000);
      return () => clearInterval(interval);
    }
  }, [syncProgress?.status, refetch]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) {
        toast.error("CSV file is empty or has no data rows");
        return;
      }
      setParsedData({ headers, rows, fileName: file.name });
      setShowPreview(true);
      toast.success(`Parsed ${rows.length.toLocaleString()} rows from ${file.name}`);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const handleStartImport = async () => {
    if (!parsedData) return;

    try {
      // Create the import record
      const result = await createMut.mutateAsync({
        fileName: parsedData.fileName,
        totalRows: parsedData.rows.length,
      });

      if (!result.id) {
        toast.error("Failed to create import record");
        return;
      }

      // Start the sync worker
      await startSyncMut.mutateAsync({
        importId: result.id,
        rows: parsedData.rows,
        workerCount,
      });

      setParsedData(null);
      setShowPreview(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start import");
    }
  };

  const handleTokenUpdate = () => {
    if (!jwtInput.trim()) {
      toast.error("Please paste a JWT token");
      return;
    }
    updateTokenMut.mutate({ jwt: jwtInput.trim() });
    setJwtInput("");
    setShowTokenDialog(false);
  };

  const isRunning = syncProgress?.status === "running";
  const isPaused = syncProgress?.status === "paused" || syncProgress?.status === "token_expired";
  const isTokenExpired = syncProgress?.status === "token_expired";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload CSV files and sync contacts to GoHighLevel in real-time.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button onClick={() => fileInputRef.current?.click()} size="sm" className="gap-2" disabled={isRunning}>
            <Upload className="h-4 w-4" /> Upload CSV
          </Button>
        </div>
      </div>

      {/* Quick Import — Pre-processed Data Sources */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Import — Pre-Processed Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            One-click import from pre-extracted and deduplicated data sources. These files are ready-to-sync with complete column mapping.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Google Drive — All Contacts with POC",
                records: 2313,
                description: "CPAs, Attorneys, Nonprofits, HR, Ag, Events — with point-of-contact data",
                tags: "Strategic-Partner-COI, CPA-Tax, Estate-Attorney, Nonprofit, HR-Benefits, Agricultural",
              },
              {
                label: "Google Drive — Syncable Only",
                records: 2025,
                description: "Contacts with email or phone — ready for platform sync",
                tags: "Has email or phone, GHL-ready",
              },
              {
                label: "Google Drive — Organizations",
                records: 288,
                description: "Organization/event records without individual contact info",
                tags: "COI-Event, Organizations, No direct contact",
              },
            ].map((source) => (
              <div key={source.label} className="p-3 rounded-lg border border-border/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">{source.label}</p>
                  <Badge variant="outline" className="text-[10px]">{source.records.toLocaleString()} records</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{source.description}</p>
                <p className="text-[10px] text-muted-foreground/60">{source.tags}</p>
                <Button variant="outline" size="sm" className="w-full h-7 min-h-[44px] text-[10px] gap-1" disabled>
                  <ArrowUpCircle className="h-3 w-3" /> Import (CDN source configured)
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Sync Progress */}
      {syncProgress && syncProgress.status !== "idle" && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Live Sync Worker
              </CardTitle>
              <div className="flex items-center gap-2">
                {isTokenExpired && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" /> Token Expired
                  </Badge>
                )}
                <Badge variant="outline" className={`text-[10px] ${
                  isRunning ? "text-blue-400 border-blue-400/30" :
                  isPaused ? "text-amber-400 border-amber-400/30" :
                  syncProgress.status === "completed" ? "text-emerald-400 border-emerald-400/30" :
                  "text-red-400 border-red-400/30"
                }`}>
                  {syncProgress.status === "token_expired" ? "Token Expired" : syncProgress.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{syncProgress.processed.toLocaleString()} / {syncProgress.total.toLocaleString()} contacts</span>
                <span className="tabular-nums font-medium text-foreground">
                  {syncProgress.total > 0 ? ((syncProgress.processed / syncProgress.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress
                value={syncProgress.total > 0 ? (syncProgress.processed / syncProgress.total) * 100 : 0}
                className="h-2"
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                <p className="text-sm font-semibold text-emerald-400 tabular-nums">{syncProgress.created.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Updated</p>
                <p className="text-sm font-semibold text-blue-400 tabular-nums">{syncProgress.updated.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</p>
                <p className="text-sm font-semibold text-red-400 tabular-nums">{syncProgress.failed.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rate</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">{syncProgress.rate.toFixed(0)}/min</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ETA</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {syncProgress.eta > 60 ? `${(syncProgress.eta / 60).toFixed(1)}h` : `${syncProgress.eta.toFixed(0)}m`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Token</p>
                <p className={`text-sm font-semibold tabular-nums ${
                  syncProgress.tokenMinutes < 10 ? "text-red-400" :
                  syncProgress.tokenMinutes < 30 ? "text-amber-400" : "text-foreground"
                }`}>
                  {syncProgress.tokenMinutes.toFixed(0)}m
                </p>
              </div>
            </div>

            {/* Worker Count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>{syncProgress.workerCount} parallel workers</span>
            </div>

            {/* Controls */}
            <div className="flex gap-2 pt-2 border-t border-border/30">
              {isRunning && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => pauseSyncMut.mutate()}
                  disabled={pauseSyncMut.isPending}
                >
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              )}
              {isPaused && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => resumeSyncMut.mutate()}
                    disabled={resumeSyncMut.isPending}
                  >
                    <Play className="h-3 w-3" /> Resume
                  </Button>
                  {isTokenExpired && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-amber-400"
                      onClick={() => setShowTokenDialog(true)}
                    >
                      <Key className="h-3 w-3" /> Paste New Token
                    </Button>
                  )}
                </>
              )}
              {(isRunning || isPaused) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                  onClick={() => cancelSyncMut.mutate()}
                  disabled={cancelSyncMut.isPending}
                >
                  <StopCircle className="h-3 w-3" /> Cancel
                </Button>
              )}
            </div>

            {/* Recent Errors */}
            {syncProgress.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-2">Recent errors ({syncProgress.errors.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {syncProgress.errors.slice(-5).map((err: { row?: number; error?: string; email?: string }, i: number) => (
                    <div key={i} className="text-[10px] text-red-400/80 font-mono bg-red-400/5 rounded px-2 py-1">
                      Row {err.row}: {err.error} {err.email ? `(${err.email})` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV Preview & Start Dialog */}
      {showPreview && parsedData && (
        <Card className="bg-card border-border/50 border-amber-400/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Table2 className="h-4 w-4 text-amber-400" />
                CSV Preview: {parsedData.fileName}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {parsedData.rows.length.toLocaleString()} rows &middot; {parsedData.headers.length} columns
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Column Preview */}
            <div className="flex flex-wrap gap-1.5">
              {parsedData.headers.map((h) => (
                <Badge key={h} variant="secondary" className="text-[10px]">{h}</Badge>
              ))}
            </div>

            {/* Sample Rows */}
            <p className="text-[10px] text-muted-foreground/60 sm:hidden mb-1">Scroll horizontally to see more columns →</p>
            <div className="max-h-40 overflow-auto border border-border/30 rounded">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-2 py-1 text-left text-muted-foreground">#</th>
                    {parsedData.headers.slice(0, 6).map((h) => (
                      <th key={h} className="px-2 py-1 text-left text-muted-foreground truncate max-w-[120px]">{h}</th>
                    ))}
                    {parsedData.headers.length > 6 && (
                      <th className="px-2 py-1 text-muted-foreground">+{parsedData.headers.length - 6}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border/20">
                      <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                      {parsedData.headers.slice(0, 6).map((h) => (
                        <td key={h} className="px-2 py-1 truncate max-w-[120px]">{row[h] || "—"}</td>
                      ))}
                      {parsedData.headers.length > 6 && <td className="px-2 py-1 text-muted-foreground">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Worker Config */}
            <div className="space-y-2">
              <Label className="text-xs">Parallel Workers: {workerCount}</Label>
              <Slider
                value={[workerCount]}
                onValueChange={([v]) => setWorkerCount(v)}
                min={1}
                max={10}
                step={1}
                className="w-48"
              />
              <p className="text-[10px] text-muted-foreground">
                More workers = faster sync but higher API load. 4 is recommended.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border/30">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleStartImport}
                disabled={createMut.isPending || startSyncMut.isPending}
              >
                {(createMut.isPending || startSyncMut.isPending) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowUpCircle className="h-3 w-3" />
                )}
                Start Import &amp; Sync to GHL
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setParsedData(null); setShowPreview(false); }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Update Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" />
              Update GHL JWT Token
            </DialogTitle>
            <DialogDescription className="sr-only">Update your GoHighLevel JWT token for sync</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The current token has expired. Paste a fresh JWT token from your GHL browser session to continue the sync.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">JWT Token</Label>
              <Input
                type="password"
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowTokenDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleTokenUpdate} disabled={updateTokenMut.isPending}>
                {updateTokenMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Update Token
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Import History</h2>
          {totalImports > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              {totalImports} total import{totalImports !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="h-20 bg-muted/30 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : imports?.length ? (
          imports.map((imp) => {
            const cfg = STATUS_CONFIG[imp.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const totalRows = imp.totalRows ?? 0;
            const processedRows = imp.processedRows ?? 0;
            const pct = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;
            return (
              <Card key={imp.id} className="bg-card border-border/50 card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{imp.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {imp.createdAt ? formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true }) : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{processedRows.toLocaleString()} / {totalRows.toLocaleString()} rows</span>
                      <span className="tabular-nums font-medium text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-1">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm font-medium text-emerald-400 tabular-nums">{(imp.createdCount || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Updated</p>
                        <p className="text-sm font-medium text-blue-400 tabular-nums">{(imp.updatedCount || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Failed</p>
                        <p className="text-sm font-medium text-red-400 tabular-nums">{(imp.failedCount || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Skipped</p>
                        <p className="text-sm font-medium text-muted-foreground tabular-nums">{(imp.skippedCount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 sm:p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No imports yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Upload a CSV file to start importing contacts to GHL.</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination controls */}
        {totalImportPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={importPage === 0}
              onClick={() => setImportPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalImportPages }, (_, i) => {
                // Show first, last, current, and neighbors
                if (
                  i === 0 ||
                  i === totalImportPages - 1 ||
                  Math.abs(i - importPage) <= 1
                ) {
                  return (
                    <Button
                      key={i}
                      variant={i === importPage ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs tabular-nums"
                      onClick={() => setImportPage(i)}
                    >
                      {i + 1}
                    </Button>
                  );
                }
                // Show ellipsis
                if (
                  (i === 1 && importPage > 2) ||
                  (i === totalImportPages - 2 && importPage < totalImportPages - 3)
                ) {
                  return (
                    <span key={i} className="text-xs text-muted-foreground px-1">
                      …
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={importPage >= totalImportPages - 1}
              onClick={() => setImportPage((p) => Math.min(totalImportPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
