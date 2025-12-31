import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageLayout } from "@/components/PageLayout";
import { 
  User, 
  ArrowLeft, 
  MessageSquare, 
  Star,
  ShieldCheck,
  ExternalLink,
  Wallet,
  Clock,
  UserPlus,
  UserMinus,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useFriends } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { getBadgeById } from "@/hooks/useWornBadge";

interface UserProfileData {
  wallet_address: string;
  display_name: string | null;
  profile_pic_url: string | null;
  is_profile_public: boolean | null;
  is_verified: boolean | null;
  created_at: string;
  worn_badge?: string | null;
}

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

export default function UserProfile() {
  const { walletAddress } = useParams<{ walletAddress: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentUserWallet = publicKey?.toBase58() || null;
  const { isFriend, addFriend, removeFriend, loading: friendLoading } = useFriends(currentUserWallet);
  const isOwnProfile = currentUserWallet === walletAddress;

  useEffect(() => {
    if (walletAddress) {
      fetchUserProfile();
    }
  }, [walletAddress]);

  const fetchUserProfile = async () => {
    if (!walletAddress) return;

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (profileError) {
      toast.error("Failed to load profile");
      setLoading(false);
      return;
    }

    // Check if profile is public or if it exists
    if (!profileData) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (profileData.is_profile_public === false) {
      setProfile({ ...profileData, is_profile_public: false });
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // Fetch user's comments
    const { data: commentsData } = await supabase
      .from('kol_comments')
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
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(20);

    if (commentsData) {
      setComments(commentsData as UserComment[]);
    }

    setLoading(false);
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="font-pixel text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-pixel text-[10px]">Back</span>
          </motion.button>
          
          <div className="text-center py-12">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-pixel text-xl text-foreground mb-2">Profile Not Found</h1>
            <p className="font-pixel text-[10px] text-muted-foreground">
              This user hasn't created a profile yet.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (profile.is_profile_public === false) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-pixel text-[10px]">Back</span>
          </motion.button>
          
          <div className="text-center py-12">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h1 className="font-pixel text-xl text-foreground mb-2">Private Profile</h1>
            <p className="font-pixel text-[10px] text-muted-foreground">
              This user has set their profile to private.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
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
          className="stat-card p-8 rounded-lg mb-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar with worn badge */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center border-2 border-primary/50 overflow-hidden">
                {profile.profile_pic_url ? (
                  <img 
                    src={profile.profile_pic_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary" />
                )}
              </div>
              {/* Worn Badge with Tooltip */}
              {profile.worn_badge && getBadgeById(profile.worn_badge) && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full overflow-hidden border-2 border-background shadow-lg group/badge">
                  <img 
                    src={getBadgeById(profile.worn_badge)!.badgeImage} 
                    alt="Badge"
                    className="w-full h-full object-cover"
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="px-2 py-1 rounded bg-popover border border-border shadow-lg min-w-[120px]">
                      <p className="font-pixel text-[8px] text-foreground font-bold whitespace-nowrap">
                        {getBadgeById(profile.worn_badge)!.name}
                      </p>
                      <p className="font-pixel text-[6px] text-muted-foreground">
                        {getBadgeById(profile.worn_badge)!.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <h1 className="font-pixel text-xl text-foreground">
                  {profile.display_name || "Anonymous User"}
                </h1>
                {profile.is_verified && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-accent/20 rounded">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span className="font-pixel text-[8px] text-accent">VERIFIED</span>
                  </div>
                )}
              </div>

              {/* Wallet Address - Clickable to copy */}
              <button
                onClick={() => {
                  if (walletAddress) {
                    navigator.clipboard.writeText(walletAddress);
                    toast.success("Wallet address copied!");
                  }
                }}
                className="flex items-center gap-2 justify-center md:justify-start hover:bg-muted/30 px-2 py-1 rounded transition-colors cursor-pointer group"
                title="Click to copy wallet address"
              >
                <Wallet className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                <span className="font-pixel text-[10px] text-accent group-hover:text-foreground transition-colors">
                  {truncatedAddress}
                </span>
              </button>

              {/* Stats & Friend Button */}
              <div className="flex items-center gap-4 justify-center md:justify-start mt-4 flex-wrap">
                <div className="text-center">
                  <p className="font-pixel text-lg text-primary">{comments.length}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">COMMENTS</p>
                </div>
                <div className="text-center">
                  <p className="font-pixel text-[9px] text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Joined {format(new Date(profile.created_at), "MMM yyyy")}
                  </p>
                </div>
              </div>

              {/* Friend Status / Add Friend Button */}
              {!isOwnProfile && profile.is_verified && currentUserWallet && (
                <div className="mt-4">
                  {isFriend(walletAddress!) ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/20 rounded-lg border border-secondary/30">
                        <Users className="w-4 h-4 text-secondary" />
                        <span className="font-pixel text-[9px] text-secondary">FRIENDS</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFriend(walletAddress!)}
                        disabled={friendLoading}
                        className="font-pixel text-[8px] text-muted-foreground hover:text-destructive gap-1"
                      >
                        <UserMinus className="w-3 h-3" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => addFriend(walletAddress!)}
                      disabled={friendLoading}
                      className="font-pixel text-[9px] gap-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30"
                      variant="outline"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </Button>
                  )}
                </div>
              )}
              {!isOwnProfile && !profile.is_verified && currentUserWallet && (
                <p className="font-pixel text-[7px] text-muted-foreground mt-3">
                  Only verified users can be added as friends
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card p-6 rounded-lg"
        >
          <h2 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-secondary" />
            Recent Reviews
          </h2>

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-pixel text-[10px] text-muted-foreground">
                No reviews yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Link
                  key={comment.id}
                  to={`/kol/${comment.kol_id}`}
                  className="block border border-border/30 rounded-lg p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* KOL Info */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden shrink-0">
                      {comment.kols?.profile_pic_url ? (
                        <img 
                          src={comment.kols.profile_pic_url} 
                          alt={comment.kols.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-pixel text-[10px] text-foreground">
                          @{comment.kols?.twitter_handle || "Unknown"}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                      
                      {comment.rating && (
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-3 h-3 ${
                                i < comment.rating! 
                                  ? "text-yellow-400 fill-yellow-400" 
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      
                      <p className="font-pixel text-[9px] text-foreground/80 break-words">
                        {comment.content}
                      </p>
                      
                      <p className="font-pixel text-[7px] text-muted-foreground mt-2">
                        {format(new Date(comment.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </PageLayout>
  );
}
