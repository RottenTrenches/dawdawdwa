import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingUp, Flame, Star, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrendingKOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  recent_votes: number;
  recent_comments: number;
}

interface TrendingKOLsProps {
  timeframe?: "24h" | "48h" | "7d";
}

export const TrendingKOLs = ({ timeframe = "24h" }: TrendingKOLsProps) => {
  const [trending, setTrending] = useState<TrendingKOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState(timeframe);

  useEffect(() => {
    fetchTrending();
  }, [activeTimeframe]);

  const fetchTrending = async () => {
    setLoading(true);
    
    const hoursAgo = activeTimeframe === "24h" ? 24 : activeTimeframe === "48h" ? 48 : 168;
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    const { data: recentVotes } = await supabase
      .from('kol_votes')
      .select('kol_id')
      .gte('created_at', since);
    
    const { data: recentComments } = await supabase
      .from('kol_comments')
      .select('kol_id')
      .gte('created_at', since);
    
    const activityMap = new Map<string, { votes: number; comments: number }>();
    
    recentVotes?.forEach(v => {
      const current = activityMap.get(v.kol_id) || { votes: 0, comments: 0 };
      activityMap.set(v.kol_id, { ...current, votes: current.votes + 1 });
    });
    
    recentComments?.forEach(c => {
      const current = activityMap.get(c.kol_id) || { votes: 0, comments: 0 };
      activityMap.set(c.kol_id, { ...current, comments: current.comments + 1 });
    });
    
    const activeKolIds = Array.from(activityMap.keys());
    
    if (activeKolIds.length === 0) {
      setTrending([]);
      setLoading(false);
      return;
    }
    
    const { data: kols } = await supabase
      .from('kols')
      .select('id, username, twitter_handle, profile_pic_url, rating, total_votes')
      .in('id', activeKolIds);
    
    if (kols) {
      const trendingKols = kols.map(kol => ({
        ...kol,
        recent_votes: activityMap.get(kol.id)?.votes || 0,
        recent_comments: activityMap.get(kol.id)?.comments || 0,
      }))
      .sort((a, b) => (b.recent_votes + b.recent_comments * 2) - (a.recent_votes + a.recent_comments * 2))
      .slice(0, 5);
      
      setTrending(trendingKols);
    }
    
    setLoading(false);
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? "text-accent fill-accent" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="stat-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent" />
          Trending
        </h3>
        <div className="flex gap-1">
          {(["24h", "48h", "7d"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTimeframe(t)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                activeTimeframe === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      
      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-5 h-5 text-primary mx-auto animate-spin" />
          </div>
        ) : trending.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          trending.map((kol, index) => (
            <Link
              key={kol.id}
              to={`/kol/${kol.id}`}
              className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="relative">
                <span className="absolute -left-1 -top-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <img
                  src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                  alt={kol.username}
                  className="w-10 h-10 rounded-full border-2 border-border group-hover:border-primary transition-colors"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {kol.username}
                </p>
                {renderStars(Number(kol.rating))}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-secondary">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    +{kol.recent_votes + kol.recent_comments}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
