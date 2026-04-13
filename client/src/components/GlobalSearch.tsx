import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Search, Users, X, Megaphone, ArrowRight, Upload, RefreshCw, BarChart3,
  Sparkles, Archive, Activity, Settings, Brain, Radio, Plug,
  type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface NavItem { label: string; path: string; icon: LucideIcon; keywords: string[]; color: string }

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: BarChart3, keywords: ["home", "dashboard", "overview", "stats"], color: "text-blue-400" },
  { label: "Contacts", path: "/contacts", icon: Users, keywords: ["contacts", "people", "crm", "leads"], color: "text-blue-400" },
  { label: "Campaign Studio", path: "/campaigns", icon: Megaphone, keywords: ["campaigns", "outreach", "sequences", "flow", "templates"], color: "text-emerald-400" },
  { label: "Bulk Import", path: "/import", icon: Upload, keywords: ["import", "csv", "upload", "bulk"], color: "text-amber-400" },
  { label: "Sync Engine", path: "/sync", icon: RefreshCw, keywords: ["sync", "queue", "scheduler", "dlq"], color: "text-violet-400" },
  { label: "Integrations", path: "/integrations", icon: Plug, keywords: ["integrations", "ghl", "smsit", "dripify", "api", "credentials"], color: "text-sky-400" },
  { label: "Analytics", path: "/analytics", icon: BarChart3, keywords: ["analytics", "metrics", "funnel", "performance"], color: "text-indigo-400" },
  { label: "Enrichment", path: "/enrichment", icon: Sparkles, keywords: ["enrichment", "data", "completeness", "pdl"], color: "text-pink-400" },
  { label: "Backups", path: "/backups", icon: Archive, keywords: ["backups", "export", "mirror", "restore"], color: "text-teal-400" },
  { label: "Activity Feed", path: "/activity", icon: Activity, keywords: ["activity", "log", "audit", "events"], color: "text-orange-400" },
  { label: "AI Insights", path: "/ai-insights", icon: Brain, keywords: ["ai", "insights", "recommendations", "predictions", "scoring", "health"], color: "text-fuchsia-400" },
  { label: "Channels", path: "/channels", icon: Radio, keywords: ["channels", "email", "sms", "linkedin", "social", "voice", "mail"], color: "text-rose-400" },
  { label: "Settings", path: "/settings", icon: Settings, keywords: ["settings", "preferences", "theme", "notifications"], color: "text-muted-foreground" },
];

export default function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: contactResults } = trpc.contacts.list.useQuery(
    { search: query, limit: 5 },
    { enabled: query.length >= 2 }
  );

  const { data: campaignResults } = trpc.campaigns.list.useQuery(
    undefined,
    { enabled: query.length >= 2 }
  );

  // Filter campaigns client-side
  const filteredCampaigns = (campaignResults || [])
    .filter((c: { name?: string }) => c.name?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  // Filter nav items by query
  const matchedNavItems = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return NAV_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    ).slice(0, 5);
  }, [query]);

  const hasResults = (contactResults?.contacts?.length || 0) > 0 || filteredCampaigns.length > 0 || matchedNavItems.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateTo = (path: string) => {
    setLocation(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={compact ? "Search..." : "Search contacts, campaigns, pages..."}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          className={`pl-8 bg-muted/30 border-border/50 text-sm ${compact ? "h-9" : "h-8"}`}
        />
        {!compact && (
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 border border-border/30 rounded px-1 py-0.5 hidden sm:inline">
            ⌘K
          </kbd>
        )}
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground sm:hidden"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden max-h-[320px] overflow-y-auto">
          {!hasResults ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            <>
              {/* Contacts */}
              {contactResults?.contacts?.length ? (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                    Contacts
                  </div>
                  {contactResults.contacts.map((c: { id: number; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null }) => (
                    <button
                      key={c.id}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors min-h-[40px]"
                      onClick={() => navigateTo("/contacts")}
                    >
                      <Users className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.email || ""} {c.phone ? `· ${c.phone}` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                  {(contactResults.total || 0) > 5 && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-primary hover:bg-accent/50 transition-colors"
                      onClick={() => navigateTo("/contacts")}
                    >
                      <ArrowRight className="h-3 w-3" />
                      View all {contactResults.total} results
                    </button>
                  )}
                </div>
              ) : null}

              {/* Quick Navigation */}
              {matchedNavItems.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                    Pages
                  </div>
                  {matchedNavItems.map((item) => (
                    <button
                      key={item.path}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors min-h-[40px]"
                      onClick={() => navigateTo(item.path)}
                    >
                      <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                      <p className="text-sm text-foreground">{item.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Campaigns */}
              {filteredCampaigns.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                    Campaigns
                  </div>
                  {filteredCampaigns.map((c: { id: number; name?: string; channel?: string; status?: string }) => (
                    <button
                      key={c.id}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors min-h-[40px]"
                      onClick={() => navigateTo("/campaigns")}
                    >
                      <Megaphone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.channel} · {c.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
