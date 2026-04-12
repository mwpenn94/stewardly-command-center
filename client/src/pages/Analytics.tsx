import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BarChart3, TrendingUp, Eye, MousePointer, DollarSign, Users, Mail, MessageSquare, Linkedin, Send, CheckCircle2, XCircle, ArrowUpRight, Reply } from "lucide-react";
import { useMemo } from "react";

type CampaignMetrics = {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;
  unsubscribed?: number;
  cost?: number;
  conversions?: number;
};

function parseMetrics(raw: any): CampaignMetrics {
  if (!raw) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return raw as CampaignMetrics;
}

function pct(num: number, den: number): string {
  if (den <= 0) return "0.0%";
  return ((num / den) * 100).toFixed(1) + "%";
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function Analytics() {
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: contactStats } = trpc.contacts.stats.useQuery();

  // Aggregate all campaign metrics
  const agg = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;

    let totalSent = 0, totalDelivered = 0, totalOpened = 0, totalClicked = 0;
    let totalReplied = 0, totalBounced = 0, totalUnsub = 0, totalCost = 0, totalConversions = 0;
    let campaignsWithMetrics = 0;

    const byChannel: Record<string, { sent: number; delivered: number; opened: number; clicked: number; replied: number; bounced: number; cost: number; conversions: number; count: number }> = {
      email: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, cost: 0, conversions: 0, count: 0 },
      sms: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, cost: 0, conversions: 0, count: 0 },
      linkedin: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, cost: 0, conversions: 0, count: 0 },
      multi: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, cost: 0, conversions: 0, count: 0 },
    };

    for (const c of campaigns as any[]) {
      const ch = c.channel || "email";
      if (byChannel[ch]) byChannel[ch].count++;

      const m = parseMetrics(c.metrics);
      if (m.sent || m.delivered || m.opened || m.clicked) {
        campaignsWithMetrics++;
        const sent = m.sent || 0;
        const delivered = m.delivered || sent;
        const opened = m.opened || 0;
        const clicked = m.clicked || 0;
        const replied = m.replied || 0;
        const bounced = m.bounced || 0;
        const unsub = m.unsubscribed || 0;
        const cost = m.cost || 0;
        const conv = m.conversions || 0;

        totalSent += sent; totalDelivered += delivered; totalOpened += opened;
        totalClicked += clicked; totalReplied += replied; totalBounced += bounced;
        totalUnsub += unsub; totalCost += cost; totalConversions += conv;

        if (byChannel[ch]) {
          byChannel[ch].sent += sent; byChannel[ch].delivered += delivered;
          byChannel[ch].opened += opened; byChannel[ch].clicked += clicked;
          byChannel[ch].replied += replied; byChannel[ch].bounced += bounced;
          byChannel[ch].cost += cost; byChannel[ch].conversions += conv;
        }
      }
    }

    return {
      totalCampaigns: campaigns.length,
      campaignsWithMetrics,
      totalSent, totalDelivered, totalOpened, totalClicked,
      totalReplied, totalBounced, totalUnsub, totalCost, totalConversions,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
      conversionRate: totalClicked > 0 ? (totalConversions / totalClicked) * 100 : 0,
      costPerLead: totalConversions > 0 ? totalCost / totalConversions : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      byChannel,
    };
  }, [campaigns]);

  const hasMetrics = agg && agg.campaignsWithMetrics > 0;

  const topCards = [
    { label: "Total Sent", value: agg ? formatNum(agg.totalSent) : "0", icon: Send, color: "text-blue-400" },
    { label: "Open Rate", value: hasMetrics ? agg.openRate.toFixed(1) + "%" : "—", icon: Eye, color: "text-violet-400" },
    { label: "Click Rate", value: hasMetrics ? agg.clickRate.toFixed(1) + "%" : "—", icon: MousePointer, color: "text-amber-400" },
    { label: "Conversions", value: agg ? formatNum(agg.totalConversions) : "0", icon: ArrowUpRight, color: "text-emerald-400" },
    { label: "Cost per Lead", value: hasMetrics && agg.costPerLead > 0 ? "$" + agg.costPerLead.toFixed(2) : "—", icon: DollarSign, color: "text-rose-400" },
    { label: "Bounce Rate", value: hasMetrics ? agg.bounceRate.toFixed(1) + "%" : "—", icon: XCircle, color: "text-red-400" },
  ];

  const channelConfig = [
    { key: "email", label: "Email (GHL)", icon: Mail, color: "text-blue-400", bg: "bg-blue-500/15" },
    { key: "sms", label: "SMS (SMS-iT)", icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { key: "linkedin", label: "LinkedIn (Dripify)", icon: Linkedin, color: "text-sky-400", bg: "bg-sky-500/15" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unified campaign metrics across all channels.
          {agg && <span className="ml-1 text-muted-foreground/60">· {agg.totalCampaigns} campaign{agg.totalCampaigns !== 1 ? "s" : ""} tracked</span>}
        </p>
      </div>

      {/* Top-level KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {topCards.map((m) => (
          <Card key={m.label} className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`h-4 w-4 ${m.color}`} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              </div>
              <p className="text-xl font-semibold text-foreground tabular-nums">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-Channel Breakdown */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Per-Channel Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channelConfig.map((ch) => {
              const data = agg?.byChannel[ch.key];
              const hasCh = data && data.count > 0;
              const chHasMetrics = data && (data.sent > 0 || data.delivered > 0);

              return (
                <div key={ch.key} className="rounded-lg bg-muted/10 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-8 w-8 rounded-lg ${ch.bg} flex items-center justify-center ${ch.color}`}>
                      <ch.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{ch.label}</p>
                      <p className="text-xs text-muted-foreground">{data?.count || 0} campaign{(data?.count || 0) !== 1 ? "s" : ""}</p>
                    </div>
                    {chHasMetrics && (
                      <Badge variant="outline" className="text-[10px]">
                        {formatNum(data.sent)} sent
                      </Badge>
                    )}
                  </div>

                  {chHasMetrics ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Delivered</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatNum(data.delivered)}</p>
                        <p className="text-[10px] text-muted-foreground">{pct(data.delivered, data.sent)} of sent</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Opened</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatNum(data.opened)}</p>
                        <p className="text-[10px] text-muted-foreground">{pct(data.opened, data.delivered)} open rate</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Clicked</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatNum(data.clicked)}</p>
                        <p className="text-[10px] text-muted-foreground">{pct(data.clicked, data.delivered)} CTR</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Conversions</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatNum(data.conversions)}</p>
                        <p className="text-[10px] text-muted-foreground">{pct(data.conversions, data.clicked)} conv. rate</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Cost / Lead</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">
                          {data.conversions > 0 ? "$" + (data.cost / data.conversions).toFixed(2) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">${data.cost.toFixed(2)} total</p>
                      </div>
                    </div>
                  ) : hasCh ? (
                    <p className="text-xs text-muted-foreground">Metrics will populate once campaigns run and collect data.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">No campaigns on this channel yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      {hasMetrics && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Sent", value: agg.totalSent, max: agg.totalSent, color: "bg-blue-500" },
              { label: "Delivered", value: agg.totalDelivered, max: agg.totalSent, color: "bg-indigo-500" },
              { label: "Opened", value: agg.totalOpened, max: agg.totalSent, color: "bg-violet-500" },
              { label: "Clicked", value: agg.totalClicked, max: agg.totalSent, color: "bg-amber-500" },
              { label: "Conversions", value: agg.totalConversions, max: agg.totalSent, color: "bg-emerald-500" },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground w-24 text-right">{step.label}</p>
                <div className="flex-1 h-6 rounded-md bg-muted/20 overflow-hidden relative">
                  <div
                    className={`h-full ${step.color} rounded-md transition-all duration-500`}
                    style={{ width: `${step.max > 0 ? Math.max((step.value / step.max) * 100, 1) : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                    {formatNum(step.value)} {step.max > 0 ? `(${pct(step.value, step.max)})` : ""}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No metrics placeholder */}
      {!hasMetrics && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Campaign funnel will populate as campaigns run and collect metrics.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Open rates, click rates, conversions, and cost per lead tracked per channel.</p>
          </CardContent>
        </Card>
      )}

      {/* Tier Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Contact Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {contactStats?.byTier?.length ? (
              contactStats.byTier.map((t: any) => {
                const tierColors: Record<string, string> = {
                  gold: "text-amber-400", silver: "text-slate-300", bronze: "text-orange-400", unscored: "text-muted-foreground",
                };
                return (
                  <div key={t.tier} className="text-center p-4 rounded-lg bg-muted/10">
                    <p className={`text-2xl font-semibold tabular-nums ${tierColors[t.tier] || "text-foreground"}`}>{t.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{t.tier}</p>
                  </div>
                );
              })
            ) : (
              <div className="col-span-4 text-center py-8">
                <p className="text-sm text-muted-foreground">No tier data yet. Enrich contacts to see tier distribution.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
