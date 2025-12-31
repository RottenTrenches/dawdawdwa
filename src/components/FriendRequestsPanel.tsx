import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, UserX, Clock, User, Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { formatDistanceToNow } from 'date-fns';

interface FriendRequestsPanelProps {
  userWallet: string;
  onRequestAccepted?: () => void;
}

export function FriendRequestsPanel({ userWallet, onRequestAccepted }: FriendRequestsPanelProps) {
  const { incomingRequests, outgoingRequests, loading, acceptRequest, declineRequest } = useFriendRequests(userWallet);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showOutgoing, setShowOutgoing] = useState(false);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    const success = await acceptRequest(requestId);
    if (success && onRequestAccepted) {
      onRequestAccepted();
    }
    setProcessingId(null);
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    await declineRequest(requestId);
    setProcessingId(null);
  };

  const totalRequests = incomingRequests.length + outgoingRequests.length;

  if (loading && totalRequests === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-pixel text-[10px] text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        Friend Requests
        {totalRequests > 0 && (
          <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[8px] rounded-full">
            {totalRequests}
          </span>
        )}
      </h3>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 ? (
        <div className="space-y-2">
          <p className="font-pixel text-[8px] text-muted-foreground">Incoming ({incomingRequests.length})</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            <AnimatePresence>
              {incomingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {request.requester_profile?.profile_pic_url ? (
                        <img
                          src={request.requester_profile.profile_pic_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-pixel text-[9px] text-foreground">
                        {request.requester_profile?.display_name || 
                          `${request.requester_wallet.slice(0, 6)}...${request.requester_wallet.slice(-4)}`}
                      </p>
                      <p className="font-pixel text-[7px] text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                      disabled={processingId === request.id}
                      className="font-pixel text-[7px] h-7 px-2 gap-1"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDecline(request.id)}
                      disabled={processingId === request.id}
                      className="font-pixel text-[7px] h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <p className="font-pixel text-[8px] text-muted-foreground text-center py-2">
          No incoming requests
        </p>
      )}

      {/* Outgoing Requests Toggle */}
      {outgoingRequests.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <button
            onClick={() => setShowOutgoing(!showOutgoing)}
            className="w-full flex items-center justify-between font-pixel text-[8px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3" />
              Sent Requests ({outgoingRequests.length})
            </span>
            {showOutgoing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          <AnimatePresence>
            {showOutgoing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2 space-y-2"
              >
                {outgoingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-2 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {request.requested_profile?.profile_pic_url ? (
                          <img
                            src={request.requested_profile.profile_pic_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-pixel text-[9px] text-foreground">
                          {request.requested_profile?.display_name || 
                            `${request.requested_wallet.slice(0, 6)}...${request.requested_wallet.slice(-4)}`}
                        </p>
                        <p className="font-pixel text-[7px] text-muted-foreground">
                          Pending • {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
