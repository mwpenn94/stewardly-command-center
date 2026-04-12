import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Eye, MousePointer, DollarSign, Users, Mail, MessageSquare, Linkedin } from "lucide-react";

export default function Analytics() {
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: contactStats } = trpc.contacts.stats.useQuery();

  // Aggregate metrics from campaigns
  const totalCampaigns = campaigns?.length || 0;
  const channelCounts = {
    email: campaigns?.filter((c: any) => c.channel === "email").length || 0,
    sms: campaigns?.filter((c: any) => c.channel === "sms").length || 0,
    linkedin: campaigns?.filter((c: any) => c.channel === "linkedin").length || 0,
    multi: campaigns?.filter((c: any) => c.channel === "multi").length || 0,
  };

  const metricCards = [
    { label: "Total Campaigns", value: totalCampaigns, icon: BarChart3, color: "text-blue-400" },
    { label: "Total Contacts", value: contactStats?.total || 0, icon: Users, color: "text-emerald-400" },
    { label: "Avg. Open Rate", value: "—", icon: Eye, color: "text-violet-400" },
    { label: "Avg. Click Rate", value: "—", icon: MousePointer, color: "text-amber-400" },
  ];

  const channelBreakdown = [
    { channel: "Email (GHL)", count: channelCounts.email, icon: Mail, color: "text-blue-400", bg: "bg-blue-500/15" },
    { channel: "SMS (SMS-iT)", count: channelCounts.sms, icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { channel: "LinkedIn (Dripify)", count: channelCounts.linkedin, icon: Linkedin, color: "text-sky-400", bg: "bg-sky-500/15" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Unified campaign metrics across all channels.</p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label} className="bg-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center ${m.color}`}>
                  <m.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Breakdown */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Channel Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {channelBreakdown.map((ch) => (
              <div key={ch.channel} className="flex items-center gap-3 p-4 rounded-lg bg-muted/10">
                <div className={`h-10 w-10 rounded-lg ${ch.bg} flex items-center justify-center ${ch.color}`}>
                  <ch.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ch.channel}</p>
                  <p className="text-xs text-muted-foreground">{ch.count} campaign{ch.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tier Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Contact Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {contactStats?.byTier?.map((t: any) => {
              const tierColors: Record<string, string> = {
                gold: "text-amber-400", silver: "text-slate-300", bronze: "text-orange-400", unscored: "text-muted-foreground",
              };
              return (
                <div key={t.tier} className="text-center p-4 rounded-lg bg-muted/10">
                  <p className={`text-2xl font-semibold tabular-nums ${tierColors[t.tier] || "text-foreground"}`}>{t.count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{t.tier}</p>
                </div>
              );
            }) || (
              <div className="col-span-4 text-center py-8">
                <p className="text-sm text-muted-foreground">No tier data yet. Enrich contacts to see tier distribution.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future charts */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Performance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground text-sm">Campaign performance charts will populate as campaigns run and collect metrics.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Open rates, click rates, conversions, and cost per lead tracked per channel.</p>
        </CardContent>
      </Card>
    </div>
  );
}
