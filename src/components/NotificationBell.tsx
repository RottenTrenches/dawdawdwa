import { Bell, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationContext } from "@/contexts/NotificationContext";

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationContext();

  const handleNotificationClick = (notification: { id: string; link?: string }) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const formatTime = (time: string) => {
    if (time === 'Just now') return time;
    return time;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[8px] font-pixel rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-card border-border"
        align="end"
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-pixel text-[10px] text-foreground">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="font-pixel text-[8px] text-primary hover:text-primary/80 transition-colors"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1 rounded hover:bg-muted/50 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="font-pixel text-[9px] text-muted-foreground">
                No notifications yet
              </p>
              <p className="font-pixel text-[7px] text-muted-foreground/70 mt-1">
                Add a KOL to get notified of comments & votes
              </p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                      notification.read ? "bg-muted-foreground/30" : "bg-primary"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel text-[9px] text-foreground">
                      {notification.title}
                    </p>
                    <p className="font-pixel text-[8px] text-muted-foreground mt-0.5 break-words">
                      {notification.message}
                    </p>
                    <p className="font-pixel text-[7px] text-muted-foreground/70 mt-1">
                      {formatTime(notification.time)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
