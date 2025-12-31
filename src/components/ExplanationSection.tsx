import { motion } from "framer-motion";
import { TrendingUp, Users, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Tracking",
    description: "Monitor KOL performance with live data and community insights."
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Collective wisdom from thousands of crypto enthusiasts."
  },
  {
    icon: Shield,
    title: "Transparent Reviews",
    description: "Honest, unbiased analysis you can trust."
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description: "Quick access to key metrics and performance data."
  }
];

export const ExplanationSection = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose <span className="text-gradient">Rotten Trenches</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The most comprehensive platform for crypto influencer analysis, 
            built by the community, for the community.
          </p>
        </motion.div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 rounded-2xl text-center group hover:border-primary/30 transition-all duration-300"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors"
              >
                <feature.icon className="w-7 h-7 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
