import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ModernButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const PixelButton = ({
  children,
  variant = "primary",
  onClick,
  className = "",
  disabled = false,
}: ModernButtonProps) => {
  const baseStyles = "relative px-6 py-3 font-medium text-sm rounded-xl transition-all duration-300 overflow-hidden";
  
  const variantStyles = {
    primary: "bg-gradient-cta text-primary-foreground shadow-[0_4px_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_20px_hsl(var(--primary)/0.4)]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/10",
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
};
