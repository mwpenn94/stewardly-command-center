import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, Zap, Target } from "lucide-react";

export default function Enrichment() {
  const { data: stats } = trpc.contacts.stats.useQuery();
  const { data: tierData } = trpc.contacts.stats.useQuery();

  const enrichedCount = stats?.enriched || 0;
  const totalContacts = stats?.total || 0;
  const enrichmentRate = totalContacts > 0 ? Math.round((enrichedCount / totalContacts) * 100) : 0;

  const segments = [
    { label: "Residential", key: "residential", color: "bg-blue-500" },
    { label: "Commercial", key: "commercial", color: "bg-emerald-500" },
    { label: "Agricultural", key: "agricultural", color: "bg-amber-500" },
    { label: "CPA/Tax", key: "cpa_tax", color: "bg-violet-500" },
    { label: "Estate Attorney", key: "estate_attorney", color: "bg-rose-500" },
    { label: "HR/Benefits", key: "hr_benefits", color: "bg-cyan-500" },
    { label: "Insurance", key: "insurance", color: "bg-orange-500" },
    { label: "Nonprofit", key: "nonprofit", color: "bg-pink-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Contact Enrichment</h1>
          <p className="text-sm text-muted-foreground mt-1">Enrich contacts via People Data Labs waterfall with confidence scoring.</p>
        </div>
        <Button size="sm" className="gap-2 min-h-[44px] sm:min-h-0 shrink-0" disabled title="Coming soon — People Data Labs integration">
          <Sparkles className="h-4 w-4" /> Enrich All
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Contacts</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{totalContacts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-emerald-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Enriched</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{enrichedCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Enrichment Rate</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{enrichmentRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrichment Pipeline */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Enrichment Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { step: 1, name: "People Data Labs", desc: "Primary data source — email, phone, social profiles, company data", status: "ready" },
            { step: 2, name: "Confidence Scoring", desc: "Score each enrichment result (0-100) based on match quality", status: "ready" },
            { step: 3, name: "Segment Tagging", desc: "Auto-assign segments based on industry, property type, and business data", status: "ready" },
            { step: 4, name: "Propensity Scoring", desc: "Calculate propensity scores and tier assignments (Gold/Silver/Bronze)", status: "ready" },
          ].map((step) => (
            <div key={step.step} className="flex items-start gap-4 p-3 rounded-lg bg-muted/10">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
                {step.step}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{step.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">Ready</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tier Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Gold", key: "gold", color: "bg-amber-500" },
            { label: "Silver", key: "silver", color: "bg-slate-400" },
            { label: "Bronze", key: "bronze", color: "bg-orange-600" },
            { label: "Unscored", key: "unscored", color: "bg-muted-foreground/30" },
          ].map((tier) => {
            const tierCount = tierData?.byTier?.find((t: { tier: string | null }) => t.tier === tier.key)?.count || 0;
            const pct = totalContacts > 0 ? (tierCount / totalContacts) * 100 : 0;
            return (
              <div key={tier.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tier.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium tabular-nums">{tierCount.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground/60 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className={`h-full ${tier.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Segment Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">Segment Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {segments.map((seg) => {
            const segData = stats?.bySegment?.find((s) => s.segment === seg.key);
            const segCount = segData?.count || 0;
            const pct = totalContacts > 0 ? (segCount / totalContacts) * 100 : 0;
            return (
              <div key={seg.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{seg.label}</span>
                  <span className="text-foreground font-medium tabular-nums">{segCount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className={`h-full ${seg.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
