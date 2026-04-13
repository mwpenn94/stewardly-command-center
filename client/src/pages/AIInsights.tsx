import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, ArrowRight, Zap, Target, BarChart3,
  Users, RefreshCw, Sparkles, Activity, ShieldCheck,
  Lightbulb, Clock, ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Types mirrored from server ─────────────────────────────────────────────

interface HealthScore {
  overall: number;
  categories: {
    contacts: number;
    campaigns: number;
    sync: number;
    integrations: number;
    dataQuality: number;
  };
  trend: "improving" | "stable" | "declining";
  updatedAt: string;
}

interface Recommendation {
  id: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  actionType: "auto" | "manual" | "info";
  actionLabel?: string;
  actionRoute?: string;
  metric?: { current: number; target: number; unit: string };
}

interface Prediction {
  id: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  trend: "up" | "down" | "stable";
  currentValue: number;
  predictedValue: number;
  unit: string;
}

interface ContactSegmentAnalysis {
  segment: string;
  count: number;
  percentage: number;
  avgEngagement: number;
  topTier: string;
  growthRate: number;
}

interface CampaignPerformance {
  channel: string;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  conversionRate: number;
  trend: "improving" | "stable" | "declining";
}

interface InsightsReport {
  healthScore: HealthScore;
  recommendations: Recommendation[];
  predictions: Prediction[];
  segmentAnalysis: ContactSegmentAnalysis[];
  campaignPerformance: CampaignPerformance[];
  automationSummary: {
    totalActions: number;
    completedActions: number;
    pendingActions: number;
    savedHours: number;
  };
  generatedAt: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreGauge({ score, label, size = "sm" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : score >= 40 ? "text-orange-400" : "text-red-400";
  const bgColor = score >= 80 ? "bg-emerald-400/10" : score >= 60 ? "bg-amber-400/10" : score >= 40 ? "bg-orange-400/10" : "bg-red-400/10";
  const isLg = size === "lg";

  return (
    <div className={`flex flex-col items-center gap-1 ${isLg ? "gap-2" : ""}`}>
      <div className={`relative flex items-center justify-center rounded-full ${bgColor} ${isLg ? "h-24 w-24 sm:h-28 sm:w-28" : "h-14 w-14 sm:h-16 sm:w-16"}`}>
        <span className={`font-bold tabular-nums ${color} ${isLg ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"}`}>{score}</span>
      </div>
      <span className={`text-muted-foreground ${isLg ? "text-sm font-medium" : "text-[10px] sm:text-xs"}`}>{label}</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up" || trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down" || trend === "declining") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return <Badge variant="outline" className={styles[priority] || styles.low}>{priority}</Badge>;
}

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  contacts: Users,
  campaigns: Target,
  sync: RefreshCw,
  integrations: Zap,
  data_quality: ShieldCheck,
  engagement: Activity,
  growth: TrendingUp,
};

const SEGMENT_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  agricultural: "Agricultural",
  cpa_tax: "CPA / Tax",
  estate_attorney: "Estate Attorney",
  hr_benefits: "HR / Benefits",
  insurance: "Insurance",
  nonprofit: "Nonprofit",
  other: "Other",
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AIInsights() {
  const [, navigate] = useLocation();
  const { data: report, isLoading, refetch } = trpc.ai.insights.useQuery(undefined, {
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const bulkScore = trpc.ai.bulkLeadScore.useMutation({
    onSuccess: (data) => {
      toast.success(`Scored ${data.scored} of ${data.total} contacts`);
      refetch();
    },
    onError: () => toast.error("Lead scoring failed"),
  });

  if (isLoading || !report) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl tracking-tight text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-primary" /> AI Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Analyzing your data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-card border-border/50 animate-pulse">
              <CardContent className="p-6"><div className="h-20 bg-muted/30 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { healthScore, recommendations, predictions, segmentAnalysis, campaignPerformance, automationSummary } = report as InsightsReport;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl tracking-tight text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-primary" /> AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Continuous improvement engine — retrospective, real-time, and predictive analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 min-h-[44px] sm:min-h-0" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="gap-2 min-h-[44px] sm:min-h-0" onClick={() => bulkScore.mutate()} disabled={bulkScore.isPending}>
                <Sparkles className="h-4 w-4" /> {bulkScore.isPending ? "Scoring..." : "Score All Contacts"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run AI lead scoring on all contacts</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Health Score Overview */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> System Health Score
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-normal">
              <TrendIcon trend={healthScore.trend} />
              {healthScore.trend}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <ScoreGauge score={healthScore.overall} label="Overall" size="lg" />
            <div className="flex-1 w-full">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
                <ScoreGauge score={healthScore.categories.contacts} label="Contacts" />
                <ScoreGauge score={healthScore.categories.campaigns} label="Campaigns" />
                <ScoreGauge score={healthScore.categories.sync} label="Sync" />
                <ScoreGauge score={healthScore.categories.integrations} label="Integrations" />
                <ScoreGauge score={healthScore.categories.dataQuality} label="Data Quality" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Recommendations + Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recommendations */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" /> Recommendations
              <Badge variant="secondary" className="ml-auto text-xs">{recommendations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {recommendations.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All systems optimized — no recommendations at this time.</p>
              </div>
            ) : recommendations.map((rec) => {
              const Icon = CATEGORY_ICONS[rec.category] || Lightbulb;
              return (
                <div key={rec.id} className="flex gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground leading-tight">{rec.title}</p>
                      <PriorityBadge priority={rec.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                    {rec.metric && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{rec.metric.current} {rec.metric.unit}</span>
                          <span>Target: {rec.metric.target} {rec.metric.unit}</span>
                        </div>
                        <Progress value={(rec.metric.current / rec.metric.target) * 100} className="h-1.5" />
                      </div>
                    )}
                    {rec.actionRoute && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary gap-1 -ml-2 min-h-[44px] sm:min-h-0"
                        onClick={() => navigate(rec.actionRoute!)}
                      >
                        {rec.actionLabel || "Take Action"} <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Predictions
              <Badge variant="secondary" className="ml-auto text-xs">{predictions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {predictions.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Add more data to unlock predictions.</p>
              </div>
            ) : predictions.map((pred) => (
              <div key={pred.id} className="p-3 rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{pred.title}</p>
                    <p className="text-xs text-muted-foreground">{pred.description}</p>
                  </div>
                  <TrendIcon trend={pred.trend} />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Now:</span>
                    <span className="font-medium tabular-nums">{pred.currentValue} {pred.unit}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Predicted:</span>
                    <span className="font-medium tabular-nums text-primary">{pred.predictedValue} {pred.unit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {pred.timeframe}
                  </div>
                  <div className="flex items-center gap-1">
                    Confidence: <span className="font-medium tabular-nums">{pred.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance + Segment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Campaign Performance by Channel */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Campaign Performance by Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaignPerformance.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Launch campaigns to see channel performance.</p>
                <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary min-h-[44px] sm:min-h-0" onClick={() => navigate("/campaigns")}>
                  Go to Campaigns <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaignPerformance.map((cp) => (
                  <div key={cp.channel} className="p-3 rounded-lg bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{cp.channel}</span>
                        <TrendIcon trend={cp.trend} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{cp.totalSent.toLocaleString()} sent</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open Rate</p>
                        <p className="text-sm font-semibold tabular-nums">{cp.avgOpenRate}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Click Rate</p>
                        <p className="text-sm font-semibold tabular-nums">{cp.avgClickRate}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion</p>
                        <p className="text-sm font-semibold tabular-nums">{cp.conversionRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Segment Analysis */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Segment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentAnalysis.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Add contacts to see segment analysis.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {segmentAnalysis.map((seg) => (
                  <div key={seg.segment} className="flex items-center gap-3 p-2 rounded hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{SEGMENT_LABELS[seg.segment] || seg.segment}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">{seg.count} ({seg.percentage}%)</span>
                      </div>
                      <Progress value={seg.percentage} className="h-1 mt-1" />
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{seg.topTier}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Automation Summary */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Automation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Total Actions</p>
              <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">{automationSummary.totalActions}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
              <p className="text-lg sm:text-xl font-bold tabular-nums text-emerald-400">{automationSummary.completedActions}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-lg sm:text-xl font-bold tabular-nums text-amber-400">{automationSummary.pendingActions}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Est. Hours Saved</p>
              <p className="text-lg sm:text-xl font-bold tabular-nums text-primary">{automationSummary.savedHours}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer timestamp */}
      <p className="text-xs text-muted-foreground text-center">
        Report generated {new Date(report.generatedAt).toLocaleString()} · Auto-refreshes every 2 minutes
      </p>
    </div>
  );
}
