import type { Config } from "tailwindcss";

/**
 * Fay & Partenaires design tokens.
 *
 * The brand is industrial hardware: graphite steel + a warm zinc-amber accent.
 * Steel ("acier") is the primary/navy scale used for structure and the admin
 * chrome; amber ("laiton", cobalt) is the single accent that drives CTAs and
 * highlights. Everything else is a neutral zinc grey so product photos and the
 * accent do the talking.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        steel: {
          50: "#f2f6fb",
          100: "#e3ecf6",
          200: "#c1d5e9",
          300: "#8fb3d5",
          400: "#568bbc",
          500: "#356da3",
          600: "#265489",
          700: "#20446f",
          800: "#1e3a5d",
          900: "#12233a",
          950: "#0b1626",
        },
        // Electric blue sampled from the Fay & Partenaires brochure (#233CFF).
        cobalt: {
          50: "#eef1ff",
          100: "#dfe4ff",
          200: "#c4ccff",
          300: "#9aa6ff",
          400: "#6a78ff",
          500: "#233cff",
          600: "#1c2ee6",
          700: "#1a27bd",
          800: "#1a2597",
          900: "#1b2678",
          950: "#111445",
        },
        mint: {
          50: "#f4f9f4",
          100: "#ebf4eb",
          200: "#dcecdd",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,35,58,0.06), 0 8px 24px -12px rgba(18,35,58,0.18)",
        "card-hover":
          "0 2px 4px rgba(18,35,58,0.08), 0 18px 40px -18px rgba(18,35,58,0.28)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "spin-slow": "spin-slow 8s linear infinite",
        shimmer: "shimmer 1.6s infinite",
      },
      backgroundImage: {
        "steel-grid":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
