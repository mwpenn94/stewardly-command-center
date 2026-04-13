import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

const shortcuts = [
  { keys: ["⌘", "K"], description: "Open global search" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close dialog / search" },
  { keys: ["G", "H"], description: "Go to Home" },
  { keys: ["G", "C"], description: "Go to Contacts" },
  { keys: ["G", "M"], description: "Go to Campaigns" },
  { keys: ["G", "S"], description: "Go to Sync Engine" },
  { keys: ["G", "A"], description: "Go to Analytics" },
  { keys: ["G", "I"], description: "Go to Bulk Import" },
  { keys: ["G", "E"], description: "Go to Enrichment" },
  { keys: ["G", "B"], description: "Go to Backups" },
  { keys: ["G", "N"], description: "Go to Channels" },
  { keys: ["G", "T"], description: "Go to AI Insights" },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {shortcuts.map((s) => (
            <div key={s.description} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-0.5 text-xs font-medium bg-muted border border-border/50 rounded text-foreground">
                      {key}
                    </kbd>
                    {i < s.keys.length - 1 && (
                      <span className="text-xs text-muted-foreground mx-0.5">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press <kbd className="px-1 py-0.5 text-[9px] bg-muted border border-border/30 rounded">?</kbd> to toggle this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
