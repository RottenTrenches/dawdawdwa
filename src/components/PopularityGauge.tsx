import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface PopularityGaugeProps {
  upvotes: number;
  downvotes: number;
  size?: "sm" | "md" | "lg";
}

export function PopularityGauge({ upvotes, downvotes, size = "md" }: PopularityGaugeProps) {
  const total = upvotes + downvotes;
  
  // Calculate popularity score (0-100)
  // 50 = neutral, 100 = extreme greed (all upvotes), 0 = extreme fear (all downvotes)
  const popularityScore = total === 0 ? 50 : Math.round((upvotes / total) * 100);
  
  // Get label and color based on score
  const getLabel = (score: number) => {
    if (score >= 80) return { text: "EXTREME GREED", color: "text-green-400" };
    if (score >= 60) return { text: "GREED", color: "text-green-500" };
    if (score >= 45) return { text: "NEUTRAL", color: "text-yellow-400" };
    if (score >= 25) return { text: "FEAR", color: "text-orange-500" };
    return { text: "EXTREME FEAR", color: "text-red-500" };
  };
  
  const label = getLabel(popularityScore);
  
  // Calculate needle rotation (-90 to 90 degrees, where -90 is fear, 90 is greed)
  const needleRotation = ((popularityScore / 100) * 180) - 90;
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 120, height: 70, fontSize: "6px", scoreSize: "text-sm", countSize: "text-[6px]" },
    md: { width: 180, height: 100, fontSize: "8px", scoreSize: "text-lg", countSize: "text-[8px]" },
    lg: { width: 240, height: 130, fontSize: "10px", scoreSize: "text-2xl", countSize: "text-[10px]" }
  };
  
  const config = sizeConfig[size];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        {/* Gauge background arc */}
        <svg 
          viewBox="0 0 200 110" 
          className="w-full h-full"
        >
          <defs>
            {/* Gradient for the gauge */}
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(0, 70%, 50%)" />
              <stop offset="25%" stopColor="hsl(30, 80%, 55%)" />
              <stop offset="50%" stopColor="hsl(50, 80%, 50%)" />
              <stop offset="75%" stopColor="hsl(90, 60%, 45%)" />
              <stop offset="100%" stopColor="hsl(120, 60%, 40%)" />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180 - 180;
            const radian = (angle * Math.PI) / 180;
            const x1 = 100 + 65 * Math.cos(radian);
            const y1 = 100 + 65 * Math.sin(radian);
            const x2 = 100 + 75 * Math.cos(radian);
            const y2 = 100 + 75 * Math.sin(radian);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Needle */}
        <motion.div
          className="absolute left-1/2 bottom-[10px] origin-bottom"
          initial={{ rotate: -90 }}
          animate={{ rotate: needleRotation }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          style={{ 
            width: 4, 
            height: config.height * 0.65,
            marginLeft: -2
          }}
        >
          <div 
            className="w-full h-full bg-foreground rounded-full"
            style={{
              background: "linear-gradient(to top, hsl(var(--foreground)), hsl(var(--muted-foreground)))"
            }}
          />
          {/* Needle center dot */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-muted"
          />
        </motion.div>
        
        {/* Score display */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className={`font-pixel ${config.scoreSize} font-bold ${label.color}`}>
            {popularityScore}
          </span>
        </div>
      </div>
      
      {/* Label */}
      <p className={`font-pixel ${label.color} mt-1`} style={{ fontSize: config.fontSize }}>
        {label.text}
      </p>
      
      {/* Vote counts */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-green-500" />
          <span className={`font-pixel ${config.countSize} text-green-500`}>{upvotes}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThumbsDown className="w-3 h-3 text-red-500" />
          <span className={`font-pixel ${config.countSize} text-red-500`}>{downvotes}</span>
        </div>
      </div>
    </div>
  );
}
