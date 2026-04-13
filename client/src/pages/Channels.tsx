import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import {
  Mail, MessageSquare, Linkedin, Phone, PhoneIncoming, PhoneOutgoing,
  Globe, MessageCircle, Calendar, Facebook, Instagram, Twitter, Video,
  Send, Settings2, Zap, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ChannelDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  category: string;
  description: string;
  providers: { value: string; label: string }[];
}

const CHANNELS: ChannelDef[] = [
  {
    key: "email", label: "Email", icon: Mail, color: "text-blue-400", bg: "bg-blue-500/10",
    category: "Messaging", description: "Email campaigns, drip sequences, newsletters, transactional",
    providers: [{ value: "ghl", label: "GoHighLevel" }, { value: "sendgrid", label: "SendGrid" }, { value: "ses", label: "Amazon SES" }],
  },
  {
    key: "sms", label: "SMS/MMS", icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10",
    category: "Messaging", description: "Outbound campaigns, two-way conversations, automated follow-ups",
    providers: [{ value: "smsit", label: "SMS-iT" }, { value: "twilio", label: "Twilio" }, { value: "ghl", label: "GoHighLevel" }],
  },
  {
    key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-sky-400", bg: "bg-sky-500/10",
    category: "Social", description: "Connection requests, messaging sequences, profile engagement",
    providers: [{ value: "dripify", label: "Dripify" }, { value: "phantombuster", label: "PhantomBuster" }],
  },
  {
    key: "social_facebook", label: "Facebook", icon: Facebook, color: "text-blue-500", bg: "bg-blue-500/10",
    category: "Social", description: "Page posting, ad campaigns, Messenger outreach, engagement tracking",
    providers: [{ value: "ghl_social", label: "GHL Social" }, { value: "buffer", label: "Buffer" }, { value: "hootsuite", label: "Hootsuite" }],
  },
  {
    key: "social_instagram", label: "Instagram", icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10",
    category: "Social", description: "Content scheduling, DM outreach, story engagement, hashtag tracking",
    providers: [{ value: "ghl_social", label: "GHL Social" }, { value: "buffer", label: "Buffer" }],
  },
  {
    key: "social_twitter", label: "Twitter/X", icon: Twitter, color: "text-sky-300", bg: "bg-sky-300/10",
    category: "Social", description: "Tweet scheduling, DM campaigns, engagement monitoring",
    providers: [{ value: "ghl_social", label: "GHL Social" }, { value: "buffer", label: "Buffer" }],
  },
  {
    key: "social_tiktok", label: "TikTok", icon: Video, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10",
    category: "Social", description: "Content scheduling, audience engagement, trend monitoring",
    providers: [{ value: "ghl_social", label: "GHL Social" }, { value: "buffer", label: "Buffer" }],
  },
  {
    key: "call_inbound", label: "Inbound Calls", icon: PhoneIncoming, color: "text-green-400", bg: "bg-green-500/10",
    category: "Voice", description: "Call tracking, IVR routing, call recording, voicemail, lead attribution",
    providers: [{ value: "ghl_phone", label: "GHL Phone" }, { value: "twilio", label: "Twilio" }, { value: "callrail", label: "CallRail" }],
  },
  {
    key: "call_outbound", label: "Outbound Calls", icon: PhoneOutgoing, color: "text-orange-400", bg: "bg-orange-500/10",
    category: "Voice", description: "Power dialer, click-to-call, call scripts, voicemail drops",
    providers: [{ value: "ghl_phone", label: "GHL Phone" }, { value: "twilio", label: "Twilio" }],
  },
  {
    key: "direct_mail", label: "Direct Mail", icon: Send, color: "text-amber-400", bg: "bg-amber-500/10",
    category: "Physical", description: "Triggered postcards, letters, brochures coordinated with digital touchpoints",
    providers: [{ value: "lob", label: "Lob" }, { value: "postgrid", label: "PostGrid" }, { value: "thankster", label: "Thankster" }],
  },
  {
    key: "webform", label: "Webforms/Landing Pages", icon: Globe, color: "text-indigo-400", bg: "bg-indigo-500/10",
    category: "Inbound", description: "Lead capture forms, landing page performance, form-to-campaign attribution",
    providers: [{ value: "ghl_forms", label: "GHL Forms" }, { value: "typeform", label: "Typeform" }, { value: "jotform", label: "Jotform" }],
  },
  {
    key: "chat", label: "Chat/Webchat", icon: MessageCircle, color: "text-teal-400", bg: "bg-teal-500/10",
    category: "Messaging", description: "Live chat, chatbot, website visitor engagement, proactive messaging",
    providers: [{ value: "ghl_chat", label: "GHL Chat" }, { value: "intercom", label: "Intercom" }, { value: "drift", label: "Drift" }],
  },
  {
    key: "event", label: "Events/Webinars", icon: Calendar, color: "text-rose-400", bg: "bg-rose-500/10",
    category: "Events", description: "Registration, attendance tracking, follow-up sequences, reminders",
    providers: [{ value: "ghl_calendar", label: "GHL Calendar" }, { value: "zoom", label: "Zoom Webinars" }, { value: "eventbrite", label: "Eventbrite" }],
  },
];

const CATEGORIES = ["Messaging", "Social", "Voice", "Physical", "Inbound", "Events"];

export default function Channels() {
  const { data: configs, isLoading, refetch } = trpc.channels.list.useQuery();
  const upsertChannel = trpc.channels.upsert.useMutation({
    onSuccess: () => { refetch(); toast.success("Channel updated"); },
    onError: (err) => toast.error(err.message),
  });

  const [configOpen, setConfigOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelDef | null>(null);
  const [formProvider, setFormProvider] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formBudget, setFormBudget] = useState("");

  const getConfig = (key: string) => configs?.find((c: any) => c.channel === key);

  const openConfig = (ch: ChannelDef) => {
    const existing = getConfig(ch.key);
    setActiveChannel(ch);
    setFormProvider(existing?.provider || ch.providers[0]?.value || "");
    setFormLimit(existing?.dailyLimit?.toString() || "");
    setFormBudget(existing?.monthlyBudget?.toString() || "");
    setConfigOpen(true);
  };

  const handleSave = () => {
    if (!activeChannel) return;
    upsertChannel.mutate({
      channel: activeChannel.key as any,
      enabled: true,
      provider: formProvider || undefined,
      dailyLimit: formLimit ? parseInt(formLimit) : undefined,
      monthlyBudget: formBudget || undefined,
    });
    setConfigOpen(false);
  };

  const handleToggle = (ch: ChannelDef, enabled: boolean) => {
    const existing = getConfig(ch.key);
    upsertChannel.mutate({
      channel: ch.key as any,
      enabled,
      provider: existing?.provider || ch.providers[0]?.value,
    });
  };

  const enabledCount = configs?.filter((c: any) => c.enabled).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Channel Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure and manage all 13 outreach channels across your omnichannel command center.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto text-sm px-3 py-1">
          {enabledCount} / {CHANNELS.length} active
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50 animate-pulse">
              <CardContent className="p-6"><div className="h-24 bg-muted/30 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const channelsInCat = CHANNELS.filter((ch) => ch.category === cat);
          return (
            <div key={cat}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {channelsInCat.map((ch) => {
                  const cfg = getConfig(ch.key);
                  const isEnabled = cfg?.enabled || false;
                  const statusColor = cfg?.status === "active" ? "bg-emerald-400" : cfg?.status === "error" ? "bg-red-400" : "bg-muted-foreground/30";
                  return (
                    <Card key={ch.key} className={`bg-card border-border/50 transition-all ${isEnabled ? "ring-1 ring-primary/20" : "opacity-75"}`} role="region" aria-label={`${ch.label} channel configuration`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg ${ch.bg} flex items-center justify-center shrink-0`}>
                            <ch.icon className={`h-5 w-5 ${ch.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{ch.label}</p>
                                <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(v) => handleToggle(ch, v)}
                                className="shrink-0"
                                aria-label={`${isEnabled ? "Disable" : "Enable"} ${ch.label} channel`}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ch.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {cfg?.provider && (
                                <Badge variant="outline" className="text-[10px]">
                                  {ch.providers.find(p => p.value === cfg.provider)?.label || cfg.provider}
                                </Badge>
                              )}
                              {cfg?.dailyLimit && (
                                <Badge variant="outline" className="text-[10px]">{cfg.dailyLimit}/day</Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] ml-auto"
                                onClick={() => openConfig(ch)}
                              >
                                <Settings2 className="h-3 w-3 mr-1" /> Configure
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Channel Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeChannel && (
                <>
                  <div className={`h-8 w-8 rounded-lg ${activeChannel.bg} flex items-center justify-center`}>
                    <activeChannel.icon className={`h-4 w-4 ${activeChannel.color}`} />
                  </div>
                  Configure {activeChannel.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>{activeChannel?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider</Label>
              <Select value={formProvider} onValueChange={setFormProvider}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeChannel?.providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Daily Send Limit</Label>
              <Input
                type="number"
                value={formLimit}
                onChange={(e) => setFormLimit(e.target.value)}
                placeholder="e.g., 500"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Maximum sends per day (0 = unlimited)</p>
            </div>
            <div>
              <Label>Monthly Budget ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="e.g., 250.00"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Optional monthly spend cap for this channel</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertChannel.isPending}>
              {upsertChannel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
