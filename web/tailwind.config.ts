import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode
        canvas: "#f6f7f4",
        panel: "#fdfdfc",
        ink: "#1f2328",
        accent: "#1f7a57",
        accentSoft: "#e7f6ef",

        // Dark Mode (ChatGPT-inspired)
        "canvas-dark": "#0f172a",
        "panel-dark": "#020617",
        "ink-dark": "#f1f5f9",
        "accent-dark": "#34d399",
        "accentSoft-dark": "rgba(52, 211, 153, 0.1)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        panel: "0 8px 30px rgba(15, 24, 18, 0.08)",
        "panel-dark": "0 8px 30px rgba(0, 0, 0, 0.4)",
        glow: "0 0 15px rgba(31, 122, 87, 0.3)",
        "glow-dark": "0 0 15px rgba(52, 211, 153, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-glow": "pulseGlow 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
