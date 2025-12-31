import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Trophy, Target, User, ArrowRight } from "lucide-react";
import { StatCard } from "./StatCard";
import { supabase } from "@/integrations/supabase/client";

const features = [
  {
    title: "Leaderboard",
    description: "Community-driven KOL rankings with real-time voting.",
    icon: Trophy,
    href: "/leaderboard",
  },
  {
    title: "KOL Directory",
    description: "Explore and analyze crypto influencers in one place.",
    icon: Users,
    href: "/add-kol",
  },
  {
    title: "Bounties",
    description: "Fund research and earn rewards for contributions.",
    icon: Target,
    href: "/bounties",
  },
  {
    title: "Your Profile",
    description: "Track achievements and manage your contributions.",
    icon: User,
    href: "/profile",
  },
];

export const FeaturesSection = () => {
  const [stats, setStats] = useState({
    kols: 0,
    bounties: 0,
    votes: 0,
    reviews: 0,
  });

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    try {
      const [kolsRes, bountiesRes, votesRes, commentsRes] = await Promise.all([
        supabase.from('kols').select('*', { count: 'exact', head: true }),
        supabase.from('bounties').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('kol_votes').select('*', { count: 'exact', head: true }),
        supabase.from('kol_comments').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        kols: kolsRes.count || 0,
        bounties: bountiesRes.count || 0,
        votes: votesRes.count || 0,
        reviews: commentsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <section className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Platform <span className="text-gradient">Statistics</span>
          </h2>
          <p className="text-muted-foreground">Live metrics from our growing community</p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          <StatCard label="KOLs Tracked" value={stats.kols} delay={0} />
          <StatCard label="Open Bounties" value={stats.bounties} delay={0.1} />
          <StatCard label="Total Votes" value={stats.votes} delay={0.2} />
          <StatCard label="Reviews" value={stats.reviews} delay={0.3} />
        </div>
        
        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explore the <span className="text-gradient">Platform</span>
          </h2>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link 
                to={feature.href} 
                className="group block stat-card p-6 rounded-2xl hover:shadow-soft transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
