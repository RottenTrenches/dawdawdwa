import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  ExternalLink,
  Crown,
  Skull
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  upvotes: number;
  downvotes: number;
  total_votes: number;
  created_at: string;
}

export const LiveKOLSection = () => {
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"rating" | "votes" | "newest">("rating");

  useEffect(() => {
    fetchKOLs();
    
    const channel = supabase
      .channel('kol-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kols' }, () => {
        fetchKOLs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  const fetchKOLs = async () => {
    let query = supabase.from('kols').select('*').limit(12);

    if (sortBy === "rating") {
      query = query.order('rating', { ascending: false, nullsFirst: false });
    } else if (sortBy === "votes") {
      query = query.order('total_votes', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data) {
      setKols(data);
    }
    setLoading(false);
  };

  const renderStars = (rating: number | null) => {
    const r = rating || 0;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= r ? "text-accent fill-accent" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const getVoteRatio = (upvotes: number, downvotes: number) => {
    const total = upvotes + downvotes;
    if (total === 0) return 50;
    return Math.round((upvotes / total) * 100);
  };

  if (loading) {
    return (
      <div className="stat-card p-12 text-center">
        <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Loading KOLs...</p>
      </div>
    );
  }

  if (kols.length === 0) {
    return (
      <div className="stat-card p-12 text-center">
        <p className="text-muted-foreground">No KOLs found. Be the first to add one!</p>
        <Link to="/add-kol" className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Add KOL
        </Link>
      </div>
    );
  }

  return (
    <div className="stat-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Live KOL Feed
        </h2>
        <div className="flex items-center gap-1">
          {[
            { key: "rating", label: "Top" },
            { key: "votes", label: "Popular" },
            { key: "newest", label: "New" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as typeof sortBy)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                sortBy === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border/50">
        <AnimatePresence mode="popLayout">
          {kols.map((kol, index) => {
            const voteRatio = getVoteRatio(kol.upvotes || 0, kol.downvotes || 0);
            const isPositive = voteRatio >= 50;
            const rating = Number(kol.rating) || 0;
            
            return (
              <motion.div
                key={kol.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={`/kol/${kol.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {index === 0 && sortBy === "rating" ? (
                      <Crown className="w-5 h-5 text-accent mx-auto" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                      alt={kol.username}
                      className="w-12 h-12 rounded-full border-2 border-border group-hover:border-primary transition-colors object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                      }}
                    />
                    {rating >= 4 && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 text-secondary-foreground" />
                      </div>
                    )}
                    {rating <= 2 && rating > 0 && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <TrendingDown className="w-3 h-3 text-destructive-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {kol.username}
                      </h3>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground">@{kol.twitter_handle}</p>
                    
                    <div className="flex items-center gap-3 mt-1">
                      {renderStars(rating)}
                      <span className="text-xs text-muted-foreground">
                        {kol.total_votes || 0} votes
                      </span>
                    </div>
                  </div>
                  
                  {/* Rating & Vote bar */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-foreground">
                      {rating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${isPositive ? 'bg-secondary' : 'bg-destructive'}`}
                          style={{ width: `${voteRatio}%` }}
                        />
                      </div>
                      <span className={`text-xs ${isPositive ? 'text-secondary' : 'text-destructive'}`}>
                        {voteRatio}%
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      <div className="p-4 border-t border-border text-center">
        <Link 
          to="/leaderboard" 
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          View Full Leaderboard
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
