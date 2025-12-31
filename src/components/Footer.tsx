import { motion } from "framer-motion";
import { X } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="relative py-16 px-4 border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-2xl font-display font-bold text-gradient">RT</div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Rotten Trenches
            </h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Community-driven crypto influencer analysis platform. 
            Track, analyze, and review with confidence.
          </p>
          
          {/* Social Links */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <a 
              href="https://twitter.com/RottenKols" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Twitter</span>
            </a>
          </div>
          
          {/* Divider */}
          <div className="w-24 h-px bg-border mx-auto mb-6" />
          
          {/* Bottom text */}
          <p className="text-xs text-muted-foreground">
            Built on Solana • Community Governed
          </p>
        </motion.div>
      </div>
    </footer>
  );
};
