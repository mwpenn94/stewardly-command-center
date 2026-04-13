import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

const TIMELINE_CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  linkedin: Linkedin,
  social_facebook: Facebook,
  social_instagram: Instagram,
  social_twitter: Twitter,
  social_tiktok: Video,
  call_inbound: PhoneIncoming,
  call_outbound: PhoneOutgoing,
  direct_mail: Send,
  webform: Globe,
  chat: MessageCircle,
  event: Calendar,
};
const TIMELINE_CHANNEL_COLORS: Record<string, string> = {
  email: "text-blue-400 bg-blue-500/10",
  sms: "text-emerald-400 bg-emerald-500/10",
  linkedin: "text-sky-400 bg-sky-500/10",
  social_facebook: "text-blue-500 bg-blue-500/10",
  social_instagram: "text-pink-400 bg-pink-500/10",
  social_twitter: "text-sky-500 bg-sky-500/10",
  social_tiktok: "text-fuchsia-400 bg-fuchsia-500/10",
  call_inbound: "text-green-400 bg-green-500/10",
  call_outbound: "text-orange-400 bg-orange-500/10",
  direct_mail: "text-amber-400 bg-amber-500/10",
  webform: "text-indigo-400 bg-indigo-500/10",
  chat: "text-teal-400 bg-teal-500/10",
  event: "text-rose-400 bg-rose-500/10",
};
import {
  Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Tag, X, Users, RefreshCw,
  ExternalLink, Mail, Phone, Building2, MapPin, Eye, MessageSquare, Linkedin, Clock,
  PhoneIncoming, PhoneOutgoing, Globe, MessageCircle, Calendar, Facebook, Instagram,
  Twitter, Video, Send, ArrowDownLeft, ArrowUpRight, Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import QueryError from "@/components/QueryError";

const SEGMENTS = ["all", "residential", "commercial", "agricultural", "cpa_tax", "estate_attorney", "hr_benefits", "insurance", "nonprofit", "other"];
const TIERS = ["all", "gold", "silver", "bronze", "unscored"];
const SEGMENT_LABELS: Record<string, string> = {
  residential: "Residential", commercial: "Commercial", agricultural: "Agricultural",
  cpa_tax: "CPA/Tax", estate_attorney: "Estate Attorney", hr_benefits: "HR/Benefits",
  insurance: "Insurance", nonprofit: "Nonprofit", other: "Other",
};
const TIER_COLORS: Record<string, string> = {
  gold: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  silver: "bg-muted/50 text-muted-foreground border-border/50",
  bronze: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  unscored: "bg-muted text-muted-foreground border-border",
};

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [tier, setTier] = useState("all");
  const [page, setPage] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<any>(null);
  const limit = 25;

  const queryInput = useMemo(() => ({
    search: search || undefined,
    segment: segment !== "all" ? segment : undefined,
    tier: tier !== "all" ? tier : undefined,
    limit,
    offset: page * limit,
  }), [search, segment, tier, page]);

  const { data, isLoading, error: contactsError, refetch } = trpc.contacts.list.useQuery(queryInput);
  const createMut = trpc.contacts.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("Contact created"); }, onError: (err) => toast.error(err.message) });
  const updateMut = trpc.contacts.update.useMutation({ onSuccess: () => { refetch(); setEditOpen(false); toast.success("Contact updated"); }, onError: (err) => toast.error(err.message) });
  const deleteMut = trpc.contacts.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Contact deleted"); }, onError: (err) => toast.error(err.message) });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  const [form, setForm] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const openCreate = () => { setForm({}); setFormErrors({}); setCreateOpen(true); };
  const openEdit = (c: any) => {
    let tags: string[] = [];
    try { tags = c.tags ? (typeof c.tags === "string" ? JSON.parse(c.tags) : c.tags) : []; } catch { tags = []; }
    setForm({ ...c, tags }); setFormErrors({}); setEditContact(c); setEditOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.firstName?.trim() && !form.lastName?.trim() && !form.email?.trim()) {
      errors.firstName = "Name or email is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Invalid email format";
    }
    if (form.phone && !/^[\d\s\-+().]{7,20}$/.test(form.phone)) {
      errors.phone = "Invalid phone format";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    if (editContact) {
      updateMut.mutate({ id: editContact.id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total !== undefined ? `${data.total.toLocaleString()} contacts` : "Loading..."}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2 min-h-[44px] sm:min-h-0 shrink-0">
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 bg-muted/30 border-border/50"
              />
            </div>
            <Select value={segment} onValueChange={(v) => { setSegment(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Segments" : SEGMENT_LABELS[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(v) => { setTier(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[140px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{t === "all" ? "All Tiers" : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact List — Mobile cards + Desktop table */}
      {contactsError ? (
        <QueryError message="Failed to load contacts. Check your connection." onRetry={() => refetch()} />
      ) : (
      <Card className="bg-card border-border/50 overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : data?.contacts?.length ? (
            <div className="divide-y divide-border/30">
              {data.contacts.map((c: any) => (
                <button key={c.id} className="w-full text-left p-4 hover:bg-muted/10 transition-colors" onClick={() => setDetailContact(c)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                        </p>
                        <Badge className={`text-[9px] capitalize shrink-0 ${TIER_COLORS[c.tier] || TIER_COLORS.unscored}`}>{c.tier}</Badge>
                      </div>
                      {c.companyName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.companyName}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {c.email && <span className="truncate">{c.email}</span>}
                        {c.phone && <span className="tabular-nums shrink-0">{c.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                      <div className={`h-5 px-1 rounded text-[8px] flex items-center ${c.ghlContactId ? "bg-blue-500/15 text-blue-400" : "bg-muted/30 text-muted-foreground/30"}`}>GHL</div>
                      <div className={`h-5 px-1 rounded text-[8px] flex items-center ${c.phone ? "bg-emerald-500/15 text-emerald-400" : "bg-muted/30 text-muted-foreground/30"}`}>SMS</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[9px] capitalize">{SEGMENT_LABELS[c.segment] || c.segment}</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 sm:p-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No contacts found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Import contacts or create one to get started.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Segment</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tier</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Platforms</th>
                <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-3"><div className="h-4 bg-muted/30 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.contacts?.length ? (
                data.contacts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="p-3">
                      <button className="text-left group" onClick={() => setDetailContact(c)}>
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                        </div>
                        {c.companyName && <div className="text-xs text-muted-foreground mt-0.5">{c.companyName}</div>}
                      </button>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="p-3 text-muted-foreground tabular-nums">{c.phone || "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{SEGMENT_LABELS[c.segment] || c.segment}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-[10px] capitalize ${TIER_COLORS[c.tier] || TIER_COLORS.unscored}`}>{c.tier}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <div className={`h-5 px-1.5 rounded text-[9px] flex items-center ${c.ghlContactId ? "bg-blue-500/15 text-blue-400" : "bg-muted/30 text-muted-foreground/30"}`}>GHL</div>
                        <div className={`h-5 px-1.5 rounded text-[9px] flex items-center ${c.phone ? "bg-emerald-500/15 text-emerald-400" : "bg-muted/30 text-muted-foreground/30"}`}>SMS</div>
                        <div className={`h-5 px-1.5 rounded text-[9px] flex items-center ${c.linkedinUrl ? "bg-sky-500/15 text-sky-400" : "bg-muted/30 text-muted-foreground/30"}`}>LI</div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailContact(c)} title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={deleteMut.isPending} onClick={() => { if (confirm("Delete this contact?")) deleteMut.mutate({ id: c.id }); }} title="Delete">
                          {deleteMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 sm:p-12 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No contacts found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Import contacts or create one to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-11 w-11 sm:h-7 sm:w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11 sm:h-7 sm:w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || editOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditOpen(false); } }}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editContact ? "Edit Contact" : "New Contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">First Name {!editContact && <span className="text-destructive">*</span>}</Label>
              <Input value={form.firstName || ""} onChange={(e) => { setForm({ ...form, firstName: e.target.value }); setFormErrors({ ...formErrors, firstName: "" }); }} className={`bg-muted/30 ${formErrors.firstName ? "border-destructive" : ""}`} />
              {formErrors.firstName && <p className="text-[10px] text-destructive">{formErrors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={form.email || ""} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({ ...formErrors, email: "" }); }} className={`bg-muted/30 ${formErrors.email ? "border-destructive" : ""}`} type="email" />
              {formErrors.email && <p className="text-[10px] text-destructive">{formErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={form.phone || ""} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFormErrors({ ...formErrors, phone: "" }); }} className={`bg-muted/30 ${formErrors.phone ? "border-destructive" : ""}`} type="tel" />
              {formErrors.phone && <p className="text-[10px] text-destructive">{formErrors.phone}</p>}
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input value={form.companyName || ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Segment</Label>
              <Select value={form.segment || "other"} onValueChange={(v) => setForm({ ...form, segment: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.filter(s => s !== "all").map(s => (
                    <SelectItem key={s} value={s}>{SEGMENT_LABELS[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tier</Label>
              <Select value={form.tier || "unscored"} onValueChange={(v) => setForm({ ...form, tier: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.filter(t => t !== "all").map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="flex gap-2">
              <div className="space-y-2 w-16">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-muted/30" maxLength={2} />
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-xs text-muted-foreground">Zip</Label>
                <Input value={form.postalCode || ""} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="bg-muted/30" />
              </div>
            </div>
          </div>
          {/* GHL Sync Toggle */}
          <div className="flex items-center justify-between px-1 py-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">Sync to GoHighLevel</p>
                <p className="text-[10px] text-muted-foreground">Create/update this contact in GHL when saving</p>
              </div>
            </div>
            <Switch
              checked={form.syncToGhl !== false}
              onCheckedChange={(v) => setForm({ ...form, syncToGhl: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditOpen(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Contact Detail Dialog */}
      <Dialog open={!!detailContact} onOpenChange={(o) => { if (!o) setDetailContact(null); }}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                {detailContact?.firstName?.charAt(0)?.toUpperCase() || detailContact?.email?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div>{[detailContact?.firstName, detailContact?.lastName].filter(Boolean).join(" ") || "Unknown"}</div>
                {detailContact?.companyName && (
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">{detailContact.companyName}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full bg-muted/30">
              <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="channels" className="flex-1">Channels</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 py-2">
              {/* Contact Info */}
              <div className="space-y-2">
                {detailContact?.email && (
                  <div className="flex items-center gap-3 min-h-[36px]">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${detailContact.email}`} className="text-sm text-foreground hover:text-primary transition-colors truncate">
                      {detailContact.email}
                    </a>
                  </div>
                )}
                {detailContact?.phone && (
                  <div className="flex items-center gap-3 min-h-[36px]">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${detailContact.phone}`} className="text-sm text-foreground hover:text-primary transition-colors">
                      {detailContact.phone}
                    </a>
                  </div>
                )}
                {(detailContact?.address || detailContact?.city) && (
                  <div className="flex items-center gap-3 min-h-[36px]">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">
                      {[detailContact.address, detailContact.city, detailContact.state, detailContact.postalCode].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
              <Separator />
              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Segment</p>
                  <Badge variant="outline" className="text-xs capitalize">{SEGMENT_LABELS[detailContact?.segment] || detailContact?.segment || "—"}</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tier</p>
                  <Badge className={`text-xs capitalize ${TIER_COLORS[detailContact?.tier] || TIER_COLORS.unscored}`}>{detailContact?.tier || "unscored"}</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Score</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">{detailContact?.propensityScore || detailContact?.overallScore || "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sync Status</p>
                  <p className="text-sm font-medium text-foreground capitalize">{detailContact?.syncStatus || "unknown"}</p>
                </div>
              </div>
              {/* Tags */}
              {detailContact?.tags && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((() => { try { return typeof detailContact.tags === "string" ? JSON.parse(detailContact.tags) : detailContact.tags; } catch { return []; } })()).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="py-2">
              <ContactTimeline contactId={detailContact?.id} />
            </TabsContent>

            <TabsContent value="channels" className="py-2">
              {/* Platform Connections */}
              <div className="space-y-2">
                <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${detailContact?.ghlContactId ? "border-blue-500/20 bg-blue-500/5" : "border-border/30 bg-muted/5"}`}>
                  <div className={`h-2 w-2 rounded-full ${detailContact?.ghlContactId ? "bg-blue-400" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">GoHighLevel</p>
                    <p className="text-[10px] text-muted-foreground truncate">{detailContact?.ghlContactId ? `ID: ${detailContact.ghlContactId}` : "Not synced"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Email, Calls, Social, Forms, Chat</Badge>
                </div>
                <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${detailContact?.phone ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/30 bg-muted/5"}`}>
                  <div className={`h-2 w-2 rounded-full ${detailContact?.phone ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">SMS-iT</p>
                    <p className="text-[10px] text-muted-foreground">{detailContact?.phone ? "Ready (has phone)" : "No phone number"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">SMS/MMS</Badge>
                </div>
                <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${detailContact?.linkedinUrl ? "border-sky-500/20 bg-sky-500/5" : "border-border/30 bg-muted/5"}`}>
                  <div className={`h-2 w-2 rounded-full ${detailContact?.linkedinUrl ? "bg-sky-400" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">LinkedIn / Dripify</p>
                    <p className="text-[10px] text-muted-foreground truncate">{detailContact?.linkedinUrl || detailContact?.dripifyProfileUrl || "Not connected"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">LinkedIn</Badge>
                </div>
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground mb-2">Channel Reach Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(TIMELINE_CHANNEL_ICONS).map(([channel, Icon]) => {
                  const colors = TIMELINE_CHANNEL_COLORS[channel] || "text-muted-foreground bg-muted/10";
                  const [textColor, bgColor] = colors.split(" ");
                  const reachable = (channel === "email" && detailContact?.email) ||
                    (channel === "sms" && detailContact?.phone) ||
                    (channel === "linkedin" && (detailContact?.linkedinUrl || detailContact?.dripifyProfileUrl)) ||
                    channel === "webform" || channel === "chat" || channel === "event";
                  return (
                    <div key={channel} className={`flex items-center gap-1.5 p-2 rounded-lg border ${reachable ? "border-border/40" : "border-border/20 opacity-40"}`}>
                      <div className={`h-5 w-5 rounded flex items-center justify-center ${bgColor}`}>
                        <Icon className={`h-3 w-3 ${textColor}`} />
                      </div>
                      <span className="text-[10px] text-foreground capitalize truncate">{channel.replace("_", " ").replace("social ", "")}</span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDetailContact(null); openEdit(detailContact); }} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setDetailContact(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactTimeline({ contactId }: { contactId?: number }) {
  const { data, isLoading } = trpc.interactions.list.useQuery(
    { contactId: contactId || 0, limit: 30 },
    { enabled: !!contactId }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const interactions = data?.interactions || [];

  if (interactions.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No interactions recorded yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Interactions from all channels will appear here as a unified timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {interactions.map((interaction) => {
        const Icon = TIMELINE_CHANNEL_ICONS[interaction.channel] || Mail;
        const colors = TIMELINE_CHANNEL_COLORS[interaction.channel] || "text-muted-foreground bg-muted/10";
        const [textColor, bgColor] = colors.split(" ");
        return (
          <div key={interaction.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/10 transition-colors">
            <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 mt-0.5 ${bgColor}`}>
              <Icon className={`h-3.5 w-3.5 ${textColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground capitalize">
                  {interaction.type.replace(/_/g, " ")}
                </span>
                {interaction.direction === "inbound" ? (
                  <ArrowDownLeft className="h-3 w-3 text-green-400" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-blue-400" />
                )}
                <Badge variant="outline" className="text-[9px] capitalize">{interaction.channel.replace(/_/g, " ")}</Badge>
              </div>
              {interaction.subject && (
                <p className="text-xs text-foreground mt-0.5 truncate">{interaction.subject}</p>
              )}
              {interaction.body && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{interaction.body}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {interaction.createdAt ? formatDistanceToNow(new Date(interaction.createdAt), { addSuffix: true }) : "—"}
                {interaction.platform && ` · via ${interaction.platform}`}
              </p>
            </div>
            {interaction.sentiment && (
              <Badge variant="outline" className={`text-[9px] shrink-0 ${
                interaction.sentiment === "positive" ? "text-green-400 border-green-400/30" :
                interaction.sentiment === "negative" ? "text-red-400 border-red-400/30" :
                "text-muted-foreground"
              }`}>{interaction.sentiment}</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
