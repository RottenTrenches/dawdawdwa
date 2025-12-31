import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { 
  User, 
  MessageSquare, 
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Trophy,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAnonUser } from "@/hooks/useAnonUser";
import { format } from "date-fns";

interface UserComment {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  kol_id: string;
  kols: {
    id: string;
    username: string;
    twitter_handle: string;
    profile_pic_url: string | null;
  } | null;
}

interface UserVote {
  id: string;
  vote_type: string;
  created_at: string;
  kol_id: string;
  kols: {
    id: string;
    username: string;
    profile_pic_url: string | null;
  } | null;
}

export default function Profile() {
  const { userId, isReady } = useAnonUser();
  const [comments, setComments] = useState<UserComment[]>([]);
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalVotes: 0, totalComments: 0 });

  useEffect(() => {
    if (isReady && userId) {
      fetchUserActivity();
    }
  }, [isReady, userId]);

  const fetchUserActivity = async () => {
    setLoading(true);

    // Fetch user's comments
    const { data: commentsData } = await supabase
      .from("kol_comments")
      .select(`
        id,
        content,
        rating,
        created_at,
        kol_id,
        kols (
          id,
          username,
          twitter_handle,
          profile_pic_url
        )
      `)
      .eq("wallet_address", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch user's votes
    const { data: votesData } = await supabase
      .from("kol_votes")
      .select(`
        id,
        vote_type,
        created_at,
        kol_id,
        kols (
          id,
          username,
          profile_pic_url
        )
      `)
      .eq("wallet_address", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Count totals
    const { count: votesCount } = await supabase
      .from("kol_votes")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", userId);

    const { count: commentsCount } = await supabase
      .from("kol_comments")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", userId);

    setComments(commentsData || []);
    setVotes(votesData || []);
    setStats({
      totalVotes: votesCount || 0,
      totalComments: commentsCount || 0,
    });
    setLoading(false);
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? "text-primary fill-primary" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  if (!isReady || loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <User className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Your Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              ID: {userId.slice(0, 12)}...
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stat-card p-6 rounded-2xl text-center"
            >
              <Trophy className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats.totalVotes}
              </div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="stat-card p-6 rounded-2xl text-center"
            >
              <MessageSquare className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats.totalComments}
              </div>
              <div className="text-sm text-muted-foreground">Reviews</div>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-8">
            {/* Recent Votes */}
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Votes
              </h2>
              {votes.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center">
                  <ThumbsUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No votes yet</p>
                  <Link to="/leaderboard" className="text-primary text-sm hover:underline mt-2 block">
                    Start voting on the leaderboard →
                  </Link>
                </div>
              ) : (
                <div className="glass-card rounded-2xl divide-y divide-border/30">
                  {votes.slice(0, 5).map((vote) => (
                    <Link
                      key={vote.id}
                      to={`/kol/${vote.kol_id}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-all"
                    >
                      <img
                        src={vote.kols?.profile_pic_url || `https://ui-avatars.com/api/?name=${vote.kols?.username}&background=random`}
                        alt={vote.kols?.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {vote.kols?.username || "Unknown KOL"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(vote.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        vote.vote_type === "up" 
                          ? "bg-primary/20 text-primary" 
                          : "bg-destructive/20 text-destructive"
                      }`}>
                        {vote.vote_type === "up" ? (
                          <ThumbsUp className="w-3 h-3 inline mr-1" />
                        ) : (
                          <ThumbsDown className="w-3 h-3 inline mr-1" />
                        )}
                        {vote.vote_type === "up" ? "Upvoted" : "Downvoted"}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Comments */}
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Your Reviews
              </h2>
              {comments.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No reviews yet</p>
                  <Link to="/add-kol" className="text-primary text-sm hover:underline mt-2 block">
                    Browse KOLs and leave a review →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-4 rounded-2xl"
                    >
                      <Link
                        to={`/kol/${comment.kol_id}`}
                        className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={comment.kols?.profile_pic_url || `https://ui-avatars.com/api/?name=${comment.kols?.username}&background=random`}
                          alt={comment.kols?.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <span className="font-medium text-primary">
                            {comment.kols?.username || "Unknown KOL"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {comment.kols?.twitter_handle}
                          </span>
                        </div>
                      </Link>
                      {comment.rating && (
                        <div className="mb-2">{renderStars(comment.rating)}</div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(comment.created_at), "MMM d, yyyy")}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}
