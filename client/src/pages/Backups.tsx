import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Download, Upload, Database, Clock, CheckCircle2, FileJson, FileText, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  contacts: "Contacts", campaigns: "Campaigns", templates: "Templates", full: "Full Backup",
};

import type { LucideIcon } from "lucide-react";

const FORMAT_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  csv: { icon: FileText, label: "CSV" },
  json: { icon: FileJson, label: "JSON" },
};

export default function Backups() {
  const { data: backups, isLoading, refetch } = trpc.backups.list.useQuery();
  const createBackup = trpc.backups.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Backup created successfully"); },
    onError: (err) => toast.error(err.message),
  });

  const [backupType, setBackupType] = useState<"contacts" | "campaigns" | "full">("full");
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const handleCreateBackup = () => {
    createBackup.mutate({ type: backupType, format });
  };

  const handleDownload = (backup: { fileUrl: string | null }) => {
    if (backup.fileUrl) {
      window.open(backup.fileUrl, "_blank");
    } else {
      toast.info("Backup file will be available once processing completes.");
    }
  };

  // Restore from backup — not yet implemented

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Data Backup & Export</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated backups, one-click export, and restore functionality.</p>
        </div>
      </div>

      {/* Create Backup */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Create Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Data Type</label>
              <Select value={backupType} onValueChange={(v) => setBackupType(v as "contacts" | "campaigns" | "full")}>
                <SelectTrigger className="w-[160px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup</SelectItem>
                  <SelectItem value="contacts">Contacts Only</SelectItem>
                  <SelectItem value="campaigns">Campaigns Only</SelectItem>
                  <SelectItem value="templates">Templates Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
                <SelectTrigger className="w-[120px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateBackup} disabled={createBackup.isPending} className="gap-2 min-h-[44px] sm:min-h-0">
              <Database className="h-4 w-4" />
              {createBackup.isPending ? "Creating..." : "Create Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Backup History</h2>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-4"><div className="h-12 bg-muted/30 rounded animate-pulse" /></CardContent>
            </Card>
          ))
        ) : backups?.length ? (
          backups.map((b) => {
            const fmtCfg = FORMAT_CONFIG[b.format] || FORMAT_CONFIG.csv;
            const FmtIcon = fmtCfg.icon;
            return (
              <Card key={b.id} className="bg-card border-border/50 card-hover">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                    <FmtIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{TYPE_LABELS[b.type] || b.type}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{fmtCfg.label}</Badge>
                      <Badge className={`text-[10px] ${b.status === "ready" ? "bg-emerald-500/15 text-emerald-400" : b.status === "expired" ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground"}`}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.recordCount?.toLocaleString() || 0} records · {b.createdAt ? formatDistanceToNow(new Date(b.createdAt), { addSuffix: true }) : "—"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {b.status === "ready" && (
                      <>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleDownload(b)}>
                          <Download className="h-3 w-3" /> Download
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" disabled title="Coming soon">
                          <RotateCcw className="h-3 w-3" /> Restore
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <Database className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No backups yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create your first backup to protect your data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
