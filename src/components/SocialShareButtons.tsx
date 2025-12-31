import { Link, Share2 } from "lucide-react";
import { toast } from "sonner";

interface SocialShareButtonsProps {
  kolName: string;
  kolHandle: string;
  rating: number;
  isRotten?: boolean;
  className?: string;
}

// X (Twitter) logo SVG component
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function SocialShareButtons({ 
  kolName, 
  kolHandle, 
  rating, 
  isRotten = false,
  className = "" 
}: SocialShareButtonsProps) {
  const baseUrl = window.location.origin;
  const shareText = isRotten 
    ? `🔥 ${kolName} (${kolHandle}) is one of the MOST ROTTEN KOLs on Rotten Trenches! Rating: ${rating.toFixed(2)}⭐ - Check them out!`
    : `✨ ${kolName} (${kolHandle}) is rated ${rating.toFixed(2)}⭐ on Rotten Trenches! Community-powered KOL tracking.`;
  
  const shareUrl = `${baseUrl}/leaderboard`;
  
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-pixel text-[8px] text-muted-foreground mr-1">
        <Share2 className="w-3 h-3 inline mr-1" />
        Share:
      </span>
      <button
        onClick={handleTwitterShare}
        className="p-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded transition-colors"
        title="Share on X"
      >
        <XLogo className="w-4 h-4" />
      </button>
      <button
        onClick={handleCopyLink}
        className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded transition-colors"
        title="Copy link"
      >
        <Link className="w-4 h-4" />
      </button>
    </div>
  );
}
