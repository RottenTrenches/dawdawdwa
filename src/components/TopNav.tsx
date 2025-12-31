import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  MessageSquare, 
  Tv
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { useStreamLive } from "@/hooks/useStreamLive";

const navItems = [
  { path: "/", icon: Home, label: "KOLs" },
  { path: "/comments", icon: MessageSquare, label: "Best Reviews" },
  { path: "/stream", icon: Tv, label: "Stream" },
];

export const TopNav = () => {
  const location = useLocation();
  const { data: isStreamLive } = useStreamLive();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="font-display text-xl font-bold">
            <span className="text-red-500">ROTTEN</span>
            <span className="text-yellow-400">TRENCHES</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            const showLive = path === "/stream" && isStreamLive;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {showLive && (
                  <span className="flex items-center gap-1 ml-1 text-[10px] font-bold text-red-500 animate-[float_2s_ease-in-out_infinite]">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="animate-[wiggle_0.5s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">LIVE</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Search & Theme */}
        <div className="flex items-center gap-3">
          <GlobalSearch />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-border/30">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showLive = path === "/stream" && isStreamLive;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showLive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
