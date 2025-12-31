import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Send, ArrowLeft, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFriendMessages } from '@/hooks/useFriendMessages';
import { useFriends } from '@/hooks/useFriends';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatDistanceToNow } from 'date-fns';

export function FriendChat() {
  const { publicKey } = useWallet();
  const userWallet = publicKey?.toBase58() || null;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, conversations, sendMessage, fetchMessagesWithFriend } = useFriendMessages(userWallet);
  const { friends } = useFriends(userWallet);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessagesWithFriend(selectedFriend);
    }
  }, [selectedFriend, fetchMessagesWithFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedFriend || !messageInput.trim()) return;
    
    const success = await sendMessage(selectedFriend, messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openChat = (friendWallet: string, friendName: string) => {
    setSelectedFriend(friendWallet);
    setSelectedFriendName(friendName);
  };

  if (!userWallet) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 left-0 w-80 h-96 bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
              {selectedFriend ? (
                <>
                  <button
                    onClick={() => setSelectedFriend(null)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="truncate max-w-[180px]">{selectedFriendName}</span>
                  </button>
                </>
              ) : (
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Messages
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {selectedFriend ? (
              <>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMe = msg.sender_wallet === userWallet;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2 text-sm shadow-sm ${
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-t-2xl rounded-bl-2xl rounded-br-sm'
                                : 'bg-secondary text-secondary-foreground rounded-t-2xl rounded-br-2xl rounded-bl-sm'
                            }`}
                          >
                            <p className="break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${
                              isMe ? 'text-primary-foreground/70 text-right' : 'text-secondary-foreground/70'
                            }`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-2 border-t border-border flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleSend} disabled={!messageInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <ScrollArea className="flex-1">
                {conversations.length === 0 && friends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
                    <Users className="w-8 h-8 mb-2" />
                    <p>No friends yet</p>
                    <p className="text-xs">Add friends to start chatting</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {/* Existing conversations */}
                    {conversations.map((convo) => (
                      <button
                        key={convo.friendWallet}
                        onClick={() => openChat(convo.friendWallet, convo.friendName)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate max-w-[180px]">
                            {convo.friendName}
                          </span>
                          {convo.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                              {convo.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {convo.lastMessage}
                        </p>
                      </button>
                    ))}
                    
                    {/* Friends without conversations */}
                    {friends
                      .filter(f => !conversations.find(c => c.friendWallet === f))
                      .map((friendWallet) => (
                        <button
                          key={friendWallet}
                          onClick={() => openChat(friendWallet, `${friendWallet.slice(0, 4)}...${friendWallet.slice(-4)}`)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-sm">
                            {friendWallet.slice(0, 4)}...{friendWallet.slice(-4)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Start a conversation
                          </p>
                        </button>
                      ))
                    }
                  </div>
                )}
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </motion.button>
    </div>
  );
}
