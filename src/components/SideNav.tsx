import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Home, Scale, BarChart3, GitCompare, User, Radio } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./ThemeToggle";
import { useNavLayout } from "@/contexts/NavLayoutContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import logo from "@/assets/logo.png";

const navItems = [
  { icon: Home, label: "KOLs", href: "/" },
  { icon: Radio, label: "Stream", href: "/stream", hasLiveIndicator: true },
  { icon: GitCompare, label: "Compare", href: "/compare" },
  { icon: Scale, label: "Governance", href: "/governance" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: User, label: "Profile", href: "/profile" },
];

export const SideNav = () => {
  const location = useLocation();
  const { toggleLayout } = useNavLayout();

  return (
    <motion.nav
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 bottom-0 z-50 w-16 md:w-48 pixel-nav flex flex-col py-4 px-2"
    >
      {/* Logo with toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleLayout}
            className="flex items-center justify-center md:justify-start gap-2 mb-6 px-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img src={logo} alt="Rotten Trenches" className="h-8 w-auto" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-pixel text-[8px]">
          Switch to top navigation
        </TooltipContent>
      </Tooltip>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSideNav"
                      className="absolute inset-0 bg-primary/15 rounded border border-primary/30"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <motion.div
                    className={`relative z-10 flex items-center gap-3 ${
                      isActive
                        ? "text-primary"
                        : "text-foreground/70 group-hover:text-foreground"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="relative">
                      <item.icon
                        className={`w-5 h-5 transition-all duration-200 flex-shrink-0 ${
                          isActive ? "drop-shadow-[0_0_6px_hsl(var(--primary))]" : ""
                        }`}
                      />
                      {item.hasLiveIndicator && (
                        <motion.div
                          animate={{ 
                            scale: [1, 1.3, 1],
                            opacity: [1, 0.6, 1]
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"
                        />
                      )}
                    </div>
                    <span className="font-pixel text-[8px] uppercase hidden md:block">
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-pixel text-[8px] md:hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="flex items-center justify-center md:justify-start px-2">
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-center md:justify-start px-2">
          <WalletButton />
        </div>
      </div>
    </motion.nav>
  );
};
