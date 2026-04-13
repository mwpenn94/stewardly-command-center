import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Plug, CheckCircle2, XCircle, AlertTriangle, Settings, Zap, Shield, Eye, EyeOff, Loader2, Trash2, Info } from "lucide-react";

const PLATFORMS = [
  {
    id: "ghl" as const,
    name: "GoHighLevel",
    description: "CRM, contacts, campaigns, and automation",
    fields: [
      { key: "API Key", required: false, hint: "Found in Settings → Business Profile → API Key (use this OR JWT Token)" },
      { key: "JWT Token", required: false, hint: "Paste from browser localStorage for internal API access (use this OR API Key)" },
      { key: "Location ID", required: false, hint: "Auto-extracted from JWT, or enter manually for API Key auth" },
      { key: "Company ID", required: false, hint: "Found in Settings → Company → Company ID (optional)" },
    ],
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "dripify" as const,
    name: "Dripify",
    description: "LinkedIn outreach automation and drip campaigns",
    fields: [
      { key: "API Key", required: false, hint: "Found in Dripify → Settings → API (use this OR Session Cookie)" },
      { key: "Session Cookie", required: false, hint: "Paste your Dripify session cookie from browser DevTools as failover auth" },
      { key: "Webhook URL", required: false, hint: "Auto-generated webhook endpoint for event ingestion" },
    ],
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  {
    id: "linkedin" as const,
    name: "LinkedIn",
    description: "Professional network data and Sales Navigator",
    fields: [
      { key: "Access Token", required: false, hint: "OAuth token from LinkedIn Developer Portal (use this OR Session Cookie)" },
      { key: "Session Cookie", required: false, hint: "Paste li_at cookie from browser DevTools as failover auth" },
      { key: "JSESSIONID", required: false, hint: "Paste JSESSIONID cookie (optional, improves session stability)" },
    ],
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
  },
  {
    id: "smsit" as const,
    name: "SMS-iT",
    description: "SMS messaging and campaign delivery",
    fields: [
      { key: "API Key", required: false, hint: "Found in SMS-iT → Settings → API Keys (primary auth method)" },
      { key: "Session Token", required: false, hint: "Paste session token from SMS-iT dashboard as failover auth" },
      { key: "Sender ID", required: false, hint: "Your registered sender ID for outbound SMS" },
      { key: "Webhook Secret", required: false, hint: "Webhook signing secret for delivery status callbacks" },
    ],
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
];

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string; dot: string }> = {
  connected: { icon: CheckCircle2, color: "text-emerald-400", label: "Connected", dot: "bg-emerald-400" },
  disconnected: { icon: XCircle, color: "text-muted-foreground", label: "Not Connected", dot: "bg-muted-foreground/40" },
  error: { icon: AlertTriangle, color: "text-red-400", label: "Error", dot: "bg-red-400" },
};

export default function Integrations() {
  const { data: integrations, isLoading, refetch } = trpc.integrations.list.useQuery();
  const upsertMut = trpc.integrations.upsert.useMutation({
    onSuccess: () => { refetch(); toast.success("Integration saved"); },
    onError: (err) => toast.error(err.message),
  });
  const testMut = trpc.integrations.testConnection.useMutation();
  const disconnectMut = trpc.integrations.disconnect.useMutation({
    onSuccess: () => { refetch(); toast.success("Integration disconnected"); },
    onError: (err) => toast.error(err.message),
  });

  const [configOpen, setConfigOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<typeof PLATFORMS[0] | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if any platform is connected for onboarding banner
  const connectedCount = integrations?.filter((i: any) => i.status === "connected").length ?? 0;
  const showOnboarding = !isLoading && connectedCount === 0;

  const openConfig = (platform: typeof PLATFORMS[0]) => {
    setActivePlatform(platform);
    setTestResult(null);
    setShowPasswords({});
    const existing = integrations?.find((i: any) => i.platform === platform.id);
    if (existing?.credentials) {
      try { setCreds(JSON.parse(existing.credentials)); } catch { setCreds({}); }
    } else {
      setCreds({});
    }
    setConfigOpen(true);
  };

  const handleTestConnection = async () => {
    if (!activePlatform) return;
    setTestResult(null);
    const result = await testMut.mutateAsync({
      platform: activePlatform.id,
      credentials: JSON.stringify(creds),
    });
    setTestResult(result);
  };

  const handleSave = () => {
    if (!activePlatform) return;
    // Platform-specific validation with failover auth support
    if (activePlatform.id === "ghl") {
      if (!creds["API Key"]?.trim() && !creds["JWT Token"]?.trim()) {
        toast.error("Either API Key or JWT Token is required for GoHighLevel");
        return;
      }
    } else if (activePlatform.id === "dripify") {
      if (!creds["API Key"]?.trim() && !creds["Session Cookie"]?.trim()) {
        toast.error("Either API Key or Session Cookie is required for Dripify");
        return;
      }
    } else if (activePlatform.id === "linkedin") {
      if (!creds["Access Token"]?.trim() && !creds["Session Cookie"]?.trim()) {
        toast.error("Either Access Token or Session Cookie (li_at) is required for LinkedIn");
        return;
      }
    } else if (activePlatform.id === "smsit") {
      if (!creds["API Key"]?.trim() && !creds["Session Token"]?.trim()) {
        toast.error("Either API Key or Session Token is required for SMS-iT");
        return;
      }
    }
    upsertMut.mutate({
      platform: activePlatform.id,
      label: activePlatform.name,
      credentials: JSON.stringify(creds),
      status: testResult?.success ? "connected" : "connected",
    });
    setConfigOpen(false);
  };

  const handleTestAndSave = async () => {
    if (!activePlatform) return;
    if (activePlatform.id === "ghl") {
      if (!creds["API Key"]?.trim() && !creds["JWT Token"]?.trim()) {
        toast.error("Either API Key or JWT Token is required for GoHighLevel");
        return;
      }
    } else if (activePlatform.id === "dripify") {
      if (!creds["API Key"]?.trim() && !creds["Session Cookie"]?.trim()) {
        toast.error("Either API Key or Session Cookie is required for Dripify");
        return;
      }
    } else if (activePlatform.id === "linkedin") {
      if (!creds["Access Token"]?.trim() && !creds["Session Cookie"]?.trim()) {
        toast.error("Either Access Token or Session Cookie (li_at) is required for LinkedIn");
        return;
      }
    } else if (activePlatform.id === "smsit") {
      if (!creds["API Key"]?.trim() && !creds["Session Token"]?.trim()) {
        toast.error("Either API Key or Session Token is required for SMS-iT");
        return;
      }
    }
    setTestResult(null);
    const result = await testMut.mutateAsync({
      platform: activePlatform.id,
      credentials: JSON.stringify(creds),
    });
    setTestResult(result);
    if (result.success) {
      upsertMut.mutate({
        platform: activePlatform.id,
        label: activePlatform.name,
        credentials: JSON.stringify(creds),
        status: "connected",
      });
      setConfigOpen(false);
    }
  };

  const handleDisconnect = (platformId: "ghl" | "dripify" | "linkedin" | "smsit") => {
    disconnectMut.mutate({ platform: platformId });
  };

  const togglePassword = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect and manage your marketing platform credentials. All credentials are stored securely in the database.</p>
      </div>

      {/* First-login onboarding banner */}
      {showOnboarding && (
        <Alert className="bg-primary/5 border-primary/20">
          <Zap className="h-4 w-4 text-primary" />
          <AlertTitle className="text-foreground">Welcome! Let's connect your platforms</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Get started by connecting at least one platform below. We recommend starting with <strong className="text-foreground">GoHighLevel</strong> to enable contact sync, campaigns, and enrichment. Click <strong className="text-foreground">Configure</strong> on any platform to enter your credentials.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const integration = integrations?.find((i: any) => i.platform === platform.id);
          const status = integration?.status || "disconnected";
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
          const StatusIcon = cfg.icon;

          // Parse stored credentials to show field count
          let storedFieldCount = 0;
          if (integration?.credentials) {
            try {
              const parsed = JSON.parse(integration.credentials);
              storedFieldCount = Object.keys(parsed).filter(k => parsed[k]).length;
            } catch {}
          }

          return (
            <Card key={platform.id} className="bg-card border-border/50 card-hover group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${platform.bgColor} flex items-center justify-center`}>
                      <Plug className={`h-5 w-5 ${platform.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{platform.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                    </div>
                  </div>
                </div>

                {/* Status + credential summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cfg.dot} ${status === "connected" ? "status-pulse" : ""}`} />
                    <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                    {status === "connected" && storedFieldCount > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        · {storedFieldCount} credential{storedFieldCount !== 1 ? "s" : ""} stored
                      </span>
                    )}
                    {integration?.lastCheckedAt && (
                      <span className="text-[10px] text-muted-foreground/60">
                        · checked {new Date(integration.lastCheckedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {status === "connected" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDisconnect(platform.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Disconnect
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => openConfig(platform)}>
                      <Settings className="h-3 w-3" /> {status === "connected" ? "Edit" : "Configure"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How it works */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">How credentials work</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All credentials are stored in the application database and used server-side for API calls. No environment variables or server restarts are required. You can update or rotate credentials at any time from this page. Connection tests verify your credentials are valid before saving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {activePlatform && (
                <div className={`h-6 w-6 rounded ${PLATFORMS.find(p => p.id === activePlatform.id)?.bgColor} flex items-center justify-center`}>
                  <Plug className={`h-3.5 w-3.5 ${PLATFORMS.find(p => p.id === activePlatform.id)?.color}`} />
                </div>
              )}
              Configure {activePlatform?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Enter your credentials below. Required fields are marked with an asterisk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {activePlatform?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  {field.key}
                  {field.required && <span className="text-red-400">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords[field.key] ? "text" : "password"}
                    value={creds[field.key] || ""}
                    onChange={(e) => setCreds({ ...creds, [field.key]: e.target.value })}
                    className="bg-muted/30 font-mono text-xs pr-10"
                    placeholder={`Enter ${field.key.toLowerCase()}...`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 h-9 w-9 min-h-[44px] min-w-[44px] p-0"
                    onClick={() => togglePassword(field.key)}
                  >
                    {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {field.hint && (
                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" /> {field.hint}
                  </p>
                )}
              </div>
            ))}

            {/* Test result */}
            {testResult && (
              <Alert className={testResult.success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <AlertDescription className={`text-xs ${testResult.success ? "text-emerald-300" : "text-red-300"}`}>
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator className="bg-border/30" />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testMut.isPending} className="gap-1.5">
              {testMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Test Connection
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={upsertMut.isPending} className="gap-1.5">
                {upsertMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                Save Credentials
              </Button>
              <Button size="sm" variant="default" onClick={handleTestAndSave} disabled={testMut.isPending || upsertMut.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                {(testMut.isPending || upsertMut.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Test & Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
