import { motion, AnimatePresence } from "framer-motion";
import rotTruckIcon from "@/assets/rot-truck.png";

interface GarbageTruckAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const GarbageTruckAnimation = ({ isVisible, onComplete }: GarbageTruckAnimationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: "-100%", rotate: 0 }}
          animate={{ 
            x: "120vw",
            rotate: [0, -2, 2, -2, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            x: { duration: 3, ease: "linear" },
            rotate: { duration: 0.3, repeat: 10, repeatType: "reverse" }
          }}
          onAnimationComplete={onComplete}
          className="fixed bottom-20 left-0 z-50 pointer-events-none"
        >
          <div className="relative">
            {/* Truck */}
            <img 
              src={rotTruckIcon} 
              alt="Garbage Truck" 
              className="w-32 h-32 object-contain transform -scale-x-100"
            />
            
            {/* Stink lines */}
            <motion.div 
              className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2"
              animate={{ y: [-5, -10, -5], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <span className="text-2xl">💨</span>
              <span className="text-xl">🤢</span>
              <span className="text-2xl">💨</span>
            </motion.div>
            
            {/* Trail */}
            <motion.div 
              className="absolute bottom-4 -left-8 flex gap-1"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              <span className="text-lg">💩</span>
              <span className="text-sm">🗑️</span>
            </motion.div>
          </div>
          
          {/* Text Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-primary/90 px-4 py-2 rounded-lg whitespace-nowrap"
          >
            <span className="font-pixel text-xs text-primary-foreground">
              🗑️ ROTTEN REVIEW INCOMING! 🗑️
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
