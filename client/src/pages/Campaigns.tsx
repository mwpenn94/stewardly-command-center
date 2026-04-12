import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Megaphone, Mail, MessageSquare, Linkedin, Layers, Pencil, Trash2, Play, Pause } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHANNEL_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "text-blue-400" },
  sms: { icon: MessageSquare, label: "SMS (SMS-iT)", color: "text-emerald-400" },
  linkedin: { icon: Linkedin, label: "LinkedIn (Dripify)", color: "text-sky-400" },
  multi: { icon: Layers, label: "Multi-Channel", color: "text-violet-400" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/15 text-blue-400",
  running: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-amber-500/15 text-amber-400",
  completed: "bg-primary/15 text-primary",
  failed: "bg-red-500/15 text-red-400",
};

export default function Campaigns() {
  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
  const createCampaign = trpc.campaigns.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("Campaign created"); } });
  const deleteCampaign = trpc.campaigns.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Campaign deleted"); } });
  const createTemplate = trpc.templates.create.useMutation({ onSuccess: () => { toast.success("Template saved"); } });

  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [form, setForm] = useState<any>({ channel: "email" });
  const [tplForm, setTplForm] = useState<any>({ channel: "email" });
  const [tab, setTab] = useState("campaigns");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Campaign Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Build and launch multi-channel outreach campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTplForm({ channel: "email" }); setTemplateOpen(true); }}>
            New Template
          </Button>
          <Button size="sm" className="gap-2" onClick={() => { setForm({ channel: "email" }); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card border-border/50"><CardContent className="p-5"><div className="h-16 bg-muted/30 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : campaigns?.length ? (
            campaigns.map((c: any) => {
              const ch = CHANNEL_CONFIG[c.channel] || CHANNEL_CONFIG.email;
              const Icon = ch.icon;
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
                        {ch.label} &middot; {c.audienceCount || 0} recipients &middot; {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : "—"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
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

        <TabsContent value="templates" className="mt-4 space-y-3">
          {templates?.length ? (
            templates.map((t: any) => {
              const ch = CHANNEL_CONFIG[t.channel] || CHANNEL_CONFIG.email;
              return (
                <Card key={t.id} className="bg-card border-border/50 card-hover">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${ch.color}`}>
                      <ch.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ch.label} {t.subject ? `· ${t.subject}` : ""}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No templates yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-foreground">New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Campaign Name</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/30" placeholder="Q2 Outreach — Commercial" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email (GHL)</SelectItem>
                  <SelectItem value="sms">SMS (SMS-iT)</SelectItem>
                  <SelectItem value="linkedin">LinkedIn (Dripify)</SelectItem>
                  <SelectItem value="multi">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createCampaign.mutate(form)} disabled={!form.name || createCampaign.isPending}>
              {createCampaign.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader><DialogTitle className="text-foreground">New Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Template Name</Label>
              <Input value={tplForm.name || ""} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Channel</Label>
              <Select value={tplForm.channel} onValueChange={(v) => setTplForm({ ...tplForm, channel: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tplForm.channel === "email" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Subject Line</Label>
                <Input value={tplForm.subject || ""} onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} className="bg-muted/30" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Body</Label>
              <Textarea value={tplForm.body || ""} onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} className="bg-muted/30 min-h-[120px]" placeholder="Use {{firstName}}, {{companyName}} for variables..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button onClick={() => { createTemplate.mutate(tplForm); setTemplateOpen(false); }} disabled={!tplForm.name}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
