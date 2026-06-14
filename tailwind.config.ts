import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#000000",
          surface: "#111111",
          card: "#171717",
          border: "#262626",
          muted: "#9A9A9A",
          accent: "#D1D3D4"
        }
      },
      fontFamily: {
        sans: ["Inter", "HarmonyOS Sans", "Arial", "sans-serif"],
        numbers: ["var(--font-bebas)", "Arial Narrow", "sans-serif"]
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.04) inset, 0 22px 80px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};

export default config;
