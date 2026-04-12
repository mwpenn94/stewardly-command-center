import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plug, CheckCircle2, XCircle, AlertTriangle, Settings } from "lucide-react";

const PLATFORMS = [
  { id: "ghl" as const, name: "GoHighLevel", description: "CRM, contacts, campaigns, and automation", fields: ["API Key", "Location ID", "Company ID"] },
  { id: "dripify" as const, name: "Dripify", description: "LinkedIn outreach automation and drip campaigns", fields: ["API Key", "Webhook URL"] },
  { id: "linkedin" as const, name: "LinkedIn", description: "Professional network data and Sales Navigator", fields: ["Access Token"] },
  { id: "smsit" as const, name: "SMS-iT", description: "SMS messaging and campaign delivery", fields: ["API Key", "Sender ID"] },
];

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string; dot: string }> = {
  connected: { icon: CheckCircle2, color: "text-emerald-400", label: "Connected", dot: "bg-emerald-400" },
  disconnected: { icon: XCircle, color: "text-muted-foreground", label: "Not Connected", dot: "bg-muted-foreground/40" },
  error: { icon: AlertTriangle, color: "text-red-400", label: "Error", dot: "bg-red-400" },
};

export default function Integrations() {
  const { data: integrations, isLoading, refetch } = trpc.integrations.list.useQuery();
  const upsertMut = trpc.integrations.upsert.useMutation({ onSuccess: () => { refetch(); setConfigOpen(false); toast.success("Integration updated"); } });

  const [configOpen, setConfigOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<typeof PLATFORMS[0] | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});

  const openConfig = (platform: typeof PLATFORMS[0]) => {
    setActivePlatform(platform);
    const existing = integrations?.find((i: any) => i.platform === platform.id);
    if (existing?.credentials) {
      try { setCreds(JSON.parse(existing.credentials)); } catch { setCreds({}); }
    } else {
      setCreds({});
    }
    setConfigOpen(true);
  };

  const handleSave = () => {
    if (!activePlatform) return;
    upsertMut.mutate({
      platform: activePlatform.id,
      label: activePlatform.name,
      credentials: JSON.stringify(creds),
      status: "connected",
    });
  };

  const handleDisconnect = (platformId: "ghl" | "dripify" | "linkedin" | "smsit") => {
    upsertMut.mutate({ platform: platformId, credentials: "", status: "disconnected" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect and manage your marketing platform credentials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const integration = integrations?.find((i: any) => i.platform === platform.id);
          const status = integration?.status || "disconnected";
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
          const StatusIcon = cfg.icon;

          return (
            <Card key={platform.id} className="bg-card border-border/50 card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Plug className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{platform.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cfg.dot} ${status === "connected" ? "status-pulse" : ""}`} />
                    <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                    {integration?.lastCheckedAt && (
                      <span className="text-[10px] text-muted-foreground/60">
                        · checked {new Date(integration.lastCheckedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {status === "connected" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDisconnect(platform.id)}>
                        Disconnect
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => openConfig(platform)}>
                      <Settings className="h-3 w-3" /> Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Configure {activePlatform?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activePlatform?.fields.map((field) => (
              <div key={field} className="space-y-2">
                <Label className="text-xs text-muted-foreground">{field}</Label>
                <Input
                  type="password"
                  value={creds[field] || ""}
                  onChange={(e) => setCreds({ ...creds, [field]: e.target.value })}
                  className="bg-muted/30 font-mono text-xs"
                  placeholder={`Enter ${field.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMut.isPending}>
              {upsertMut.isPending ? "Saving..." : "Save & Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
