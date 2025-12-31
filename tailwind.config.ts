import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Comic Neue', 'Comic Sans MS', 'cursive'],
        display: ['Bangers', 'cursive'],
        brainrot: ['Bangers', 'cursive'],
        pixel: ['Press Start 2P', 'cursive'],
        marker: ['Permanent Marker', 'cursive'],
        comic: ['Comic Neue', 'cursive'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // BRAINROT NEON COLORS
        neon: {
          green: "hsl(120 100% 50%)",
          pink: "hsl(320 100% 60%)",
          cyan: "hsl(180 100% 50%)",
          yellow: "hsl(50 100% 50%)",
          orange: "hsl(30 100% 50%)",
          purple: "hsl(280 100% 60%)",
          red: "hsl(0 100% 50%)",
        },
        ohio: "hsl(200 100% 50%)",
        skull: "hsl(0 0% 95%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px) rotate(-2deg)" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(0deg)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px) scale(0.9)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.5) rotate(-10deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-15px) rotate(3deg)" },
          "50%": { transform: "translateY(-5px) rotate(-2deg)" },
          "75%": { transform: "translateY(-20px) rotate(2deg)" },
        },
        "pulse-neon": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--secondary) / 0.2)",
            filter: "brightness(1)"
          },
          "50%": { 
            boxShadow: "0 0 40px hsl(var(--primary) / 0.8), 0 0 80px hsl(var(--secondary) / 0.4)",
            filter: "brightness(1.2)"
          },
        },
        "shake-chaos": {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "10%": { transform: "translateX(-5px) rotate(-3deg)" },
          "20%": { transform: "translateX(5px) rotate(3deg)" },
          "30%": { transform: "translateX(-5px) rotate(-2deg)" },
          "40%": { transform: "translateX(5px) rotate(2deg)" },
          "50%": { transform: "translateX(-3px) rotate(-1deg)" },
          "60%": { transform: "translateX(3px) rotate(1deg)" },
          "70%": { transform: "translateX(-2px) rotate(-1deg)" },
          "80%": { transform: "translateX(2px) rotate(1deg)" },
          "90%": { transform: "translateX(-1px) rotate(0deg)" },
        },
        "rainbow": {
          "0%": { filter: "hue-rotate(0deg)" },
          "100%": { filter: "hue-rotate(360deg)" },
        },
        "glitch": {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-3px, 3px)" },
          "40%": { transform: "translate(-3px, -3px)" },
          "60%": { transform: "translate(3px, 3px)" },
          "80%": { transform: "translate(3px, -3px)" },
          "100%": { transform: "translate(0)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "bounce-wild": {
          "0%, 100%": { transform: "translateY(0) scale(1) rotate(0deg)" },
          "25%": { transform: "translateY(-30px) scale(1.2) rotate(-5deg)" },
          "50%": { transform: "translateY(-15px) scale(0.9) rotate(3deg)" },
          "75%": { transform: "translateY(-25px) scale(1.1) rotate(-3deg)" },
        },
        "spin-chaos": {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "25%": { transform: "rotate(90deg) scale(1.1)" },
          "50%": { transform: "rotate(180deg) scale(0.9)" },
          "75%": { transform: "rotate(270deg) scale(1.1)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "scale-in": "scale-in 0.4s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        "shake-chaos": "shake-chaos 0.5s ease-in-out",
        "rainbow": "rainbow 5s linear infinite",
        "glitch": "glitch 0.3s ease-in-out infinite",
        "bounce-wild": "bounce-wild 2s ease-in-out infinite",
        "spin-chaos": "spin-chaos 3s linear infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brainrot': 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 25%, hsl(var(--secondary)) 50%, hsl(180 100% 50%) 75%, hsl(var(--primary)) 100%)',
        'gradient-chaos': 'linear-gradient(45deg, hsl(var(--destructive)), hsl(var(--accent)), hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--destructive)))',
        'gradient-neon': 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))',
      },
      boxShadow: {
        'neon': '0 0 20px hsl(var(--primary) / 0.6), 0 0 40px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--secondary) / 0.2)',
        'neon-intense': '0 0 30px hsl(var(--primary)), 0 0 60px hsl(var(--secondary)), 0 0 90px hsl(var(--accent))',
        'chaos': '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--secondary) / 0.3), 0 0 60px hsl(var(--accent) / 0.2), inset 0 0 20px hsl(var(--primary) / 0.1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;