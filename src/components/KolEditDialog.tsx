import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit2, ExternalLink } from "lucide-react";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  wallet_address?: string;
}

interface KolEditDialogProps {
  kol: KOL | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function KolEditDialog({ kol, open, onOpenChange, onSave }: KolEditDialogProps) {
  const [username, setUsername] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when KOL changes
  useEffect(() => {
    if (kol) {
      setUsername(kol.username);
      setTwitterHandle(kol.twitter_handle);
    }
  }, [kol]);

  const handleSave = async () => {
    if (!kol) return;
    
    setSaving(true);
    try {
      const cleanHandle = twitterHandle.replace(/^@/, "");
      
      const { error } = await supabase
        .from("kols")
        .update({
          username: username.trim(),
          twitter_handle: cleanHandle.startsWith("@") ? cleanHandle : `@${cleanHandle}`,
        })
        .eq("id", kol.id);

      if (error) throw error;

      toast.success("KOL updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating KOL:", error);
      toast.error("Failed to update KOL");
    } finally {
      setSaving(false);
    }
  };

  const kolscanUrl = kol?.wallet_address 
    ? `https://kolscan.io/account/${kol.wallet_address}` 
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Edit KOL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Kolscan link for reference */}
          {kolscanUrl && (
            <div className="p-3 bg-muted/30 rounded-sm border border-border">
              <p className="font-pixel text-[8px] text-muted-foreground mb-2">
                LOOK UP ON KOLSCAN
              </p>
              <a
                href={kolscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[9px] text-primary hover:underline flex items-center gap-1"
              >
                {kolscanUrl.slice(0, 50)}...
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div>
            <label className="font-pixel text-[8px] text-muted-foreground block mb-1">
              USERNAME
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Display name"
              className="font-pixel text-[10px]"
            />
          </div>

          <div>
            <label className="font-pixel text-[8px] text-muted-foreground block mb-1">
              TWITTER HANDLE
            </label>
            <Input
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@handle"
              className="font-pixel text-[10px]"
            />
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">
              Include @ prefix (e.g., @RottenKols)
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 font-pixel text-[9px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !username.trim() || !twitterHandle.trim()}
              className="flex-1 font-pixel text-[9px]"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
