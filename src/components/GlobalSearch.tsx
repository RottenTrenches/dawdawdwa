import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, User, Gift, ArrowRight, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
}

interface Bounty {
  id: string;
  title: string;
  reward: string;
  status: string;
}

interface UserProfile {
  wallet_address: string;
  display_name: string | null;
  profile_pic_url: string | null;
  is_verified: boolean | null;
}

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kols, setKols] = useState<KOL[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setKols([]);
      setBounties([]);
      setUsers([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      const searchTerm = query.toLowerCase();

      // Search KOLs
      const { data: kolData } = await supabase
        .from('kols')
        .select('id, username, twitter_handle, profile_pic_url, rating')
        .or(`username.ilike.%${searchTerm}%,twitter_handle.ilike.%${searchTerm}%`)
        .limit(5);

      // Search Bounties
      const { data: bountyData } = await supabase
        .from('bounties')
        .select('id, title, reward, status')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(3);

      // Search User Profiles (by wallet address or display name)
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('wallet_address, display_name, profile_pic_url, is_verified')
        .eq('is_profile_public', true)
        .or(`display_name.ilike.%${searchTerm}%,wallet_address.ilike.%${searchTerm}%`)
        .limit(5);

      setKols(kolData || []);
      setBounties(bountyData || []);
      setUsers(userData || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleKolClick = (id: string) => {
    navigate(`/kol/${id}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleBountyClick = () => {
    navigate('/bounties');
    setIsOpen(false);
    setQuery("");
  };

  const handleUserClick = (walletAddress: string) => {
    navigate(`/user/${walletAddress}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
  };

  const hasResults = kols.length > 0 || bounties.length > 0 || users.length > 0;

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 hover:bg-muted/50 border border-border/50 rounded transition-colors group"
      >
        <Search className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="font-pixel text-[8px] text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">
          Search...
        </span>
        <kbd className="hidden md:inline font-pixel text-[6px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="w-full max-w-lg stat-card rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="relative border-b border-border">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search KOLs, bounties..."
                  className="pl-11 pr-10 py-4 font-pixel text-[11px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  onClick={handleClose}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {loading && (
                  <div className="p-4 text-center">
                    <span className="font-pixel text-[9px] text-muted-foreground">Searching...</span>
                  </div>
                )}

                {!loading && query && !hasResults && (
                  <div className="p-6 text-center">
                    <span className="font-pixel text-[9px] text-muted-foreground">No results found</span>
                  </div>
                )}

                {!loading && hasResults && (
                  <div className="divide-y divide-border/50">
                    {/* KOLs Section */}
                    {kols.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 font-pixel text-[7px] text-muted-foreground uppercase">KOLs</p>
                        {kols.map((kol) => (
                          <button
                            key={kol.id}
                            onClick={() => handleKolClick(kol.id)}
                            className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/30 rounded transition-colors group"
                          >
                            <User className="w-4 h-4 text-primary" />
                            <img
                              src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                              alt={kol.username}
                              className="w-6 h-6 rounded-full border border-border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                              }}
                            />
                            <div className="flex-1 text-left">
                              <p className="font-pixel text-[9px] text-foreground">{kol.username}</p>
                              <p className="font-pixel text-[7px] text-muted-foreground">{kol.twitter_handle}</p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Users Section */}
                    {users.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 font-pixel text-[7px] text-muted-foreground uppercase">Users</p>
                        {users.map((user) => (
                          <button
                            key={user.wallet_address}
                            onClick={() => handleUserClick(user.wallet_address)}
                            className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/30 rounded transition-colors group"
                          >
                            <Wallet className="w-4 h-4 text-accent" />
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                              {user.profile_pic_url ? (
                                <img 
                                  src={user.profile_pic_url} 
                                  alt={user.display_name || "User"} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-pixel text-[6px] text-primary">
                                  {(user.display_name || user.wallet_address).slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-pixel text-[9px] text-foreground">
                                {user.display_name || `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
                              </p>
                              <p className="font-pixel text-[7px] text-muted-foreground">
                                {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                              </p>
                            </div>
                            {user.is_verified && (
                              <span className="font-pixel text-[6px] text-accent px-2 py-0.5 bg-accent/20 rounded">
                                VERIFIED
                              </span>
                            )}
                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bounties Section */}
                    {bounties.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 font-pixel text-[7px] text-muted-foreground uppercase">Bounties</p>
                        {bounties.map((bounty) => (
                          <button
                            key={bounty.id}
                            onClick={handleBountyClick}
                            className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/30 rounded transition-colors group"
                          >
                            <Gift className="w-4 h-4 text-secondary" />
                            <div className="flex-1 text-left">
                              <p className="font-pixel text-[9px] text-foreground">{bounty.title}</p>
                              <p className="font-pixel text-[7px] text-accent">{bounty.reward}</p>
                            </div>
                            <span className="font-pixel text-[6px] text-muted-foreground px-2 py-0.5 bg-muted rounded">
                              {bounty.status}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Links when no query */}
                {!query && (
                  <div className="p-4">
                    <p className="font-pixel text-[7px] text-muted-foreground uppercase mb-2">Quick Links</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => { navigate('/add'); handleClose(); }}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/30 rounded transition-colors text-left"
                      >
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-pixel text-[9px] text-foreground">Browse All KOLs</span>
                      </button>
                      <button
                        onClick={() => { navigate('/bounties'); handleClose(); }}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/30 rounded transition-colors text-left"
                      >
                        <Gift className="w-4 h-4 text-secondary" />
                        <span className="font-pixel text-[9px] text-foreground">View Bounties</span>
                      </button>
                      <button
                        onClick={() => { navigate('/compare'); handleClose(); }}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/30 rounded transition-colors text-left"
                      >
                        <Search className="w-4 h-4 text-accent" />
                        <span className="font-pixel text-[9px] text-foreground">Compare KOLs</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
