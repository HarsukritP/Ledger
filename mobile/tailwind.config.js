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
        base: "#0A0A0C",
        surface: "#141418",
        "surface-raised": "#1C1C22",
        "surface-hover": "#242430",
        border: "#2A2A35",
        "border-subtle": "#1E1E26",
        gold: "#D4A853",
        pulse: "#3B82F6",
        "north-star": "#22C55E",
        sentinel: "#F97316",
        income: "#22C55E",
        warning: "#F97316",
        danger: "#EF4444",
        info: "#3B82F6",
        "text-primary": "#F5F5F7",
        "text-secondary": "#94949C",
        "text-muted": "#5C5C66",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["SpaceMono", "monospace"],
      },
    },
  },
  plugins: [],
};
