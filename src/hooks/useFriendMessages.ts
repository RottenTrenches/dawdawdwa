import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_wallet: string;
  receiver_wallet: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  friendWallet: string;
  friendName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export function useFriendMessages(userWallet: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userWallet) return;
    
    setLoading(true);
    
    // Fetch all messages involving the user
    const { data: allMessages, error } = await supabase
      .from('friend_messages')
      .select('*')
      .or(`sender_wallet.eq.${userWallet},receiver_wallet.eq.${userWallet}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    // Group by friend wallet
    const conversationMap = new Map<string, Message[]>();
    
    allMessages?.forEach((msg) => {
      const friendWallet = msg.sender_wallet === userWallet ? msg.receiver_wallet : msg.sender_wallet;
      if (!conversationMap.has(friendWallet)) {
        conversationMap.set(friendWallet, []);
      }
      conversationMap.get(friendWallet)!.push(msg);
    });

    // Get friend names
    const friendWallets = Array.from(conversationMap.keys());
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('wallet_address, display_name')
      .in('wallet_address', friendWallets);

    const profileMap = new Map(profiles?.map(p => [p.wallet_address, p.display_name]) || []);

    // Build conversations list
    const convos: Conversation[] = [];
    conversationMap.forEach((msgs, friendWallet) => {
      const unreadCount = msgs.filter(m => m.receiver_wallet === userWallet && !m.is_read).length;
      const lastMsg = msgs[0];
      convos.push({
        friendWallet,
        friendName: profileMap.get(friendWallet) || `${friendWallet.slice(0, 4)}...${friendWallet.slice(-4)}`,
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.created_at,
        unreadCount
      });
    });

    setConversations(convos.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    ));
    setLoading(false);
  }, [userWallet]);

  const fetchMessagesWithFriend = useCallback(async (friendWallet: string) => {
    if (!userWallet) return;

    const { data, error } = await supabase
      .from('friend_messages')
      .select('*')
      .or(`and(sender_wallet.eq.${userWallet},receiver_wallet.eq.${friendWallet}),and(sender_wallet.eq.${friendWallet},receiver_wallet.eq.${userWallet})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);

    // Mark messages as read
    await supabase
      .from('friend_messages')
      .update({ is_read: true })
      .eq('sender_wallet', friendWallet)
      .eq('receiver_wallet', userWallet)
      .eq('is_read', false);
  }, [userWallet]);

  const sendMessage = async (receiverWallet: string, content: string) => {
    if (!userWallet || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('friend_messages')
        .insert({
          sender_wallet: userWallet,
          receiver_wallet: receiverWallet,
          content: content.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
        return false;
      }

      // Immediately fetch messages to show the new one
      await fetchMessagesWithFriend(receiverWallet);
      return true;
    } catch (err) {
      console.error('Send message error:', err);
      toast.error('Failed to send message');
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!userWallet) return;

    const channel = supabase
      .channel('friend-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_wallet === userWallet || newMsg.receiver_wallet === userWallet) {
            setMessages(prev => [...prev, newMsg]);
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userWallet, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    fetchMessagesWithFriend,
    fetchConversations
  };
}
