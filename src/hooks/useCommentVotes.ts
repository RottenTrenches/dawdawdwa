import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoteCounts {
  [commentId: string]: {
    likes: number;
    dislikes: number;
    userVote: 'like' | 'dislike' | null;
  };
}

export function useCommentVotes(commentIds: string[]) {
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});
  const [loading, setLoading] = useState(false);

  const fetchVotes = useCallback(async () => {
    if (commentIds.length === 0) return;

    setLoading(true);
    
    // Fetch all votes for these comments
    const { data: votes } = await supabase
      .from('comment_votes')
      .select('comment_id, vote_type, wallet_address')
      .in('comment_id', commentIds);

    if (!votes) {
      setLoading(false);
      return;
    }

    const counts: VoteCounts = {};

    // Initialize counts for all comments
    commentIds.forEach(id => {
      counts[id] = { likes: 0, dislikes: 0, userVote: null };
    });

    // Aggregate votes
    votes.forEach(vote => {
      if (!counts[vote.comment_id]) {
        counts[vote.comment_id] = { likes: 0, dislikes: 0, userVote: null };
      }
      
      if (vote.vote_type === 'like') {
        counts[vote.comment_id].likes++;
      } else {
        counts[vote.comment_id].dislikes++;
      }
    });

    setVoteCounts(counts);
    setLoading(false);
  }, [commentIds]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const vote = async (commentId: string, voteType: 'like' | 'dislike') => {
    // Generate anonymous wallet address for voting
    const walletAddress = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentVote = voteCounts[commentId]?.userVote;

    // Optimistic update
    setVoteCounts(prev => {
      const current = prev[commentId] || { likes: 0, dislikes: 0, userVote: null };
      const updated = { ...current };

      if (currentVote === voteType) {
        // Remove vote
        if (voteType === 'like') updated.likes--;
        else updated.dislikes--;
        updated.userVote = null;
      } else {
        // Remove old vote if exists
        if (currentVote === 'like') updated.likes--;
        else if (currentVote === 'dislike') updated.dislikes--;
        
        // Add new vote
        if (voteType === 'like') updated.likes++;
        else updated.dislikes++;
        updated.userVote = voteType;
      }

      return { ...prev, [commentId]: updated };
    });

    try {
      if (currentVote === voteType) {
        // Delete existing vote
        await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('wallet_address', walletAddress);
      } else if (currentVote) {
        // Update existing vote
        await supabase
          .from('comment_votes')
          .update({ vote_type: voteType })
          .eq('comment_id', commentId)
          .eq('wallet_address', walletAddress);
      } else {
        // Insert new vote
        await supabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            wallet_address: walletAddress,
            vote_type: voteType
          });
      }
    } catch (error) {
      // Revert on error
      fetchVotes();
      toast.error("Failed to vote");
    }
  };

  const getVoteRatio = (commentId: string): number => {
    const counts = voteCounts[commentId];
    if (!counts) return 0;
    const total = counts.likes + counts.dislikes;
    if (total === 0) return 0;
    return counts.likes - counts.dislikes;
  };

  return {
    voteCounts,
    loading,
    vote,
    getVoteRatio,
    refetch: fetchVotes
  };
}
