import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Users, X, Megaphone, RefreshCw, ArrowRight, FileText, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

  const { data: templateResults } = trpc.templates.list.useQuery(
    undefined,
    { enabled: query.length >= 2 }
  );

  // Filter campaigns and templates client-side
  const filteredCampaigns = (campaignResults || [])
    .filter((c: any) => c.name?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  const filteredTemplates = (templateResults || [])
    .filter((t: any) => t.name?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  const hasResults = (contactResults?.contacts?.length || 0) > 0 || filteredCampaigns.length > 0 || filteredTemplates.length > 0;

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
          placeholder={compact ? "Search..." : "Search contacts, campaigns..."}
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
                  {contactResults.contacts.map((c: any) => (
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
                      {c.tier && c.tier !== "unscored" && (
                        <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{c.tier}</Badge>
                      )}
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

              {/* Campaigns */}
              {filteredCampaigns.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                    Campaigns
                  </div>
                  {filteredCampaigns.map((c: any) => (
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
                      <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{c.status}</Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Templates */}
              {filteredTemplates.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                    Templates
                  </div>
                  {filteredTemplates.map((t: any) => (
                    <button
                      key={t.id}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors min-h-[40px]"
                      onClick={() => navigateTo("/campaigns")}
                    >
                      <FileText className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.channel} · {t.body?.length || 0} chars</p>
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
