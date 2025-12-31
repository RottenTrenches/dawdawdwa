import { motion } from "framer-motion";
import { Flame, Star, MessageSquare, TrendingDown, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Flame,
    title: "Find a KOL",
    description: "Browse our collection of crypto influencers or search for one you've been burned by.",
    color: "text-primary"
  },
  {
    icon: Star,
    title: "Rate Them",
    description: "Give them 1-5 stars based on their calls, honesty, and whether they rugged you.",
    color: "text-secondary"
  },
  {
    icon: MessageSquare,
    title: "Roast or Toast",
    description: "Write a review. Be honest. Did they pump your bags or dump on your head?",
    color: "text-accent"
  },
  {
    icon: TrendingDown,
    title: "Watch Ratings Move",
    description: "Bad KOLs get exposed. Good ones get recognition. The community decides.",
    color: "text-primary"
  }
];

export const HowItWorks = () => {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">How It Works</h3>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 ${step.color}`}>
              <step.icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">{step.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-xl">
        <p className="text-sm text-primary font-medium flex items-center gap-2">
          <Flame className="w-4 h-4" />
          This is a roasting site for crypto KOLs
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Rate influencers based on their actual performance. Bad calls = bad ratings. 
          Help the community avoid getting rugged by exposing the worst offenders.
        </p>
      </div>
    </div>
  );
};
