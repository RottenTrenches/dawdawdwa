import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, Flame, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  upvotes: number;
  downvotes: number;
}

type SortOption = 'rating' | 'popular' | 'newest' | 'rotten';

export const KOLShowcase = () => {
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const fetchKOLs = async () => {
    let query = supabase.from('kols').select('*');
    
    switch (sortBy) {
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'rotten':
        query = query.order('rating', { ascending: true });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
      default:
        query = query.order('total_votes', { ascending: false });
    }
    
    const { data } = await query.limit(12);
    setKols(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchKOLs();

    // Real-time subscription for KOL updates
    const channel = supabase
      .channel('kol-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kols'
        },
        () => fetchKOLs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  const getVotePercentage = (upvotes: number, downvotes: number) => {
    const total = upvotes + downvotes;
    if (total === 0) return 50;
    return Math.round((upvotes / total) * 100);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">KOL Showcase</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-muted/30 h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">KOL Showcase</h2>
        </div>
        
        {/* Sort Options */}
        <div className="flex items-center gap-2">
          {[
            { value: 'popular', label: 'Most Reviewed' },
            { value: 'rating', label: 'Top Rated' },
            { value: 'rotten', label: 'Most Rotten' },
            { value: 'newest', label: 'Newest' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value as SortOption)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                sortBy === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kols.map((kol, index) => {
          const isRotten = kol.rating < 3;
          const votePercent = getVotePercentage(kol.upvotes || 0, kol.downvotes || 0);
          
          return (
            <motion.div
              key={kol.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/kol/${kol.id}`}
                className={`block p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                  isRotten 
                    ? 'bg-primary/5 border-primary/30 hover:border-primary/50' 
                    : 'bg-muted/20 border-border/50 hover:border-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                      alt={kol.username}
                      className={`w-12 h-12 rounded-full object-cover border-2 ${
                        isRotten ? 'border-primary' : 'border-accent'
                      }`}
                    />
                    {isRotten && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Flame className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{kol.username}</h3>
                    <p className="text-xs text-muted-foreground">{kol.twitter_handle}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {renderStars(kol.rating)}
                      <span className="text-sm font-semibold text-foreground">
                        {Number(kol.rating).toFixed(1)}
                      </span>
                    </div>
                    
                    {/* Vote bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-accent flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {votePercent}%
                        </span>
                        <span className="text-primary flex items-center gap-1">
                          {100 - votePercent}%
                          <TrendingDown className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="h-1.5 bg-primary/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${votePercent}%` }}
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      {kol.total_votes || 0} reviews
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <Link 
        to="/leaderboard"
        className="flex items-center justify-center gap-2 mt-6 py-3 px-4 bg-muted/30 hover:bg-muted/50 rounded-xl text-foreground transition-colors"
      >
        <span>View Full Leaderboard</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
};
