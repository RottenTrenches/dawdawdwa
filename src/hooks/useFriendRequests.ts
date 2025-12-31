import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FriendRequest {
  id: string;
  requester_wallet: string;
  requested_wallet: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
  requester_profile?: {
    display_name: string | null;
    profile_pic_url: string | null;
    is_verified: boolean;
  };
  requested_profile?: {
    display_name: string | null;
    profile_pic_url: string | null;
    is_verified: boolean;
  };
}

export function useFriendRequests(userWallet: string | null) {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!userWallet) return;

    setLoading(true);
    try {
      // Fetch incoming pending requests
      const { data: incoming, error: incomingError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_wallet', userWallet)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      // Fetch outgoing pending requests
      const { data: outgoing, error: outgoingError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requester_wallet', userWallet)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      // Get all wallet addresses to fetch profiles
      const wallets = [
        ...(incoming?.map(r => r.requester_wallet) || []),
        ...(outgoing?.map(r => r.requested_wallet) || []),
      ];

      if (wallets.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('wallet_address, display_name, profile_pic_url, is_verified')
          .in('wallet_address', wallets);

        const profileMap = new Map(
          profiles?.map(p => [p.wallet_address, p]) || []
        );

        // Attach profiles to requests
        const incomingWithProfiles = incoming?.map(r => ({
          ...r,
          requester_profile: profileMap.get(r.requester_wallet),
        })) || [];

        const outgoingWithProfiles = outgoing?.map(r => ({
          ...r,
          requested_profile: profileMap.get(r.requested_wallet),
        })) || [];

        setIncomingRequests(incomingWithProfiles as FriendRequest[]);
        setOutgoingRequests(outgoingWithProfiles as FriendRequest[]);
      } else {
        setIncomingRequests([]);
        setOutgoingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  }, [userWallet]);

  const sendRequest = async (targetWallet: string): Promise<boolean> => {
    if (!userWallet) {
      toast.error('Please connect your wallet');
      return false;
    }

    if (userWallet === targetWallet) {
      toast.error("You can't send a friend request to yourself");
      return false;
    }

    // Check if target user is verified
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('is_verified')
      .eq('wallet_address', targetWallet)
      .maybeSingle();

    if (!targetProfile?.is_verified) {
      toast.error('You can only send requests to verified users');
      return false;
    }

    // Check if already friends
    const { data: existingFriend } = await supabase
      .from('user_friends')
      .select('id')
      .eq('user_wallet', userWallet)
      .eq('friend_wallet', targetWallet)
      .maybeSingle();

    if (existingFriend) {
      toast.info('Already friends!');
      return false;
    }

    // Check for existing pending request (either direction)
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status, requester_wallet')
      .or(`and(requester_wallet.eq.${userWallet},requested_wallet.eq.${targetWallet}),and(requester_wallet.eq.${targetWallet},requested_wallet.eq.${userWallet})`)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.requester_wallet === targetWallet) {
        toast.info('This user already sent you a request! Check your incoming requests.');
      } else {
        toast.info('Request already sent!');
      }
      return false;
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        requester_wallet: userWallet,
        requested_wallet: targetWallet,
      });

    if (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
      return false;
    }

    toast.success('Friend request sent!');
    fetchRequests();
    return true;
  };

  const acceptRequest = async (requestId: string): Promise<boolean> => {
    if (!userWallet) return false;

    const { data, error } = await supabase.rpc('accept_friend_request', {
      p_request_id: requestId,
      p_wallet_address: userWallet,
    });

    if (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
      return false;
    }

    const result = data as { success: boolean; error?: string } | null;
    if (!result?.success) {
      toast.error(result?.error || 'Failed to accept friend request');
      return false;
    }

    toast.success('Friend request accepted!');
    fetchRequests();
    return true;
  };

  const declineRequest = async (requestId: string): Promise<boolean> => {
    if (!userWallet) return false;

    const { data, error } = await supabase.rpc('decline_friend_request', {
      p_request_id: requestId,
      p_wallet_address: userWallet,
    });

    if (error) {
      console.error('Error declining friend request:', error);
      toast.error('Failed to decline friend request');
      return false;
    }

    const result = data as { success: boolean; error?: string } | null;
    if (!result?.success) {
      toast.error(result?.error || 'Failed to decline friend request');
      return false;
    }

    toast.success('Friend request declined');
    fetchRequests();
    return true;
  };

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!userWallet) return;

    const channel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        (payload) => {
          const record = (payload.new || payload.old) as FriendRequest | undefined;
          if (
            record &&
            (record.requester_wallet === userWallet || record.requested_wallet === userWallet)
          ) {
            fetchRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userWallet, fetchRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    refetch: fetchRequests,
  };
}
