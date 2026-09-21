import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#800020",
          "primary-light": "#9b1b3d",
          "primary-dark": "#520315",
          secondary: "#10b981",
          "secondary-light": "#34d399",
          "secondary-dark": "#059669",
          accent: "#800020",
          "accent-light": "#9b1b3d",
          "accent-dark": "#520315",
          indigo: "#4f46e5",
          maroon: {
            50: "#fdf2f4",
            100: "#fce7ea",
            200: "#f8d2d9",
            300: "#f2aebd",
            400: "#e87c95",
            500: "#b82750",
            600: "#9b1b3d",
            700: "#800020",
            800: "#6c0820",
            900: "#520315",
            950: "#32000b",
          },
          orange: {
            50: "#fff7ed",
            100: "#ffedd5",
            200: "#fed7aa",
            300: "#fdba74",
            400: "#fb923c",
            500: "#ff8800",
            600: "#ea580c",
            700: "#c2410c",
            800: "#9a3412",
            900: "#7c2d12",
          },
        },
        maroon: {
          50: "#fdf2f4",
          100: "#fce7ea",
          200: "#f8d2d9",
          300: "#f2aebd",
          400: "#e87c95",
          500: "#b82750",
          600: "#9b1b3d",
          700: "#800020",
          800: "#6c0820",
          900: "#520315",
          950: "#32000b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-right": "slideRight 0.4s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
