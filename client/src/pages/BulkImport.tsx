import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Play, Pause, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  running: { icon: Play, color: "text-blue-400", label: "Running" },
  paused: { icon: Pause, color: "text-amber-400", label: "Paused" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
};

export default function BulkImport() {
  const { data: imports, isLoading, refetch } = trpc.imports.list.useQuery();
  const createMut = trpc.imports.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Import job created"); },
  });

  const handleFileUpload = () => {
    toast.info("File upload coming soon — use the CSV sync script for bulk imports.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload CSV files and monitor import progress.</p>
        </div>
        <Button onClick={handleFileUpload} size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Upload CSV
        </Button>
      </div>

      {/* Import Jobs */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-5">
                <div className="h-20 bg-muted/30 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : imports?.length ? (
          imports.map((imp: any) => {
            const cfg = STATUS_CONFIG[imp.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const pct = imp.totalRows > 0 ? Math.round((imp.processedRows / imp.totalRows) * 100) : 0;
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
                      <span>{imp.processedRows?.toLocaleString()} / {imp.totalRows?.toLocaleString()} rows</span>
                      <span className="tabular-nums font-medium text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="grid grid-cols-4 gap-4 pt-1">
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

                  {imp.status === "paused" && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <RotateCcw className="h-3 w-3" /> Resume from row {imp.resumeFromRow?.toLocaleString()}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No imports yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Upload a CSV file to start importing contacts.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
