import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Loader2, Wallet, User, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRequests } from '@/hooks/useFriendRequests';

interface UserSearchResult {
  wallet_address: string;
  display_name: string | null;
  profile_pic_url: string | null;
  is_verified: boolean;
}

interface AddFriendSectionProps {
  userWallet: string;
}

export function AddFriendSection({ userWallet }: AddFriendSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPasteWallet, setShowPasteWallet] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [isAddingByWallet, setIsAddingByWallet] = useState(false);
  const [sendingToWallet, setSendingToWallet] = useState<string | null>(null);
  
  const { isFriend } = useFriends(userWallet);
  const { sendRequest, outgoingRequests } = useFriendRequests(userWallet);

  const hasPendingRequest = (wallet: string) => 
    outgoingRequests.some(r => r.requested_wallet === wallet);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('wallet_address, display_name, profile_pic_url, is_verified')
        .ilike('display_name', `%${searchQuery.trim()}%`)
        .neq('wallet_address', userWallet)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddByWallet = async () => {
    if (!walletInput.trim()) {
      toast.error('Please enter a wallet address');
      return;
    }

    // Basic Solana wallet validation (32-44 chars, base58)
    const walletRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!walletRegex.test(walletInput.trim())) {
      toast.error('Invalid wallet address format');
      return;
    }

    setIsAddingByWallet(true);
    const success = await sendRequest(walletInput.trim());
    if (success) {
      setWalletInput('');
      setShowPasteWallet(false);
    }
    setIsAddingByWallet(false);
  };

  const handleSendRequest = async (walletAddress: string) => {
    setSendingToWallet(walletAddress);
    await sendRequest(walletAddress);
    // Remove from results after sending
    setSearchResults(prev => prev.filter(u => u.wallet_address !== walletAddress));
    setSendingToWallet(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-pixel text-[10px] text-foreground mb-3">Add Friends</h3>

      {/* Toggle between search and paste wallet */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={!showPasteWallet ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPasteWallet(false)}
          className="font-pixel text-[8px] gap-1 flex-1"
        >
          <Search className="w-3 h-3" />
          Search Name
        </Button>
        <Button
          variant={showPasteWallet ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPasteWallet(true)}
          className="font-pixel text-[8px] gap-1 flex-1"
        >
          <Wallet className="w-3 h-3" />
          Paste Wallet
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!showPasteWallet ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Search by name */}
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by display name..."
                className="font-pixel text-[9px]"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                size="sm"
                className="font-pixel text-[8px] gap-1"
              >
                {isSearching ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 max-h-[200px] overflow-y-auto"
              >
                {searchResults.map((user) => (
                  <div
                    key={user.wallet_address}
                    className="flex items-center justify-between p-2 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {user.profile_pic_url ? (
                          <img
                            src={user.profile_pic_url}
                            alt={user.display_name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-pixel text-[9px] text-foreground">
                          {user.display_name || 'Anonymous'}
                          {!user.is_verified && (
                            <span className="ml-1 text-[7px] text-muted-foreground">(unverified)</span>
                          )}
                        </p>
                        <p className="font-pixel text-[7px] text-muted-foreground">
                          {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(user.wallet_address)}
                      disabled={sendingToWallet === user.wallet_address || isFriend(user.wallet_address) || hasPendingRequest(user.wallet_address) || !user.is_verified}
                      className="font-pixel text-[7px] gap-1"
                    >
                      {isFriend(user.wallet_address) ? (
                        'Friends'
                      ) : hasPendingRequest(user.wallet_address) ? (
                        'Pending'
                      ) : sendingToWallet === user.wallet_address ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          Request
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* No results */}
            {searchResults.length === 0 && searchQuery && !isSearching && (
              <p className="font-pixel text-[8px] text-muted-foreground text-center py-4">
                No users found with that name
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Paste wallet address */}
            <div className="flex gap-2">
              <Input
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddByWallet()}
                placeholder="Paste wallet address..."
                className="font-pixel text-[9px] font-mono"
              />
              <Button
                onClick={handleAddByWallet}
                disabled={isAddingByWallet || !walletInput.trim()}
                size="sm"
                className="font-pixel text-[8px] gap-1"
              >
                {isAddingByWallet ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
              </Button>
            </div>
            <p className="font-pixel text-[7px] text-muted-foreground">
              Note: Only verified users can be added as friends
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
