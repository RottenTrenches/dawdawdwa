import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Wallet, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';

export const WalletButton = () => {
  const { publicKey, disconnect, connecting, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { isAuthenticated, isAuthenticating, isAuthReady, signIn, signOut } = useAuth();
  const lastAutoAttemptWallet = useRef<string | null>(null);

  // Auto-authenticate once per wallet (prevents repeated signature popups)
  useEffect(() => {
    const wallet = publicKey?.toBase58() ?? null;

    // Don't reset lastAutoAttemptWallet on transient disconnects; some wallets briefly flip connected.
    if (!connected || !wallet) return;

    // Wait until auth session hydration has completed before attempting auto-auth.
    if (!isAuthReady) return;

    if (!isAuthenticated && !isAuthenticating && lastAutoAttemptWallet.current !== wallet) {
      lastAutoAttemptWallet.current = wallet;
      const timer = setTimeout(() => {
        signIn();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [connected, publicKey, isAuthReady, isAuthenticated, isAuthenticating, signIn]);


  const handleClick = async () => {
    if (publicKey) {
      if (isAuthenticated) {
        await signOut();
      } else {
        await signIn();
      }
    } else {
      setVisible(true);
    }
  };

  const truncatedAddress = publicKey 
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const isLoading = connecting || isAuthenticating;

  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/50 text-accent hover:bg-accent/30 transition-all duration-200 rounded"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading}
    >
      {publicKey ? (
        <>
          {isAuthenticating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isAuthenticated ? (
            <ShieldCheck className="w-4 h-4 text-green-500" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="font-pixel text-[8px] uppercase">
            {isAuthenticating ? 'Signing...' : truncatedAddress}
          </span>
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          <span className="font-pixel text-[8px] uppercase">
            {connecting ? 'Connecting...' : 'Connect'}
          </span>
        </>
      )}
    </motion.button>
  );
};