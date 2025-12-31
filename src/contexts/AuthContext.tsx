import { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import bs58 from 'bs58';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isAuthReady: boolean;
  session: Session | null;
  user: User | null;
  walletAddress: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const disconnectTimerRef = useRef<number | null>(null);

  const walletAddress = publicKey?.toBase58() || null;

  // Listen for auth state changes and hydrate existing session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthReady(true);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // If the connected wallet differs from the wallet used to authenticate, sign out (safety)
  useEffect(() => {
    if (!session) return;
    const authedWallet = (session.user?.user_metadata as any)?.wallet_address as string | undefined;

    if (walletAddress && authedWallet && walletAddress !== authedWallet) {
      supabase.auth.signOut().then(() => {
        setSession(null);
        setUser(null);
      });
    }
  }, [walletAddress, session]);

  // Wallet adapters can briefly report disconnected during refresh; debounce sign-out to avoid auth loops.
  useEffect(() => {
    if (disconnectTimerRef.current) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    if (!walletAddress && session) {
      disconnectTimerRef.current = window.setTimeout(() => {
        supabase.auth.signOut().then(() => {
          setSession(null);
          setUser(null);
        });
      }, 3000);
    }

    return () => {
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };
  }, [walletAddress, session]);

  const signIn = async (): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (isAuthenticating) {
      return false;
    }

    setIsAuthenticating(true);

    try {
      const walletAddr = publicKey.toBase58();

      // Create a message to sign
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Sign this message to authenticate with KOL Platform.\n\nWallet: ${walletAddr}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Request signature from wallet
      const messageBytes = new TextEncoder().encode(message);
      let signature: string;

      try {
        const signatureBytes = await signMessage(messageBytes);
        signature = bs58.encode(signatureBytes);
      } catch (signError: any) {
        if (signError?.message?.includes('User rejected')) {
          toast.error('Signature request was rejected');
        } else {
          toast.error('Failed to sign message');
          console.error('Sign error:', signError);
        }
        setIsAuthenticating(false);
        return false;
      }

      // Call the edge function to verify and authenticate
      const { data, error } = await supabase.functions.invoke('wallet-auth', {
        body: {
          wallet_address: walletAddr,
          message,
          signature,
        },
      });

      if (error) {
        console.error('Wallet auth error:', error);
        toast.error('Authentication failed. Please try again.', {
          action: {
            label: 'Retry',
            onClick: () => signIn(),
          },
        });
        setIsAuthenticating(false);
        return false;
      }

      if (!data?.success || !data?.session) {
        console.error('Invalid auth response:', data);
        const errorMsg = data?.error || 'Authentication failed';
        toast.error(errorMsg, {
          action: {
            label: 'Retry',
            onClick: () => signIn(),
          },
        });
        setIsAuthenticating(false);
        return false;
      }

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error('Session set error:', sessionError);
        toast.error('Failed to establish session');
        setIsAuthenticating(false);
        return false;
      }

      // Immediately hydrate local state to avoid "not authenticated yet" flicker
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsAuthReady(true);

      toast.success('Wallet authenticated successfully!');
      setIsAuthenticating(false);
      return true;
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Authentication failed');
      setIsAuthenticating(false);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      // Optionally disconnect wallet
      if (disconnect) {
        await disconnect();
      }
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isAuthenticating,
        isAuthReady,
        session,
        user,
        walletAddress,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
