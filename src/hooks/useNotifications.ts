import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'user_notifications';
const ADDED_KOLS_KEY = 'user_added_kols';
const VERIFIED_KOLS_KEY = 'user_verified_kols';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'kol_added' | 'comment_received' | 'vote_received' | 'verified_comment' | 'friend_added' | 'friend_request' | 'friend_request_accepted' | 'new_message';
  link?: string;
}

export function useNotifications() {
  const { publicKey } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: Notification[] = JSON.parse(stored);
        setNotifications(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Track KOLs added by this user
  const trackAddedKol = useCallback((kolId: string) => {
    const stored = localStorage.getItem(ADDED_KOLS_KEY);
    const addedKols: string[] = stored ? JSON.parse(stored) : [];
    if (!addedKols.includes(kolId)) {
      addedKols.push(kolId);
      localStorage.setItem(ADDED_KOLS_KEY, JSON.stringify(addedKols));
    }
  }, []);

  const getAddedKols = useCallback((): string[] => {
    const stored = localStorage.getItem(ADDED_KOLS_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  // Track KOLs where user's wallet is verified
  const trackVerifiedKol = useCallback((kolId: string) => {
    const stored = localStorage.getItem(VERIFIED_KOLS_KEY);
    const verifiedKols: string[] = stored ? JSON.parse(stored) : [];
    if (!verifiedKols.includes(kolId)) {
      verifiedKols.push(kolId);
      localStorage.setItem(VERIFIED_KOLS_KEY, JSON.stringify(verifiedKols));
    }
  }, []);

  const getVerifiedKols = useCallback((): string[] => {
    const stored = localStorage.getItem(VERIFIED_KOLS_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  // Add a notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Set up realtime subscription for comments on KOLs the user added
  useEffect(() => {
    const addedKols = getAddedKols();
    if (addedKols.length === 0) return;

    const channel = supabase
      .channel('user-kol-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kol_comments',
        },
        async (payload) => {
          const comment = payload.new as { kol_id: string; wallet_address: string; content: string };
          
          // Check if this comment is on a KOL the user added
          if (addedKols.includes(comment.kol_id)) {
            // Don't notify for own comments
            if (publicKey && comment.wallet_address === publicKey.toBase58()) {
              return;
            }

            // Fetch KOL name for the notification
            const { data: kol } = await supabase
              .from('kols')
              .select('username')
              .eq('id', comment.kol_id)
              .single();

            addNotification({
              title: 'New Comment',
              message: `Someone commented on ${kol?.username || 'your KOL'}: "${comment.content.slice(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
              type: 'comment_received',
              link: `/kol/${comment.kol_id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification, getAddedKols]);

  // Listen for votes on KOLs the user added
  useEffect(() => {
    const addedKols = getAddedKols();
    if (addedKols.length === 0) return;

    const channel = supabase
      .channel('user-kol-votes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kol_votes',
        },
        async (payload) => {
          const vote = payload.new as { kol_id: string; wallet_address: string; vote_type: string };
          
          // Check if this vote is on a KOL the user added
          if (addedKols.includes(vote.kol_id)) {
            // Don't notify for own votes
            if (publicKey && vote.wallet_address === publicKey.toBase58()) {
              return;
            }

            // Fetch KOL name
            const { data: kol } = await supabase
              .from('kols')
              .select('username')
              .eq('id', vote.kol_id)
              .single();

            addNotification({
              title: vote.vote_type === 'up' ? '👍 New Upvote' : '👎 New Downvote',
              message: `Someone ${vote.vote_type === 'up' ? 'upvoted' : 'downvoted'} ${kol?.username || 'your KOL'}`,
              type: 'vote_received',
              link: `/kol/${vote.kol_id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification, getAddedKols]);

  // Listen for comments on KOLs where user's wallet is verified
  useEffect(() => {
    const verifiedKols = getVerifiedKols();
    if (verifiedKols.length === 0) return;

    const channel = supabase
      .channel('verified-kol-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kol_comments',
        },
        async (payload) => {
          const comment = payload.new as { kol_id: string; wallet_address: string; content: string };
          
          // Check if this comment is on a KOL where user's wallet is verified
          if (verifiedKols.includes(comment.kol_id)) {
            // Don't notify for own comments
            if (publicKey && comment.wallet_address === publicKey.toBase58()) {
              return;
            }

            // Fetch KOL name
            const { data: kol } = await supabase
              .from('kols')
              .select('username')
              .eq('id', comment.kol_id)
              .single();

            addNotification({
              title: '💬 Comment on Your Verified Profile',
              message: `New comment on ${kol?.username || 'your profile'}: "${comment.content.slice(0, 40)}${comment.content.length > 40 ? '...' : ''}"`,
              type: 'verified_comment',
              link: `/kol/${comment.kol_id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification, getVerifiedKols]);

  // Listen for when someone adds the current user as a friend (legacy - keeping for backward compat)
  useEffect(() => {
    if (!publicKey) return;
    const walletAddress = publicKey.toBase58();

    const channel = supabase
      .channel('friend-added-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_friends',
        },
        async (payload) => {
          const friendship = payload.new as { user_wallet: string; friend_wallet: string };
          
          // Check if current user was added as a friend
          if (friendship.friend_wallet === walletAddress) {
            // Fetch the user who added us
            const { data: adderProfile } = await supabase
              .from('user_profiles')
              .select('display_name, wallet_address')
              .eq('wallet_address', friendship.user_wallet)
              .maybeSingle();

            const adderName = adderProfile?.display_name || 
              `${friendship.user_wallet.slice(0, 6)}...${friendship.user_wallet.slice(-4)}`;

            addNotification({
              title: '👋 New Friend',
              message: `${adderName} is now your friend!`,
              type: 'friend_added',
              link: `/user/${friendship.user_wallet}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification]);

  // Listen for new friend requests
  useEffect(() => {
    if (!publicKey) return;
    const walletAddress = publicKey.toBase58();

    const channel = supabase
      .channel('friend-request-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
        },
        async (payload) => {
          const request = payload.new as { requester_wallet: string; requested_wallet: string };
          
          // Check if current user received a friend request
          if (request.requested_wallet === walletAddress) {
            const { data: requesterProfile } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('wallet_address', request.requester_wallet)
              .maybeSingle();

            const requesterName = requesterProfile?.display_name || 
              `${request.requester_wallet.slice(0, 6)}...${request.requester_wallet.slice(-4)}`;

            addNotification({
              title: '📩 Friend Request',
              message: `${requesterName} wants to be your friend!`,
              type: 'friend_request',
              link: '/profile',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification]);

  // Listen for accepted friend requests (when someone accepts our request)
  useEffect(() => {
    if (!publicKey) return;
    const walletAddress = publicKey.toBase58();

    const channel = supabase
      .channel('friend-request-accepted-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
        },
        async (payload) => {
          const request = payload.new as { requester_wallet: string; requested_wallet: string; status: string };
          
          // Check if current user's request was accepted
          if (request.requester_wallet === walletAddress && request.status === 'accepted') {
            const { data: accepterProfile } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('wallet_address', request.requested_wallet)
              .maybeSingle();

            const accepterName = accepterProfile?.display_name || 
              `${request.requested_wallet.slice(0, 6)}...${request.requested_wallet.slice(-4)}`;

            addNotification({
              title: '✅ Request Accepted',
              message: `${accepterName} accepted your friend request!`,
              type: 'friend_request_accepted',
              link: `/user/${request.requested_wallet}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification]);

  // Listen for new messages
  useEffect(() => {
    if (!publicKey) return;
    const walletAddress = publicKey.toBase58();

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_messages',
        },
        async (payload) => {
          const message = payload.new as { sender_wallet: string; receiver_wallet: string; content: string };
          
          // Check if current user received a message
          if (message.receiver_wallet === walletAddress) {
            const { data: senderProfile } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('wallet_address', message.sender_wallet)
              .maybeSingle();

            const senderName = senderProfile?.display_name || 
              `${message.sender_wallet.slice(0, 6)}...${message.sender_wallet.slice(-4)}`;

            addNotification({
              title: '💬 New Message',
              message: `${senderName}: "${message.content.slice(0, 40)}${message.content.length > 40 ? '...' : ''}"`,
              type: 'new_message',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    trackAddedKol,
    trackVerifiedKol,
  };
}
