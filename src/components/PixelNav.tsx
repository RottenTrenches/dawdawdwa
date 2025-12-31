import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Users, Scale, BarChart3, GitCompare, Menu, User, Shield, Flame } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useNavLayout } from "@/contexts/NavLayoutContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import logo from "@/assets/logo.png";

const baseNavItems = [
  { icon: Users, label: "KOLs", href: "/", emoji: "🤡" },
  { icon: GitCompare, label: "Compare", href: "/compare", emoji: "⚔️" },
  { icon: Scale, label: "Governance", href: "/governance", emoji: "⚖️" },
  { icon: BarChart3, label: "Analytics", href: "/analytics", emoji: "📊" },
  { icon: User, label: "Profile", href: "/profile", emoji: "💀" },
];

export const PixelNav = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toggleLayout } = useNavLayout();
  const { isAdmin, isModerator } = useAdminRole();

  // Add admin link only for admins/moderators
  const navItems = isAdmin || isModerator 
    ? [...baseNavItems, { icon: Shield, label: "Admin", href: "/admin", emoji: "🛡️" }]
    : baseNavItems;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
      className="fixed top-0 left-0 right-0 z-50 pixel-nav px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo with chaos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={toggleLayout}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
              whileHover={{ scale: 1.05, rotate: [-2, 2, -2, 0] }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.img 
                src={logo} 
                alt="Rotten Trenches" 
                className="h-10 w-auto"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.span 
                className="hidden sm:block font-brainrot text-lg text-rainbow"
                animate={{ 
                  textShadow: [
                    "0 0 10px hsl(var(--primary))",
                    "0 0 20px hsl(var(--secondary))",
                    "0 0 10px hsl(var(--primary))",
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ROTTEN 💀
              </motion.span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent className="font-pixel text-[8px] bg-card border-primary/50">
            Switch to side navigation fr fr
          </TooltipContent>
        </Tooltip>

        {/* Desktop Navigation - BRAINROT STYLE */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  className="relative flex items-center gap-2 px-3 py-2 rounded-lg group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/20 rounded-lg border-2 border-primary/50"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      style={{
                        boxShadow: "0 0 15px hsl(var(--primary) / 0.4)",
                      }}
                    />
                  )}
                  <motion.div
                    className={`relative z-10 flex items-center gap-2 ${
                      isActive
                        ? "text-primary neon-text"
                        : "text-foreground/70 group-hover:text-foreground"
                    }`}
                    whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="text-sm group-hover:animate-bounce">{item.emoji}</span>
                    <item.icon className={`w-4 h-4 transition-all duration-200 ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`} />
                    <span className="font-brainrot text-[10px] uppercase tracking-wide">{item.label}</span>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Right side utilities */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }}>
            <NotificationBell />
          </motion.div>
          <motion.div whileHover={{ scale: 1.1, rotate: -10 }} whileTap={{ scale: 0.9 }}>
            <ThemeToggle />
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <WalletButton />
          </motion.div>
          
          {/* Mobile Hamburger Menu - CHAOS */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.2, rotate: 180 }}
                whileTap={{ scale: 0.8 }}
                className="md:hidden p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/50"
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-card/95 backdrop-blur-xl border-l-2 border-primary/50">
              <div className="flex flex-col gap-1 mt-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center mb-6"
                >
                  <span className="font-brainrot text-2xl text-rainbow">MENU 💀</span>
                </motion.div>
                {navItems.map((item, index) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, type: "spring" }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-primary/20 text-primary border-2 border-primary/50 shadow-neon"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted/50 border-2 border-transparent"
                        }`}
                      >
                        <motion.span 
                          className="text-xl"
                          animate={isActive ? { rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {item.emoji}
                        </motion.span>
                        <item.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`} />
                        <span className="font-brainrot text-sm uppercase">{item.label}</span>
                        {isActive && (
                          <motion.div
                            className="ml-auto"
                            animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 360] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Flame className="w-4 h-4 text-destructive" />
                          </motion.div>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
};