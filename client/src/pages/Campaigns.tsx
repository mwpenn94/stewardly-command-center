import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Plus, Megaphone, Mail, MessageSquare, Linkedin, Layers,
  Trash2, Play, Send, Loader2, AlertTriangle, CheckCircle2,
  Users, FileText, Zap, Clock, ArrowRight, Pause, XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { LucideIcon } from "lucide-react";

type ChannelConfig = { icon: LucideIcon; label: string; color: string; platform: string };

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  email: { icon: Mail, label: "Email", color: "text-blue-400", platform: "GHL" },
  sms: { icon: MessageSquare, label: "SMS", color: "text-emerald-400", platform: "SMS-iT" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-sky-400", platform: "Dripify" },
  multi: { icon: Layers, label: "Multi-Channel", color: "text-violet-400", platform: "All" },
};

type Channel = "email" | "linkedin" | "sms" | "multi";

interface CampaignForm {
  name?: string;
  channel: Channel;
}

interface LaunchForm {
  body: string;
  subject: string;
  contactIds?: number[];
}

interface SeqStep {
  channel: "email" | "linkedin" | "sms";
  body: string;
  subject: string;
  delayMs: number;
}

interface SeqForm {
  name: string;
  steps: SeqStep[];
  contactIds: number[];
}

interface TemplateForm {
  name?: string;
  channel: "email" | "linkedin" | "sms";
  subject?: string;
  body?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/15 text-blue-400",
  running: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-amber-500/15 text-amber-400",
  completed: "bg-primary/15 text-primary",
  failed: "bg-red-500/15 text-red-400",
  cancelled: "bg-red-500/15 text-red-400",
};

export default function Campaigns() {
  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
  const { data: contactData } = trpc.contacts.list.useQuery({ limit: 200 });
  const { data: platformHealth } = trpc.orchestrator.platformHealth.useQuery();
  const { data: sequences, refetch: refetchSeq } = trpc.orchestrator.listSequences.useQuery(undefined, { refetchInterval: 3000 });

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => { refetch(); setCreateOpen(false); toast.success("Campaign created"); },
    onError: (err) => toast.error(err.message),
  });
  const launchCampaign = trpc.campaigns.launch.useMutation({
    onSuccess: (data) => {
      refetch(); setLaunchOpen(false);
      if (data.success) toast.success(`Campaign sent to ${data.sent} contacts!`);
      else toast.warning(`Sent: ${data.sent}, Failed: ${data.failed}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Campaign deleted"); },
  });
  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => { toast.success("Template saved"); },
  });
  const startSequence = trpc.orchestrator.startSequence.useMutation({
    onSuccess: () => { refetchSeq(); setSeqOpen(false); toast.success("Sequence started!"); },
    onError: (err) => toast.error(err.message),
  });
  const cancelSequence = trpc.orchestrator.cancelSequence.useMutation({
    onSuccess: () => { refetchSeq(); toast.success("Sequence cancelled"); },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [seqOpen, setSeqOpen] = useState(false);
  const [launchCampaignData, setLaunchCampaignData] = useState<{ id: number; name: string; channel: string } | null>(null);
  const [form, setForm] = useState<CampaignForm>({ channel: "email" });
  const [tplForm, setTplForm] = useState<TemplateForm>({ channel: "email" });
  const [launchForm, setLaunchForm] = useState<LaunchForm>({ body: "", subject: "" });
  const [seqForm, setSeqForm] = useState<SeqForm>({ name: "", steps: [{ channel: "email", body: "", subject: "", delayMs: 0 }], contactIds: [] });
  const [tab, setTab] = useState("campaigns");

  const allContacts = useMemo(() => contactData?.contacts || [], [contactData]);

  const openLaunch = (campaign: { id: number; name: string; channel: string }) => {
    setLaunchCampaignData(campaign);
    setLaunchForm({ body: "", subject: "", contactIds: [] });
    setLaunchOpen(true);
  };

  const handleLaunch = () => {
    if (!launchCampaignData) return;
    if (!launchForm.body.trim()) { toast.error("Message body is required"); return; }
    launchCampaign.mutate({
      campaignId: launchCampaignData.id,
      body: launchForm.body,
      subject: launchForm.subject || undefined,
      contactIds: (launchForm.contactIds?.length ?? 0) > 0 ? launchForm.contactIds : undefined,
    });
  };

  const addSeqStep = () => {
    setSeqForm((f) => ({ ...f, steps: [...f.steps, { channel: "sms", body: "", subject: "", delayMs: 3600000 }] }));
  };

  const removeSeqStep = (idx: number) => {
    setSeqForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }));
  };

  const updateSeqStep = (idx: number, field: keyof SeqStep, value: string | number) => {
    setSeqForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const handleStartSequence = () => {
    if (!seqForm.name.trim()) { toast.error("Sequence name is required"); return; }
    if (seqForm.steps.some((s) => !s.body.trim())) { toast.error("All steps need a message body"); return; }
    const contactIds = seqForm.contactIds.length > 0 ? seqForm.contactIds : allContacts.map((c) => c.id);
    startSequence.mutate({ ...seqForm, contactIds });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Campaign Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Build and launch multi-channel outreach campaigns.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => { setTplForm({ channel: "email" }); setTemplateOpen(true); }}>
            New Template
          </Button>
          <Button size="sm" className="gap-2 min-h-[44px] sm:min-h-0" onClick={() => { setForm({ channel: "email" }); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Platform Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(platformHealth || [
          { platform: "ghl", connected: false, lastChecked: 0 },
          { platform: "smsit", connected: false, lastChecked: 0 },
          { platform: "dripify", connected: false, lastChecked: 0 },
        ]).map((p) => {
          const cfg = p.platform === "ghl" ? { icon: Mail, label: "GoHighLevel", color: "text-blue-400", bg: "bg-blue-500/10" }
            : p.platform === "smsit" ? { icon: MessageSquare, label: "SMS-iT", color: "text-emerald-400", bg: "bg-emerald-500/10" }
            : { icon: Linkedin, label: "Dripify", color: "text-sky-400", bg: "bg-sky-500/10" };
          return (
            <Card key={p.platform} className="bg-card/50 border-border/30">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded ${cfg.bg} flex items-center justify-center`}>
                  <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{cfg.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.details || (p.connected ? "Connected" : "Not connected")}</p>
                </div>
                <div className={`h-2 w-2 rounded-full ${p.connected ? "bg-emerald-400" : "bg-red-400"}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 w-full sm:w-auto">
          <TabsTrigger value="campaigns" className="flex-1 sm:flex-initial">Campaigns</TabsTrigger>
          <TabsTrigger value="sequences" className="gap-1.5 flex-1 sm:flex-initial">
            <Zap className="h-3 w-3" /> Sequences
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 sm:flex-initial">Templates</TabsTrigger>
        </TabsList>

        {/* ─── Campaigns Tab ─── */}
        <TabsContent value="campaigns" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card border-border/50"><CardContent className="p-5"><div className="h-16 bg-muted/30 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : campaigns?.length ? (
            campaigns.map((c) => {
              const ch = CHANNEL_CONFIG[c.channel] || CHANNEL_CONFIG.email;
              const Icon = ch.icon;
              const metrics = c.metrics ? (typeof c.metrics === "string" ? JSON.parse(c.metrics) : c.metrics) : null;
              return (
                <Card key={c.id} className="bg-card border-border/50 card-hover">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${ch.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">{c.name}</p>
                        <Badge className={`text-[10px] ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ch.label} via {ch.platform} &middot; {c.audienceCount || 0} recipients
                        {metrics?.sent ? ` · ${metrics.sent} sent` : ""}
                        {metrics?.failed ? ` · ${metrics.failed} failed` : ""}
                        {" · "}
                        {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : "—"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {c.status === "draft" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openLaunch(c)}>
                          <Send className="h-3 w-3" /> Launch
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete campaign?")) deleteCampaign.mutate({ id: c.id }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="p-12 text-center">
                <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No campaigns yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create your first campaign to start outreach.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Sequences Tab (Multi-Platform Orchestration) ─── */}
        <TabsContent value="sequences" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Multi-step, multi-platform outreach sequences.</p>
            <Button size="sm" className="gap-2" onClick={() => {
              setSeqForm({ name: "", steps: [{ channel: "email", body: "", subject: "", delayMs: 0 }], contactIds: [] });
              setSeqOpen(true);
            }}>
              <Zap className="h-3.5 w-3.5" /> New Sequence
            </Button>
          </div>

          {sequences?.length ? (
            sequences.map((seq) => (
              <Card key={seq.id} className="bg-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{seq.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {seq.contactCount} contacts · {seq.totalSteps} steps · Step {seq.currentStep + 1}/{seq.totalSteps}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${STATUS_COLORS[seq.status] || STATUS_COLORS.draft}`}>{seq.status}</Badge>
                      {seq.status === "running" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelSequence.mutate({ sequenceId: seq.id })}>
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Step progress */}
                  <div className="flex items-center gap-1">
                    {seq.stepResults?.map((r, i) => {
                      const ch = CHANNEL_CONFIG[r.channel] || CHANNEL_CONFIG.email;
                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div className={`h-6 px-2 rounded text-[10px] flex items-center gap-1 ${r.sent > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                            {r.channel} {r.sent}/{r.sent + r.failed}
                          </div>
                          {i < seq.stepResults.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                        </div>
                      );
                    })}
                    {seq.stepResults?.length < seq.totalSteps && (
                      <>
                        {seq.stepResults?.length > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                        <div className="h-6 px-2 rounded bg-muted/30 text-[10px] flex items-center text-muted-foreground">
                          {seq.totalSteps - (seq.stepResults?.length || 0)} remaining
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="p-12 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No sequences yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create a multi-step sequence to coordinate outreach across Email, SMS, and LinkedIn.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Templates Tab ─── */}
        <TabsContent value="templates" className="mt-4 space-y-3">
          {templates?.length ? (
            templates.map((t) => {
              const ch = CHANNEL_CONFIG[t.channel] || CHANNEL_CONFIG.email;
              return (
                <Card key={t.id} className="bg-card border-border/50 card-hover">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${ch.color}`}>
                      <ch.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{ch.label} · {t.body?.length || 0} chars</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No templates yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Create Campaign Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>Create a single-channel campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q2 Outreach" /></div>
            <div><Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as Channel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email (GHL)</SelectItem>
                  <SelectItem value="sms">SMS (SMS-iT)</SelectItem>
                  <SelectItem value="linkedin">LinkedIn (Dripify)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createCampaign.mutate({ name: form.name || "", channel: form.channel })} disabled={createCampaign.isPending}>
              {createCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Launch Campaign Dialog ─── */}
      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Launch: {launchCampaignData?.name}</DialogTitle>
            <DialogDescription>Compose and send to your audience.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(launchCampaignData?.channel === "email") && (
              <div><Label>Subject</Label><Input value={launchForm.subject} onChange={(e) => setLaunchForm({ ...launchForm, subject: e.target.value })} placeholder="Subject line" /></div>
            )}
            <div><Label>Message Body</Label><Textarea rows={5} value={launchForm.body} onChange={(e) => setLaunchForm({ ...launchForm, body: e.target.value })} placeholder="Your message..." /></div>
            <Alert><AlertDescription className="text-xs">Sending to {launchForm.contactIds?.length || contactData?.total || 0} contacts via {(launchCampaignData?.channel && CHANNEL_CONFIG[launchCampaignData.channel]?.platform) || "platform"}.</AlertDescription></Alert>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLaunchOpen(false)}>Cancel</Button>
            <Button onClick={handleLaunch} disabled={launchCampaign.isPending}>
              {launchCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" /> Send Now</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── New Sequence Dialog ─── */}
      <Dialog open={seqOpen} onOpenChange={setSeqOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>New Multi-Platform Sequence</DialogTitle>
            <DialogDescription>Build a multi-step outreach sequence across Email, SMS, and LinkedIn.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Sequence Name</Label><Input value={seqForm.name} onChange={(e) => setSeqForm({ ...seqForm, name: e.target.value })} placeholder="Q2 Multi-Touch Outreach" /></div>

            <div className="space-y-3">
              <Label>Steps</Label>
              {seqForm.steps.map((step, idx) => (
                <Card key={idx} className="bg-muted/20 border-border/30">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">Step {idx + 1}</Badge>
                        <Select value={step.channel} onValueChange={(v) => updateSeqStep(idx, "channel", v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email (GHL)</SelectItem>
                            <SelectItem value="sms">SMS (SMS-iT)</SelectItem>
                            <SelectItem value="linkedin">LinkedIn (Dripify)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        {idx > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <Select value={String(step.delayMs)} onValueChange={(v) => updateSeqStep(idx, "delayMs", Number(v))}>
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">No delay</SelectItem>
                                <SelectItem value="3600000">1 hour</SelectItem>
                                <SelectItem value="86400000">1 day</SelectItem>
                                <SelectItem value="172800000">2 days</SelectItem>
                                <SelectItem value="604800000">1 week</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {seqForm.steps.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSeqStep(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {step.channel === "email" && (
                      <Input className="h-7 text-xs" value={step.subject || ""} onChange={(e) => updateSeqStep(idx, "subject", e.target.value)} placeholder="Email subject" />
                    )}
                    <Textarea rows={2} className="text-xs" value={step.body} onChange={(e) => updateSeqStep(idx, "body", e.target.value)} placeholder={`${step.channel === "email" ? "Email" : step.channel === "sms" ? "SMS" : "LinkedIn"} message...`} />
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" size="sm" className="w-full gap-1" onClick={addSeqStep}>
                <Plus className="h-3 w-3" /> Add Step
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Sending to {seqForm.contactIds.length > 0 ? seqForm.contactIds.length : contactData?.total || 0} contacts across {new Set(seqForm.steps.map((s) => s.channel)).size} platform{new Set(seqForm.steps.map((s) => s.channel)).size > 1 ? "s" : ""}.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSeqOpen(false)}>Cancel</Button>
            <Button onClick={handleStartSequence} disabled={startSequence.isPending}>
              {startSequence.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" /> Start Sequence</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Template Dialog ─── */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={tplForm.name || ""} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} /></div>
            <div><Label>Channel</Label>
              <Select value={tplForm.channel} onValueChange={(v) => setTplForm({ ...tplForm, channel: v as "email" | "linkedin" | "sms" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tplForm.channel === "email" && <div><Label>Subject</Label><Input value={tplForm.subject || ""} onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} /></div>}
            <div><Label>Body</Label><Textarea rows={4} value={tplForm.body || ""} onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button onClick={() => createTemplate.mutate({ name: tplForm.name || "", channel: tplForm.channel, subject: tplForm.subject, body: tplForm.body })} disabled={createTemplate.isPending}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
