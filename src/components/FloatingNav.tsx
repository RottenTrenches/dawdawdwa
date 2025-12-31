import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Home, 
  Trophy, 
  Target, 
  MessageSquare, 
  User,
  Shield
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAdminRole } from "@/hooks/useAdminRole";

const navItems = [
  { path: "/", icon: Home, label: "KOLs" },
  { path: "/comments", icon: MessageSquare, label: "Best Reviews" },
  { path: "/stream", icon: Target, label: "Stream", hasLiveIndicator: true },
  { path: "/profile", icon: User, label: "Profile" },
];

export const FloatingNav = () => {
  const location = useLocation();
  const { isAdmin, isModerator } = useAdminRole();

  const allNavItems = isAdmin || isModerator 
    ? [...navItems, { path: "/admin", icon: Shield, label: "Admin" }]
    : navItems;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="floating-nav flex items-center gap-1"
    >
      {allNavItems.map(({ path, icon: Icon, label, hasLiveIndicator }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`relative flex items-center justify-center p-3 rounded-xl transition-all duration-200 group ${
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={label}
          >
            <Icon className="w-5 h-5" />
            {hasLiveIndicator && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {label}
            </div>
          </Link>
        );
      })}
      <div className="w-px h-6 bg-border mx-1" />
      <ThemeToggle />
    </motion.nav>
  );
};
