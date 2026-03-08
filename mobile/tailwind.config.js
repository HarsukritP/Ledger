/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        base: "#09090B",
        surface: "#111114",
        "surface-raised": "#1A1A22",
        border: "#27272A",
        "border-subtle": "#1E1E24",
        gold: "#D4A853",
        income: "#34D399",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#60A5FA",
        "text-primary": "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "text-muted": "#71717A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["SpaceMono", "monospace"],
      },
    },
  },
  plugins: [],
};
