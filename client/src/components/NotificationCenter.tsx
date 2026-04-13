import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useState } from "react";

const severityIcons: Record<string, any> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const severityColors: Record<string, string> = {
  success: "text-emerald-400",
  info: "text-blue-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

const typeRoutes: Record<string, string> = {
  sync: "/sync",
  import: "/import",
  campaign: "/campaigns",
  webhook: "/sync",
  enrichment: "/enrichment",
  backup: "/backups",
  system: "/activity",
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { data } = trpc.activity.list.useQuery(
    { limit: 10 },
    { refetchInterval: 30000 }
  );

  const notifications = data?.entries || [];
  const unreadCount = notifications.filter(
    (n: any) => n.severity === "error" || n.severity === "warning"
  ).length;

  const handleClick = (type: string) => {
    setOpen(false);
    setLocation(typeRoutes[type] || "/activity");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {unreadCount} alert{unreadCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((n: any) => {
              const Icon = severityIcons[n.severity] || Info;
              const color = severityColors[n.severity] || "text-muted-foreground";
              return (
                <button
                  key={n.id}
                  className="flex items-start gap-3 w-full text-left px-4 py-2.5 hover:bg-muted/20 transition-colors border-b border-border/20 last:border-0"
                  onClick={() => handleClick(n.type)}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-2">
                      {n.description || n.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                      <Badge variant="outline" className="text-[8px] capitalize h-4">
                        {n.type}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border/50">
          <button
            onClick={() => { setOpen(false); setLocation("/activity"); }}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors w-full justify-center py-1"
          >
            View all activity <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
