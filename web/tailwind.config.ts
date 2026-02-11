import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f7f4",
        panel: "#fdfdfc",
        ink: "#1f2328",
        accent: "#1f7a57",
        accentSoft: "#e7f6ef"
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 8px 30px rgba(15, 24, 18, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
