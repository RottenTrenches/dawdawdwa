import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Star, Clock, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecentComment {
  id: string;
  kol_id: string;
  content: string;
  rating: number | null;
  created_at: string;
  kol_username: string;
  kol_profile_pic: string | null;
}

export const NewComments = () => {
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentComments();
  }, []);

  const fetchRecentComments = async () => {
    const { data: commentsData } = await supabase
      .from('kol_comments')
      .select('id, kol_id, content, rating, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }
    
    const kolIds = [...new Set(commentsData.map(c => c.kol_id))];
    const { data: kolsData } = await supabase
      .from('kols')
      .select('id, username, profile_pic_url')
      .in('id', kolIds);
    
    const kolsMap = new Map((kolsData || []).map(k => [k.id, k]));
    
    const enrichedComments = commentsData.map(comment => {
      const kol = kolsMap.get(comment.kol_id);
      return {
        ...comment,
        kol_username: kol?.username || 'Unknown',
        kol_profile_pic: kol?.profile_pic_url || null,
      };
    });
    
    setComments(enrichedComments);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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
          <MessageSquare className="w-5 h-5 text-primary" />
          Recent Reviews
        </h3>
        <Link
          to="/comments"
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          View All
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      
      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-5 h-5 text-primary mx-auto animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Link
              key={comment.id}
              to={`/kol/${comment.kol_id}`}
              className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors group"
            >
              <img
                src={comment.kol_profile_pic || `https://ui-avatars.com/api/?name=${comment.kol_username}&background=random`}
                alt={comment.kol_username}
                className="w-9 h-9 rounded-full border border-border group-hover:border-primary transition-colors shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${comment.kol_username}&background=random`;
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {comment.kol_username}
                  </span>
                  {comment.rating && renderStars(comment.rating)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {comment.content}
                </p>
                <span className="text-xs text-muted-foreground/70 mt-1 block">
                  {formatTime(comment.created_at)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
