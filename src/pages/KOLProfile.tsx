import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { Trade } from "@/components/LatestTrades";
import { ImageLightbox } from "@/components/ImageLightbox";
import { GarbageTruckAnimation } from "@/components/GarbageTruckAnimation";
import { useVoteSound } from "@/hooks/useVoteSound";
import { useVoteParticles } from "@/hooks/useVoteParticles";
import { useVoteCooldown } from "@/hooks/useVoteCooldown";
import { useCommentVotes } from "@/hooks/useCommentVotes";
import { useAnonUser } from "@/hooks/useAnonUser";
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, Minus, 
  MessageSquare, ThumbsUp, ThumbsDown, ExternalLink, Wallet,
  Heart, Send, Clock, ImagePlus, X, Ban, Reply, Filter,
  ShieldCheck, ShieldAlert, ArrowRightLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/useFavorites";
import { useBlockedKOLs } from "@/hooks/useBlockedKOLs";
import { useAchievements } from "@/hooks/useAchievements";
import { getBadgeById } from "@/hooks/useWornBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PopularityGauge } from "@/components/PopularityGauge";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  created_at: string;
  wallet_address: string | null;
  is_wallet_verified: boolean;
  upvotes: number;
  downvotes: number;
}

interface PNLData {
  pnl_sol: number | null;
  pnl_usd: number | null;
  win_rate: number | null;
  win_count: number | null;
  loss_count: number | null;
  total_trades: number | null;
  fetched_at: string | null;
}

interface Comment {
  id: string;
  wallet_address: string;
  content: string;
  rating: number | null;
  created_at: string;
  image_url: string | null;
  trade_signature: string | null;
  parent_comment_id: string | null;
  user_profile?: {
    display_name: string | null;
    profile_pic_url: string | null;
    is_verified: boolean | null;
    worn_badge: string | null;
  } | null;
  replies?: Comment[];
}


export default function KOLProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAnonUser();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { toggleBlock, isBlocked } = useBlockedKOLs();
  const { incrementVotes, incrementReviews } = useAchievements();
  const { playVoteSound } = useVoteSound();
  const { fireVoteParticles } = useVoteParticles();
  const { startCooldown, getCooldownRemaining, isOnCooldown, formatCooldown } = useVoteCooldown();
  const [kol, setKol] = useState<KOL | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("reviews");
  const [citedTrade, setCitedTrade] = useState<Trade | null>(null);
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [pnlData, setPnlData] = useState<PNLData | null>(null);
  const [commentSortBy, setCommentSortBy] = useState<'newest' | 'most_liked' | 'most_disliked'>('newest');
  const [lastReviewTime, setLastReviewTime] = useState<Date | null>(null);
  const [reviewCooldownRemaining, setReviewCooldownRemaining] = useState<number>(0);
  const [showGarbageTruck, setShowGarbageTruck] = useState(false);
  
  // Get all comment IDs for vote fetching
  const allCommentIds = useMemo(() => {
    const ids: string[] = [];
    comments.forEach(c => {
      ids.push(c.id);
      if (c.replies) c.replies.forEach(r => ids.push(r.id));
    });
    return ids;
  }, [comments]);
  
  const { voteCounts, vote: voteComment, getVoteRatio } = useCommentVotes(allCommentIds);
  // All users can affect ratings now
  const isKOLOwner = false; // Disabled - anyone can review

  useEffect(() => {
    if (id) {
      fetchKOL(id);
      fetchComments(id);
      fetchPNLData(id);
      checkLastReviewTime(id);

      // Set up real-time subscription for vote updates
      const channel = supabase
        .channel(`kol-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'kols',
            filter: `id=eq.${id}`
          },
          (payload) => {
            const newData = payload.new as any;
            setKol(prev => prev ? {
              ...prev,
              upvotes: newData.upvotes || 0,
              downvotes: newData.downvotes || 0,
              rating: newData.rating || prev.rating,
              total_votes: newData.total_votes || prev.total_votes
            } : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  // Check last review time for cooldown
  const checkLastReviewTime = async (kolId: string) => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('kol_comments')
      .select('created_at')
      .eq('kol_id', kolId)
      .eq('wallet_address', userId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      setLastReviewTime(new Date(data[0].created_at));
    }
  };

  // Update cooldown timer - 5 minute cooldown
  useEffect(() => {
    if (!lastReviewTime) {
      setReviewCooldownRemaining(0);
      return;
    }
    
    const updateCooldown = () => {
      const fiveMinutesMs = 5 * 60 * 1000; // 5 minutes
      const elapsed = Date.now() - lastReviewTime.getTime();
      const remaining = Math.max(0, fiveMinutesMs - elapsed);
      setReviewCooldownRemaining(remaining);
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000); // Update every second for smoother countdown
    
    return () => clearInterval(interval);
  }, [lastReviewTime]);

  const fetchKOL = async (kolId: string) => {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .eq('id', kolId)
      .maybeSingle();

    if (error || !data) {
      toast.error("KOL not found");
      navigate('/add-kol');
    } else {
      setKol({
        ...data,
        upvotes: (data as any).upvotes || 0,
        downvotes: (data as any).downvotes || 0
      });
    }
    setLoading(false);
  };

  const fetchPNLData = async (kolId: string) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const { data } = await supabase
      .from('kol_pnl_snapshots')
      .select('pnl_sol, pnl_usd, win_rate, win_count, loss_count, total_trades, fetched_at')
      .eq('kol_id', kolId)
      .eq('month_year', currentMonth)
      .maybeSingle();
    
    if (data) {
      setPnlData(data);
    }
  };

  const formatPnlTimeAgo = (dateStr: string | null): string => {
    if (!dateStr) return 'Not yet fetched';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const fetchComments = async (kolId: string) => {
    // Fetch comments first
    const { data: commentsData } = await supabase
      .from('kol_comments')
      .select('*')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: false });
    
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }
    
    // Get unique wallet addresses
    const walletAddresses = [...new Set(commentsData.map(c => c.wallet_address))];
    
    // Fetch user profiles for these wallet addresses
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('wallet_address, display_name, profile_pic_url, is_verified, worn_badge')
      .in('wallet_address', walletAddresses);
    
    // Map profiles to comments
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.wallet_address, { display_name: p.display_name, profile_pic_url: p.profile_pic_url, is_verified: p.is_verified, worn_badge: p.worn_badge }])
    );
    
    const commentsWithProfiles = commentsData.map(comment => ({
      ...comment,
      parent_comment_id: (comment as any).parent_comment_id || null,
      user_profile: profilesMap.get(comment.wallet_address) || null,
      replies: [] as Comment[],
    }));
    
    // Build thread structure - parent comments at top, replies nested
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];
    
    // First pass: index all comments
    commentsWithProfiles.forEach(comment => {
      commentMap.set(comment.id, comment);
    });
    
    // Second pass: attach replies to parents
    commentsWithProfiles.forEach(comment => {
      if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
        const parent = commentMap.get(comment.parent_comment_id)!;
        if (!parent.replies) parent.replies = [];
        parent.replies.push(comment);
      } else if (!comment.parent_comment_id) {
        rootComments.push(comment);
      }
    });
    
    // Sort replies by created_at ascending (oldest first)
    rootComments.forEach(comment => {
      if (comment.replies) {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
    
    setComments(rootComments);
  };


  const handleVote = async (type: "up" | "down", event?: React.MouseEvent) => {
    if (!kol) return;
    
    // Check if user is the KOL - prevent self-voting
    if (isKOLOwner) {
      toast.error("You cannot vote on your own profile");
      return;
    }
    
    // Check local cooldown first
    if (isOnCooldown(kol.id)) {
      const remaining = getCooldownRemaining(kol.id);
      toast.error(`Please wait ${formatCooldown(remaining)} before voting again`);
      return;
    }
    
    // Play vote sound and fire particles
    playVoteSound(type);
    fireVoteParticles(type, event);
    
    const walletAddress = userId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase.rpc('vote_for_kol', {
      p_kol_id: kol.id,
      p_wallet_address: walletAddress,
      p_vote_type: type
    });

    if (error) {
      toast.error("Failed to vote");
      return;
    }

    const result = data as { success: boolean; rating?: number; total_votes?: number; upvotes?: number; downvotes?: number; error?: string; cooldown_remaining?: number };
    
    if (!result.success) {
      if (result.error === 'Rate limited') {
        toast.error(`Please wait ${result.cooldown_remaining} minutes before voting again`);
        startCooldown(kol.id); // Sync local cooldown
      } else {
        toast.error(result.error || "Failed to vote");
      }
      return;
    }
    
    if (result.success) {
      setKol(prev => prev ? { 
        ...prev, 
        rating: result.rating ?? prev.rating, 
        total_votes: result.total_votes ?? prev.total_votes,
        upvotes: result.upvotes ?? prev.upvotes,
        downvotes: result.downvotes ?? prev.downvotes
      } : null);
      toast.success("Vote recorded!");
      startCooldown(kol.id); // Start local cooldown
      incrementVotes();
    }
  };

  const formatReviewCooldown = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleSubmitReview = async () => {
    console.log('Submit review clicked', { kol: !!kol, reviewContent, reviewRating });
    if (!kol) return;
    
    if (reviewRating === 0) {
      toast.error("⭐ Please select a star rating before submitting your review!", {
        description: "Click on the stars above to rate this KOL"
      });
      return;
    }
    
    if (!reviewContent.trim()) {
      toast.error("Please write a review");
      return;
    }

    // Prevent reviewing own profile
    if (isKOLOwner) {
      toast.error("You cannot review your own profile");
      return;
    }

    // Check 5-minute cooldown
    if (reviewCooldownRemaining > 0) {
      toast.error(`Please wait ${formatReviewCooldown(reviewCooldownRemaining)} before reviewing again`);
      return;
    }
    
    setSubmittingReview(true);
    const walletAddress = userId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let imageUrl: string | null = null;
    
    // Upload image if present
    if (reviewImage) {
      setUploadingImage(true);
      const fileExt = reviewImage.name.split('.').pop();
      const fileName = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kol-images')
        .upload(fileName, reviewImage);
      
      if (uploadError) {
        console.error('Image upload error:', uploadError);
        toast.error("Failed to upload image");
        setSubmittingReview(false);
        setUploadingImage(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('kol-images')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }
    
    const { error } = await supabase
      .from('kol_comments')
      .insert({
        kol_id: kol.id,
        wallet_address: walletAddress,
        content: reviewContent,
        rating: reviewRating,
        image_url: imageUrl,
        trade_signature: citedTrade?.signature || null
      });

    if (error) {
      toast.error("Failed to submit review");
      setSubmittingReview(false);
      return;
    }

    // Recalculate and update KOL rating based on all reviews
    const { data: allComments } = await supabase
      .from('kol_comments')
      .select('rating')
      .eq('kol_id', kol.id)
      .not('rating', 'is', null);
    
    if (allComments && allComments.length > 0) {
      const ratings = allComments.map(c => c.rating).filter((r): r is number => r !== null);
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      
      // Update KOL rating in database
      await supabase
        .from('kols')
        .update({ 
          rating: Math.round(avgRating * 10) / 10,
          total_votes: ratings.length
        })
        .eq('id', kol.id);
      
      // Update local state
      setKol(prev => prev ? { ...prev, rating: Math.round(avgRating * 10) / 10, total_votes: ratings.length } : null);
    }

    // Trigger garbage truck animation for bad reviews (2 stars or less)
    if (reviewRating <= 2) {
      setShowGarbageTruck(true);
      toast.success("🗑️ ROTTEN REVIEW SUBMITTED! 🗑️");
    } else {
      toast.success("Review submitted! Rating updated.");
    }
    
    incrementReviews();
    setReviewContent("");
    setReviewRating(0);
    setCitedTrade(null);
    setReviewImage(null);
    setReviewImagePreview(null);
    setSubmittingReview(false);
    setLastReviewTime(new Date()); // Set cooldown
    fetchComments(kol.id);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image must be less than 5MB");
        return;
      }
      setReviewImage(file);
      setReviewImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setReviewImage(null);
    if (reviewImagePreview) {
      URL.revokeObjectURL(reviewImagePreview);
      setReviewImagePreview(null);
    }
  };

  const renderInteractiveStars = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setReviewRating(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 cursor-pointer ${
              star <= (hoverRating || reviewRating) 
                ? "text-secondary fill-secondary" 
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );

  const renderStars = (rating: number, size = "w-5 h-5") => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating ? "text-secondary fill-secondary" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getTrend = () => {
    if (!kol) return "stable";
    const r = kol.rating ?? 0;
    if (r >= 4) return "up";
    if (r <= 2.5) return "down";
    return "stable";
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="font-pixel text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!kol) return null;

  const rating = kol.rating ?? 0;
  const isRotten = rating < 3;

  return (
    <PageLayout>
      {/* Garbage Truck Animation for bad reviews */}
      <GarbageTruckAnimation 
        isVisible={showGarbageTruck} 
        onComplete={() => setShowGarbageTruck(false)} 
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-pixel text-[10px]">Back</span>
        </motion.button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card p-6 rounded-sm mb-6"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                alt={kol.username}
                className={`w-32 h-32 rounded-lg border-4 ${isRotten ? 'border-primary' : 'border-secondary'} shadow-lg`}
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-xl font-semibold text-foreground">{kol.username}</h1>
                  </div>
                  <a
                    href={`https://twitter.com/${kol.twitter_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {kol.twitter_handle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {kol.wallet_address && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(kol.wallet_address!);
                        toast.success("Wallet address copied!");
                      }}
                      className="flex items-center gap-2 mt-2 hover:bg-muted/30 px-2 py-1 rounded transition-colors cursor-pointer group"
                      title="Click to copy"
                    >
                      <Wallet className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      <span className="text-xs text-muted-foreground group-hover:text-primary">
                        {kol.wallet_address.slice(0, 8)}...{kol.wallet_address.slice(-8)}
                      </span>
                    </button>
                  )}
                </div>

                {/* Rating Badge */}
                <div className={`px-6 py-4 rounded-lg ${isRotten ? 'bg-primary/20 border border-primary/50' : 'bg-secondary/20 border border-secondary/50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(rating, "w-5 h-5")}
                    <span className="font-pixel text-2xl text-foreground">{rating.toFixed(1)}</span>
                  </div>
                  <p className="font-pixel text-[10px] text-muted-foreground text-center">
                    {kol.total_votes} reviews
                  </p>
                </div>

                {/* Popularity Gauge */}
                <div className="bg-muted/20 border border-border/50 px-4 py-3 rounded-lg">
                  <PopularityGauge 
                    upvotes={kol.upvotes} 
                    downvotes={kol.downvotes} 
                    size="sm" 
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <div className="bg-muted/30 p-3 rounded min-w-[100px] text-center">
                  <p className="font-pixel text-[8px] text-muted-foreground">PNL (SOL)</p>
                  {pnlData?.pnl_sol !== null && pnlData?.pnl_sol !== undefined ? (
                    <p className={`font-pixel text-sm mt-1 ${pnlData.pnl_sol >= 0 ? 'text-accent' : 'text-primary'}`}>
                      {pnlData.pnl_sol >= 0 ? '+' : ''}{pnlData.pnl_sol.toFixed(2)}
                    </p>
                  ) : (
                    <p className="font-pixel text-sm text-muted-foreground mt-1">--</p>
                  )}
                  <p className="font-pixel text-[6px] text-muted-foreground/60 mt-0.5">
                    <Clock className="w-2 h-2 inline mr-0.5" />
                    {formatPnlTimeAgo(pnlData?.fetched_at || null)}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded min-w-[100px] text-center">
                  <p className="font-pixel text-[8px] text-muted-foreground">Win Rate</p>
                  {pnlData?.win_rate !== null && pnlData?.win_rate !== undefined ? (
                    <p className={`font-pixel text-sm mt-1 ${pnlData.win_rate >= 50 ? 'text-accent' : 'text-primary'}`}>
                      {pnlData.win_rate.toFixed(1)}%
                    </p>
                  ) : (
                    <p className="font-pixel text-sm text-muted-foreground mt-1">--</p>
                  )}
                  {pnlData && pnlData.win_count !== null && pnlData.loss_count !== null && (
                    <p className="font-pixel text-[7px] text-muted-foreground">
                      {pnlData.win_count}W / {pnlData.loss_count}L
                    </p>
                  )}
                </div>
                <div className="bg-muted/30 p-3 rounded min-w-[100px] text-center">
                  <p className="font-pixel text-[8px] text-muted-foreground">Status</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {getTrend() === "up" && <TrendingUp className="w-4 h-4 text-accent" />}
                    {getTrend() === "down" && <TrendingDown className="w-4 h-4 text-primary" />}
                    {getTrend() === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-pixel text-[10px] text-foreground capitalize">{getTrend()}</span>
                  </div>
                </div>
                <div className="bg-muted/30 p-3 rounded min-w-[100px] text-center">
                  <p className="font-pixel text-[8px] text-muted-foreground">Reviews</p>
                  <p className="font-pixel text-sm text-foreground mt-1">{comments.length}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded min-w-[100px] text-center">
                  <p className="font-pixel text-[8px] text-muted-foreground">Joined</p>
                  <p className="font-pixel text-[10px] text-foreground mt-1">
                    {new Date(kol.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded min-w-[100px] text-center">
                  <p className="font-pixel text-[8px] text-muted-foreground">Reputation</p>
                  <p className={`font-pixel text-[10px] mt-1 ${isRotten ? 'text-primary' : 'text-accent'}`}>
                    {isRotten ? '🔥 ROTTEN' : '✨ FRESH'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="flex gap-2">
                  {isOnCooldown(kol.id) ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-muted-foreground font-pixel text-[10px] rounded">
                      <Clock className="w-4 h-4 animate-pulse" />
                      Cooldown: {formatCooldown(getCooldownRemaining(kol.id))}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleVote("up", e)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[10px] rounded transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Upvote
                      </button>
                      <button
                        onClick={(e) => handleVote("down", e)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[10px] rounded transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Downvote
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      toggleFavorite(kol.id);
                      toast.success(isFavorite(kol.id) ? "Removed from favorites" : "Added to favorites");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors font-pixel text-[10px] ${
                      isFavorite(kol.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(kol.id) ? "fill-current" : ""}`} />
                    {isFavorite(kol.id) ? "Favorited" : "Favorite"}
                  </button>
                  <button
                    onClick={() => {
                      toggleBlock(kol.id);
                      toast.success(isBlocked(kol.id) ? "KOL unblocked" : "KOL blocked - they won't appear in your feed");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors font-pixel text-[10px] ${
                      isBlocked(kol.id)
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    {isBlocked(kol.id) ? "Blocked" : "Block"}
                  </button>
                </div>
                <SocialShareButtons
                  kolName={kol.username}
                  kolHandle={kol.twitter_handle}
                  rating={rating}
                  isRotten={isRotten}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Write Review Section - moved up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card p-4 rounded-2xl mb-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Write a Review
            </h3>
            
            <div className="space-y-4">

                {/* Cooldown Warning */}
                {reviewCooldownRemaining > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/30">
                    <Clock className="w-4 h-4 text-primary animate-pulse" />
                    <span className="font-pixel text-[8px] text-primary">
                      Next review available in {formatReviewCooldown(reviewCooldownRemaining)}
                    </span>
                  </div>
                )}
                
                {/* Star Rating */}
                <div>
                  <label className="font-pixel text-[9px] text-muted-foreground mb-2 block">Your Rating</label>
                  {renderInteractiveStars()}
                </div>
                
                {/* Cited Trade */}
                {citedTrade && (
                  <div className="p-2 bg-secondary/10 border border-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-pixel text-[8px] text-secondary">Linked Trade</span>
                      <button
                        onClick={() => setCitedTrade(null)}
                        className="font-pixel text-[7px] text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[8px] text-foreground">
                        {citedTrade.tokenIn.symbol} → {citedTrade.tokenOut.symbol}
                      </span>
                      <a
                        href={`https://solscan.io/tx/${citedTrade.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-pixel text-[7px] text-accent hover:underline"
                      >
                        View TX
                      </a>
                    </div>
                  </div>
                )}
                
                {/* Review Text */}
                <div>
                  <label className="font-pixel text-[9px] text-muted-foreground mb-2 block">Your Review</label>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value.slice(0, 100))}
                    maxLength={100}
                    placeholder={citedTrade 
                      ? "Write your review about this trade..."
                      : "Share your experience with this KOL..."
                    }
                    className="w-full p-3 bg-muted/30 border border-muted rounded text-[11px] min-h-[60px] focus:outline-none focus:ring-1 focus:ring-secondary font-pixel resize-none"
                  />
                  <p className="font-pixel text-[7px] text-muted-foreground text-right mt-1">
                    {reviewContent.length}/100
                  </p>
                </div>
                
                {/* Image Upload */}
                <div>
                  <label className="font-pixel text-[9px] text-muted-foreground mb-2 block">Add Image (optional)</label>
                  {reviewImagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={reviewImagePreview} 
                        alt="Preview" 
                        className="max-h-32 rounded-lg object-cover"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-primary rounded-full text-primary-foreground hover:bg-primary/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors w-fit ${reviewCooldownRemaining > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      <span className="font-pixel text-[9px] text-muted-foreground">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={reviewCooldownRemaining > 0}
                      />
                    </label>
                  )}
                </div>
                
                {/* Submit Button */}
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || uploadingImage || !reviewContent.trim() || reviewRating === 0 || reviewCooldownRemaining > 0}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-secondary hover:bg-secondary/80 disabled:bg-muted disabled:cursor-not-allowed text-secondary-foreground font-pixel text-[10px] rounded transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {reviewCooldownRemaining > 0 ? `Wait ${formatReviewCooldown(reviewCooldownRemaining)}` : uploadingImage ? "Uploading..." : submittingReview ? "Submitting..." : "Submit Review"}
                </button>
            </div>
          </motion.div>

        {/* Tabs Section: Reviews & Latest Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card p-4 rounded-sm"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 mb-4">
              <TabsTrigger value="reviews" className="font-pixel text-[9px]">
                <MessageSquare className="w-3 h-3 mr-2" />
                Best Reviews ({comments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews">
              {/* Review Stats */}
              {(() => {
                const verifiedCount = comments.filter(c => c.user_profile?.is_verified).length;
                const unverifiedCount = comments.length - verifiedCount;
                return (
                  <div className="flex items-center gap-4 mb-4 p-2 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                      <span className="font-pixel text-[9px] text-accent">{verifiedCount} verified</span>
                      <span className="font-pixel text-[7px] text-muted-foreground">(affects rating)</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[9px] text-muted-foreground">{unverifiedCount} unverified</span>
                    </div>
                  </div>
                );
              })()}
              
              {/* Filters Row */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-pixel text-sm text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-secondary" />
                  Community Reviews
                </h3>
                <div className="flex items-center gap-2">
                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1 bg-muted/30 rounded-full px-2 py-1">
                    <Filter className="w-3 h-3 text-muted-foreground" />
                    <select
                      value={commentSortBy}
                      onChange={(e) => setCommentSortBy(e.target.value as 'newest' | 'most_liked' | 'most_disliked')}
                      className="bg-transparent font-pixel text-[8px] text-foreground border-none outline-none cursor-pointer"
                    >
                      <option value="newest">Newest</option>
                      <option value="most_liked">Most Liked</option>
                      <option value="most_disliked">Most Disliked</option>
                    </select>
                  </div>
                  {/* Verified Filter */}
                  <button
                    onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 font-pixel text-[8px] overflow-hidden ${
                      showVerifiedOnly
                        ? 'bg-gradient-to-r from-accent/30 to-secondary/30 text-accent border border-accent/50'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <ShieldCheck className={`w-3 h-3 transition-transform duration-300 ${showVerifiedOnly ? 'scale-110' : ''}`} />
                    <span>{showVerifiedOnly ? 'Verified' : 'All'}</span>
                  </button>
                </div>
              </div>
              
              {comments.filter(c => !showVerifiedOnly || c.user_profile?.is_verified).length === 0 ? (
                <p className="text-center font-pixel text-[10px] text-muted-foreground py-8">
                  {showVerifiedOnly ? 'No verified reviews yet.' : 'No reviews yet. Be the first to review!'}
                </p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {comments
                    .filter(c => !showVerifiedOnly || c.user_profile?.is_verified)
                    .sort((a, b) => {
                      if (commentSortBy === 'most_liked') {
                        return getVoteRatio(b.id) - getVoteRatio(a.id);
                      } else if (commentSortBy === 'most_disliked') {
                        return getVoteRatio(a.id) - getVoteRatio(b.id);
                      }
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((comment) => {
                      const isVerifiedReview = comment.user_profile?.is_verified || false;
                      const isKOLReply = kol?.wallet_address && comment.wallet_address === kol.wallet_address;
                      const isExpanded = replyingTo === comment.id;
                      
                      return (
                        <div key={comment.id} className={`rounded-lg transition-all duration-200 ${isKOLReply ? 'bg-secondary/10 border border-secondary/30' : 'bg-muted/30'}`}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Link 
                                to={`/user/${comment.wallet_address}`}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* User Avatar with Worn Badge */}
                                <div className="relative">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${isKOLReply ? 'ring-2 ring-secondary' : ''} bg-gradient-to-br from-primary/30 to-secondary/30`}>
                                    {comment.user_profile?.profile_pic_url ? (
                                      <img 
                                        src={comment.user_profile.profile_pic_url} 
                                        alt="User" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : kol?.profile_pic_url && isKOLReply ? (
                                      <img 
                                        src={kol.profile_pic_url} 
                                        alt="KOL" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="font-pixel text-[6px] text-primary">
                                        {(comment.user_profile?.display_name || comment.wallet_address).slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  {/* Worn Badge with Tooltip */}
                                  {!isKOLReply && comment.user_profile?.worn_badge && getBadgeById(comment.user_profile.worn_badge) && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full overflow-hidden border border-background shadow-sm group/badge">
                                      <img 
                                        src={getBadgeById(comment.user_profile.worn_badge)!.badgeImage} 
                                        alt="Badge"
                                        className="w-full h-full object-cover"
                                      />
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-50">
                                        <div className="px-2 py-1 rounded bg-popover border border-border shadow-lg min-w-[100px]">
                                          <p className="font-pixel text-[7px] text-foreground font-bold whitespace-nowrap">
                                            {getBadgeById(comment.user_profile.worn_badge)!.name}
                                          </p>
                                          <p className="font-pixel text-[5px] text-muted-foreground">
                                            {getBadgeById(comment.user_profile.worn_badge)!.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Reply indicator (simple, no KOL badge) */}
                                {isKOLReply && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/20 rounded">
                                    <Reply className="w-3 h-3 text-secondary" />
                                  </div>
                                )}
                                {!isKOLReply && isVerifiedReview && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/20 rounded">
                                    <ShieldCheck className="w-3 h-3 text-accent" />
                                    <span className="font-pixel text-[6px] text-accent">VERIFIED</span>
                                  </div>
                                )}
                                {!isKOLReply && !isVerifiedReview && (
                                  <ShieldAlert className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span className={`font-pixel text-[8px] ${isKOLReply ? 'text-secondary font-bold' : isVerifiedReview ? 'text-accent hover:underline' : 'text-muted-foreground hover:text-foreground'}`}>
                                  {isKOLReply ? kol?.username : (comment.user_profile?.display_name || `${comment.wallet_address.slice(0, 6)}...${comment.wallet_address.slice(-4)}`)}
                                </span>
                                {comment.rating && renderStars(comment.rating, "w-3 h-3")}
                              </Link>
                              <span className="font-pixel text-[7px] text-muted-foreground">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>
                            {/* Linked Trade */}
                            {comment.trade_signature && (
                              <a
                                href={`https://solscan.io/tx/${comment.trade_signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary/10 border border-secondary/30 rounded text-secondary hover:bg-secondary/20 transition-colors mb-2"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span className="font-pixel text-[7px]">
                                  Linked Trade: {comment.trade_signature.slice(0, 6)}...{comment.trade_signature.slice(-4)}
                                </span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            )}
                            <p className="font-pixel text-[9px] text-foreground leading-relaxed">
                              {comment.content}
                            </p>
                            {comment.image_url && (
                              <img
                                src={comment.image_url}
                                alt="Review attachment"
                                className="mt-3 max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxImage(comment.image_url)}
                              />
                            )}
                            
                            {/* Comment Actions - Vote buttons, Reply, Show replies */}
                            <div className="mt-3 flex items-center gap-4">
                              {/* Vote buttons */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => voteComment(comment.id, 'like')}
                                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-pixel text-[8px] ${
                                    voteCounts[comment.id]?.userVote === 'like'
                                      ? 'bg-accent/20 text-accent'
                                      : 'text-muted-foreground hover:text-accent hover:bg-accent/10'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{voteCounts[comment.id]?.likes || 0}</span>
                                </button>
                                <button
                                  onClick={() => voteComment(comment.id, 'dislike')}
                                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-pixel text-[8px] ${
                                    voteCounts[comment.id]?.userVote === 'dislike'
                                      ? 'bg-primary/20 text-primary'
                                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                                  }`}
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                  <span>{voteCounts[comment.id]?.dislikes || 0}</span>
                                </button>
                              </div>
                              
                              {isKOLOwner && !isKOLReply && (
                                <button
                                  onClick={() => setReplyingTo(isExpanded ? null : comment.id)}
                                  className="flex items-center gap-1.5 text-muted-foreground hover:text-secondary transition-colors font-pixel text-[8px]"
                                >
                                  <Reply className="w-3 h-3" />
                                  {isExpanded ? 'Cancel' : 'Reply'}
                                </button>
                              )}
                              {/* Toggle to show replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <button
                                  onClick={() => setExpandedReplies(prev => {
                                    const next = new Set(prev);
                                    if (next.has(comment.id)) next.delete(comment.id);
                                    else next.add(comment.id);
                                    return next;
                                  })}
                                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-pixel text-[8px]"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {expandedReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Nested replies - Reddit style with like/dislike */}
                          {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
                            <div className="ml-6 border-l-2 border-secondary/30 pl-4 py-2 space-y-3">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="bg-secondary/5 rounded p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Reply className="w-3 h-3 text-secondary" />
                                    <span className="font-pixel text-[8px] text-secondary">
                                      {kol?.username}
                                    </span>
                                    <span className="font-pixel text-[7px] text-muted-foreground">
                                      {formatTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="font-pixel text-[9px] text-foreground/90">{reply.content}</p>
                                  {/* Reply vote buttons */}
                                  <div className="mt-2 flex items-center gap-1">
                                    <button
                                      onClick={() => voteComment(reply.id, 'like')}
                                      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-pixel text-[7px] ${
                                        voteCounts[reply.id]?.userVote === 'like'
                                          ? 'bg-accent/20 text-accent'
                                          : 'text-muted-foreground hover:text-accent hover:bg-accent/10'
                                      }`}
                                    >
                                      <ThumbsUp className="w-2.5 h-2.5" />
                                      <span>{voteCounts[reply.id]?.likes || 0}</span>
                                    </button>
                                    <button
                                      onClick={() => voteComment(reply.id, 'dislike')}
                                      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-pixel text-[7px] ${
                                        voteCounts[reply.id]?.userVote === 'dislike'
                                          ? 'bg-primary/20 text-primary'
                                          : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                                      }`}
                                    >
                                      <ThumbsDown className="w-2.5 h-2.5" />
                                      <span>{voteCounts[reply.id]?.dislikes || 0}</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Expandable reply form - Reddit style */}
                          {isExpanded && isKOLOwner && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border/30 p-4 bg-muted/20"
                            >
                              <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 ring-2 ring-secondary">
                                  {kol?.profile_pic_url ? (
                                    <img src={kol.profile_pic_url} alt="You" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-secondary/30 flex items-center justify-center">
                                      <span className="font-pixel text-[6px] text-secondary">YOU</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value.slice(0, 500))}
                                    placeholder="Write your reply..."
                                    className="w-full p-2 bg-muted/30 border border-border rounded font-pixel text-[9px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-secondary/50"
                                    rows={2}
                                  />
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="font-pixel text-[7px] text-muted-foreground">
                                      {replyContent.length}/500
                                    </span>
                                    <button
                                      onClick={async () => {
                                        if (!replyContent.trim() || !userId || !kol) return;
                                        
                                        const { error } = await supabase
                                          .from('kol_comments')
                                          .insert({
                                            kol_id: kol.id,
                                            wallet_address: userId,
                                            content: replyContent,
                                            rating: null,
                                            parent_comment_id: comment.id
                                          });
                                        
                                        if (error) {
                                          toast.error("Failed to post reply");
                                        } else {
                                          toast.success("Reply posted!");
                                          setReplyContent("");
                                          setReplyingTo(null);
                                          // Auto-expand replies for this comment
                                          setExpandedReplies(prev => new Set([...prev, comment.id]));
                                          fetchComments(kol.id);
                                        }
                                      }}
                                      disabled={!replyContent.trim()}
                                      className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 disabled:bg-muted disabled:cursor-not-allowed text-secondary-foreground font-pixel text-[8px] rounded transition-colors flex items-center gap-1.5"
                                    >
                                      <Send className="w-3 h-3" />
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      
      {/* Image Lightbox */}
      <ImageLightbox 
        imageUrl={lightboxImage} 
        onClose={() => setLightboxImage(null)} 
      />
    </PageLayout>
  );
}
