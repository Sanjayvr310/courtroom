import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Court Room — Classy Dark Green + Cream + Gold palette
        court: {
          // Deep forest greens
          green: "#2D5A27",
          "green-dark": "#1A3318",
          "green-mid": "#3A6B33",
          "green-light": "#4A8040",
          "green-muted": "#5C7A56",
          // Warm creams & off-whites
          cream: "#F8F4EE",
          "cream-dark": "#EDE7DC",
          "cream-mid": "#F2EDE5",
          parchment: "#E8E0D0",
          // Gold — replaces yellow, much classier
          gold: "#C9A84C",
          "gold-light": "#D4B86A",
          "gold-dark": "#A8872E",
          "gold-pale": "#F0E4C0",
          // Warm whites
          ivory: "#FDFAF5",
          // Dark navy for contrast
          navy: "#1C2B3A",
          "navy-light": "#253648",
          // Warm grays
          stone: "#8A8070",
          "stone-light": "#B5ADA0",
        },
        // Semantic
        live: "#DC2626",
        "live-bg": "#FEF2F2",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "court-lines": `repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(45,90,39,0.06) 59px, rgba(45,90,39,0.06) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(45,90,39,0.06) 59px, rgba(45,90,39,0.06) 60px)`,
        "hero-gradient": "linear-gradient(135deg, #1A3318 0%, #2D5A27 50%, #1C2B3A 100%)",
        "gold-gradient": "linear-gradient(135deg, #C9A84C 0%, #D4B86A 50%, #A8872E 100%)",
        "card-gradient": "linear-gradient(180deg, rgba(45,90,39,0.03) 0%, rgba(45,90,39,0) 100%)",
      },
      boxShadow: {
        "card": "0 2px 16px rgba(26,51,24,0.08), 0 1px 4px rgba(26,51,24,0.04)",
        "card-hover": "0 8px 40px rgba(26,51,24,0.16), 0 2px 8px rgba(26,51,24,0.08)",
        "card-gold": "0 4px 24px rgba(201,168,76,0.2)",
        "score-glow": "0 0 60px rgba(201,168,76,0.25)",
        "nav": "0 1px 0 rgba(26,51,24,0.08)",
        "inner-gold": "inset 0 1px 0 rgba(201,168,76,0.3)",
      },
      animation: {
        "score-in": "scoreIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-live": "pulseLive 2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        scoreIn: {
          "0%": { transform: "scale(0.8) translateY(-8px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        pulseLive: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.95)" },
        },
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      letterSpacing: {
        "widest-2": "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
