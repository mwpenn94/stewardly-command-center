import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Tag, X, Users, RefreshCw, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const SEGMENTS = ["all", "residential", "commercial", "agricultural", "cpa_tax", "estate_attorney", "hr_benefits", "insurance", "nonprofit", "other"];
const TIERS = ["all", "gold", "silver", "bronze", "unscored"];
const SEGMENT_LABELS: Record<string, string> = {
  residential: "Residential", commercial: "Commercial", agricultural: "Agricultural",
  cpa_tax: "CPA/Tax", estate_attorney: "Estate Attorney", hr_benefits: "HR/Benefits",
  insurance: "Insurance", nonprofit: "Nonprofit", other: "Other",
};
const TIER_COLORS: Record<string, string> = {
  gold: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  silver: "bg-slate-400/15 text-slate-300 border-slate-400/20",
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
  const limit = 25;

  const queryInput = useMemo(() => ({
    search: search || undefined,
    segment: segment !== "all" ? segment : undefined,
    tier: tier !== "all" ? tier : undefined,
    limit,
    offset: page * limit,
  }), [search, segment, tier, page]);

  const { data, isLoading, refetch } = trpc.contacts.list.useQuery(queryInput);
  const createMut = trpc.contacts.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("Contact created"); } });
  const updateMut = trpc.contacts.update.useMutation({ onSuccess: () => { refetch(); setEditOpen(false); toast.success("Contact updated"); } });
  const deleteMut = trpc.contacts.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Contact deleted"); } });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  const [form, setForm] = useState<any>({});
  const openCreate = () => { setForm({}); setCreateOpen(true); };
  const openEdit = (c: any) => { setForm({ ...c, tags: c.tags ? (typeof c.tags === "string" ? JSON.parse(c.tags) : c.tags) : [] }); setEditContact(c); setEditOpen(true); };

  const handleSave = () => {
    if (editContact) {
      updateMut.mutate({ id: editContact.id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total !== undefined ? `${data.total.toLocaleString()} contacts` : "Loading..."}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
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
              <SelectTrigger className="w-[160px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Segments" : SEGMENT_LABELS[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(v) => { setTier(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] bg-muted/30 border-border/50">
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

      {/* Table */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Segment</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tier</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Sync</th>
                <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-3"><div className="h-4 bg-muted/30 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.contacts?.length ? (
                data.contacts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-foreground">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                      </div>
                      {c.companyName && <div className="text-xs text-muted-foreground mt-0.5">{c.companyName}</div>}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="p-3 text-muted-foreground tabular-nums">{c.phone || "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{SEGMENT_LABELS[c.segment] || c.segment}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-[10px] capitalize ${TIER_COLORS[c.tier] || TIER_COLORS.unscored}`}>{c.tier}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground tabular-nums">{c.propensityScore || "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${c.syncStatus === "synced" ? "bg-emerald-400" : c.syncStatus === "error" ? "bg-red-400" : c.syncStatus === "pending" ? "bg-amber-400" : "bg-muted-foreground/30"}`} />
                        {c.ghlContactId && (
                          <span className="text-[9px] text-muted-foreground/50 font-mono">{c.ghlContactId.slice(0, 8)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this contact?")) deleteMut.mutate({ id: c.id }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
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
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || editOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditOpen(false); } }}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editContact ? "Edit Contact" : "New Contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-muted/30" />
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
    </div>
  );
}
