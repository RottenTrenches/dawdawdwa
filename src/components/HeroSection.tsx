import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, Skull, Flame, Zap, AlertTriangle } from "lucide-react";

const floatingEmojis = ["💀", "🔥", "🗑️", "🤡", "💩", "⚰️", "🎰", "💎", "🚀", "😂", "🍌", "👀"];

export const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [0, -5]);

  return (
    <section ref={sectionRef} className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden px-4">
      {/* CHAOTIC BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      
      {/* Animated neon grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--secondary)/0.15)_1px,transparent_1px)] bg-[size:40px_40px] animate-pulse" />
      
      {/* Floating emoji chaos */}
      {floatingEmojis.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl md:text-6xl select-none pointer-events-none"
          style={{
            left: `${(i * 8) % 100}%`,
            top: `${(i * 13) % 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, (i % 2 === 0 ? 20 : -20), 0],
            rotate: [0, (i % 2 === 0 ? 360 : -360)],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Neon orbs - MAXIMUM CHAOS */}
      <motion.div
        className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]"
        animate={{ 
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[100px]"
        animate={{ 
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1.3, 1, 1.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px]"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Main Content */}
      <motion.div
        style={{ opacity, scale, y, rotate }}
        className="relative z-10 text-center max-w-5xl mx-auto"
      >
        {/* WARNING BADGE */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-destructive/20 border-2 border-destructive/50 rounded-full mb-8 animate-pulse-neon"
        >
          <AlertTriangle className="w-5 h-5 text-destructive animate-bounce" />
          <span className="font-brainrot text-lg text-destructive uppercase tracking-wider">⚠️ MAXIMUM BRAINROT DETECTED ⚠️</span>
          <AlertTriangle className="w-5 h-5 text-destructive animate-bounce" />
        </motion.div>
        
        {/* GLITCH TITLE */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="font-brainrot text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-wider leading-none mb-4">
            <motion.span 
              className="text-rainbow inline-block"
              animate={{ 
                textShadow: [
                  "0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--secondary))",
                  "0 0 40px hsl(var(--accent)), 0 0 80px hsl(var(--primary))",
                  "0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--secondary))",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ROTTEN
            </motion.span>
            <br />
            <motion.span 
              className="text-foreground inline-block neon-text"
              animate={{ 
                scale: [1, 1.02, 1],
                rotate: [-1, 1, -1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              TRENCHES 💀
            </motion.span>
          </h1>
        </motion.div>
        
        {/* Subtitle with chaos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-10"
        >
          <p className="font-marker text-xl md:text-3xl text-foreground/90 max-w-3xl mx-auto leading-relaxed">
            <span className="text-primary neon-text">ROAST</span> crypto KOLs 🔥{" "}
            <span className="text-secondary neon-pink">EXPOSE</span> the frauds 🤡{" "}
            <span className="text-accent">NO CAP FR FR</span> 💀
          </p>
          <motion.p 
            className="mt-4 text-lg text-muted-foreground font-comic"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            the most UNHINGED KOL rating platform in crypto 🗑️
          </motion.p>
        </motion.div>
        
        {/* CTA Buttons - BRAINROT STYLE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a 
            href="/leaderboard" 
            className="brainrot-btn text-xl px-8 py-4"
            whileHover={{ scale: 1.1, rotate: [0, -2, 2, 0] }}
            whileTap={{ scale: 0.95 }}
          >
            <Skull className="w-6 h-6 mr-2 inline" />
            VIEW THE CARNAGE 💀
          </motion.a>
          <motion.a 
            href="/add-kol" 
            className="font-brainrot text-xl px-8 py-4 bg-card border-2 border-primary/50 rounded-lg text-foreground hover:bg-primary/10 hover:border-primary transition-all"
            whileHover={{ scale: 1.1, boxShadow: "0 0 30px hsl(var(--primary) / 0.5)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Flame className="w-6 h-6 mr-2 inline text-destructive" />
            ADD A VICTIM 🔥
          </motion.a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 flex flex-wrap justify-center gap-6"
        >
          {[
            { label: "KOLs Roasted", value: "500+", emoji: "🔥" },
            { label: "Frauds Exposed", value: "69", emoji: "🤡" },
            { label: "Bags Lost", value: "$∞", emoji: "💀" },
            { label: "Copium Levels", value: "MAX", emoji: "🗑️" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="brainrot-card px-6 py-4 text-center"
              whileHover={{ scale: 1.1, rotate: i % 2 === 0 ? 3 : -3 }}
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                y: { duration: 2, repeat: Infinity, delay: i * 0.2 },
              }}
            >
              <div className="text-2xl mb-1">{stat.emoji}</div>
              <div className="font-brainrot text-2xl text-primary">{stat.value}</div>
              <div className="font-comic text-xs text-muted-foreground uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      
      {/* Scroll indicator - CHAOS */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 15, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-primary"
        >
          <span className="font-pixel text-[8px] uppercase tracking-widest neon-text">SCROLL DOWN FR</span>
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <ArrowDown className="w-6 h-6 animate-bounce" />
          </motion.div>
          <span className="text-2xl">👇</span>
        </motion.div>
      </motion.div>
    </section>
  );
};