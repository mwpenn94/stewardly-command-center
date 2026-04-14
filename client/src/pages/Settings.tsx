import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { useState } from "react";
import {
  Sun, Moon, Bell, Shield, Globe, Palette, User, Mail, Clock,
  ChevronRight, Plug, Archive, Radio, Brain, BarChart3, Upload,
  CheckCircle2, XCircle, Trash2, Loader2, AlertTriangle
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: platformHealth } = trpc.orchestrator.platformHealth.useQuery();

  // Notification preferences (persisted in localStorage)
  const [emailNotifications, setEmailNotifications] = useState(() =>
    localStorage.getItem("pref-email-notifications") !== "false"
  );
  const [pushNotifications, setPushNotifications] = useState(() =>
    localStorage.getItem("pref-push-notifications") !== "false"
  );
  const [syncAlerts, setSyncAlerts] = useState(() =>
    localStorage.getItem("pref-sync-alerts") !== "false"
  );
  const [campaignAlerts, setCampaignAlerts] = useState(() =>
    localStorage.getItem("pref-campaign-alerts") !== "false"
  );

  // General preferences
  const [timezone, setTimezone] = useState(() =>
    localStorage.getItem("pref-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [dateFormat, setDateFormat] = useState(() =>
    localStorage.getItem("pref-date-format") || "relative"
  );

  const savePref = (key: string, value: string) => {
    localStorage.setItem(key, value);
    toast.success("Preference saved");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your preferences and account settings.
        </p>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-medium shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.role === "admin" ? "Owner / Admin" : "Member"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-violet-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Dark Mode</p>
                <p className="text-xs text-muted-foreground">
                  {theme === "dark" ? "Dark theme active" : "Light theme active"}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={() => toggleTheme?.()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              label: "Email Notifications",
              description: "Receive email alerts for important events",
              checked: emailNotifications,
              onChange: (v: boolean) => { setEmailNotifications(v); savePref("pref-email-notifications", String(v)); },
            },
            {
              label: "Push Notifications",
              description: "Browser push notifications for real-time updates",
              checked: pushNotifications,
              onChange: (v: boolean) => { setPushNotifications(v); savePref("pref-push-notifications", String(v)); },
            },
            {
              label: "Sync Alerts",
              description: "Notify when sync operations fail or need attention",
              checked: syncAlerts,
              onChange: (v: boolean) => { setSyncAlerts(v); savePref("pref-sync-alerts", String(v)); },
            },
            {
              label: "Campaign Alerts",
              description: "Notify when campaigns complete or encounter errors",
              checked: campaignAlerts,
              onChange: (v: boolean) => { setCampaignAlerts(v); savePref("pref-campaign-alerts", String(v)); },
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between min-h-[44px]">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch checked={item.checked} onCheckedChange={item.onChange} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* General */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Timezone
            </Label>
            <Select value={timezone} onValueChange={(v) => { setTimezone(v); savePref("pref-timezone", v); }}>
              <SelectTrigger className="bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Date Display</Label>
            <Select value={dateFormat} onValueChange={(v) => { setDateFormat(v); savePref("pref-date-format", v); }}>
              <SelectTrigger className="bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relative">Relative (e.g., "2 hours ago")</SelectItem>
                <SelectItem value="absolute">Absolute (e.g., "Apr 13, 2026")</SelectItem>
                <SelectItem value="iso">ISO (e.g., "2026-04-13")</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contacts</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">{stats?.contacts?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaigns</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">{stats?.campaigns?.toLocaleString() ?? "—"}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform Connections</p>
            {(platformHealth || []).map((p) => (
              <div key={p.platform} className="flex items-center gap-2">
                {p.connected ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                <span className="text-sm text-foreground capitalize">{p.platform === "ghl" ? "GoHighLevel" : p.platform === "smsit" ? "SMS-iT" : "Dripify"}</span>
                <Badge variant="outline" className={`text-[9px] ml-auto ${p.connected ? "text-emerald-400" : "text-red-400"}`}>
                  {p.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            ))}
            {(!platformHealth || platformHealth.length === 0) && (
              <p className="text-xs text-muted-foreground">No platform connections configured.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { icon: Plug, label: "Platform Integrations", desc: "Manage GHL, SMS-iT, Dripify connections", path: "/integrations" },
            { icon: Radio, label: "Channel Management", desc: "Configure 13 channels with providers and limits", path: "/channels" },
            { icon: Archive, label: "Backups & Export", desc: "Create backups and export contact data", path: "/backups" },
            { icon: Brain, label: "AI Insights", desc: "Health scores, recommendations, predictions", path: "/ai-insights" },
            { icon: BarChart3, label: "Analytics", desc: "Campaign metrics and conversion funnel", path: "/analytics" },
            { icon: Upload, label: "Bulk Import", desc: "Import contacts from CSV files", path: "/import" },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => setLocation(link.path)}
              className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/20 transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <link.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Admin: Purge Test Data */}
      {user?.role === "admin" && (
        <Card className="bg-card border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Purge Test Data</p>
                <p className="text-xs text-muted-foreground">
                  Remove contacts, campaigns, imports, and activity entries created by E2E tests.
                  This only removes records matching test patterns (e.g., "E2E Test", "e2e-*").
                </p>
              </div>
              <PurgeTestDataButton />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PurgeTestDataButton() {
  const utils = trpc.useUtils();
  const purgeMut = trpc.admin.purgeTestData.useMutation({
    onSuccess: (data) => {
      const total = data.contactsPurged + data.campaignsPurged + data.importsPurged + data.activityPurged;
      if (total === 0) {
        toast.info("No test data found to purge.");
      } else {
        toast.success(
          `Purged ${data.contactsPurged} contacts, ${data.campaignsPurged} campaigns, ${data.importsPurged} imports, ${data.activityPurged} activity entries.`
        );
      }
      utils.dashboard.stats.invalidate();
      utils.contacts.list.invalidate();
      utils.campaigns.list.invalidate();
      utils.imports.listPaginated.invalidate();
      utils.activity.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5 shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
          Purge
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Purge Test Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete contacts, campaigns, import jobs, and activity log entries
            that match E2E test patterns. Real data will not be affected. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => purgeMut.mutate()}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={purgeMut.isPending}
          >
            {purgeMut.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Purging...</>
            ) : (
              <>Confirm Purge</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
