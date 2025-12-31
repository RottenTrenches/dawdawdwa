import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface RealtimeComment {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  kol_id: string;
  kol_username?: string;
  kol_profile_pic?: string | null;
}

export const RealtimeComments = () => {
  const [comments, setComments] = useState<RealtimeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentId, setNewCommentId] = useState<string | null>(null);

  const fetchComments = async () => {
    const { data: commentsData } = await supabase
      .from('kol_comments')
      .select('id, content, rating, created_at, kol_id')
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(8);

    if (!commentsData) {
      setLoading(false);
      return;
    }

    // Fetch KOL info for each comment
    const kolIds = [...new Set(commentsData.map(c => c.kol_id))];
    const { data: kolsData } = await supabase
      .from('kols')
      .select('id, username, profile_pic_url')
      .in('id', kolIds);

    const kolsMap = new Map(kolsData?.map(k => [k.id, k]) || []);

    const enrichedComments = commentsData.map(comment => ({
      ...comment,
      kol_username: kolsMap.get(comment.kol_id)?.username || 'Unknown',
      kol_profile_pic: kolsMap.get(comment.kol_id)?.profile_pic_url
    }));

    setComments(enrichedComments);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kol_comments'
        },
        async (payload) => {
          const newComment = payload.new as any;
          
          // Skip replies
          if (newComment.parent_comment_id) return;
          
          // Fetch KOL info
          const { data: kolData } = await supabase
            .from('kols')
            .select('username, profile_pic_url')
            .eq('id', newComment.kol_id)
            .single();

          const enrichedComment: RealtimeComment = {
            id: newComment.id,
            content: newComment.content,
            rating: newComment.rating,
            created_at: newComment.created_at,
            kol_id: newComment.kol_id,
            kol_username: kolData?.username || 'Unknown',
            kol_profile_pic: kolData?.profile_pic_url
          };

          setNewCommentId(enrichedComment.id);
          setTimeout(() => setNewCommentId(null), 3000);

          setComments(prev => [enrichedComment, ...prev.slice(0, 7)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
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
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold text-foreground">Live Reviews</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-muted/30 h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold text-foreground">Live Reviews</h3>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-accent/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-accent">Live</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                backgroundColor: newCommentId === comment.id ? 'hsl(var(--accent) / 0.1)' : 'transparent'
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`rounded-lg transition-colors ${
                newCommentId === comment.id ? 'ring-1 ring-accent/50' : ''
              }`}
            >
              <Link 
                to={`/kol/${comment.kol_id}`}
                className="block p-3 bg-muted/20 hover:bg-muted/40 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={comment.kol_profile_pic || `https://ui-avatars.com/api/?name=${comment.kol_username}&background=random&size=40`}
                    alt={comment.kol_username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {comment.kol_username}
                      </span>
                      {renderStars(comment.rating)}
                      <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Link 
        to="/comments"
        className="block mt-4 text-center text-sm text-primary hover:underline"
      >
        View all reviews →
      </Link>
    </div>
  );
};
