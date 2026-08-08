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
  ChevronRight, Plug
} from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

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

      {/* Quick Links */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Account & Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={() => setLocation("/integrations")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/20 transition-colors min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <Plug className="h-4 w-4 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Platform Integrations</p>
                <p className="text-xs text-muted-foreground">Manage GHL, SMS-iT, Dripify connections</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
