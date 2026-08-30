/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: "#050505",
        background: "#09090b",
        card: {
          DEFAULT: "#141416",
          elevated: "#17171a",
        },
        surface: {
          DEFAULT: "#141416",
          popover: "#17171a",
          secondary: "#1f1f22",
          muted: "#3f3f46",
        },
        border: {
          DEFAULT: "#27272a",
          subtle: "rgba(255, 255, 255, 0.08)",
          highlight: "rgba(0, 79, 255, 0.35)",
        },
        foreground: {
          DEFAULT: "#f4f4f5",
          muted: "#a1a1aa",
          dimmer: "#71717a",
        },
        primary: {
          DEFAULT: "#004fff",
          hover: "#31afd4",
          glow: "rgba(0, 79, 255, 0.4)",
        },
        accent: {
          DEFAULT: "#31afd4",
          hover: "#22d3ee",
          glow: "rgba(49, 175, 212, 0.4)",
        },
        spotlight: {
          DEFAULT: "#ff007f",
          glow: "rgba(255, 0, 127, 0.4)",
        },
        success: {
          DEFAULT: "#34d399",
          glow: "rgba(52, 211, 153, 0.25)",
        },
        warning: {
          DEFAULT: "#fbbf24",
          glow: "rgba(251, 191, 36, 0.25)",
        },
        destructive: {
          DEFAULT: "#902d41",
          foreground: "#fb7185",
          glow: "rgba(251, 113, 133, 0.35)",
        },
      },
      boxShadow: {
        "primary-glow": "0 0 20px -3px rgba(0, 79, 255, 0.4)",
        "accent-glow": "0 0 20px -3px rgba(49, 175, 212, 0.4)",
        "spotlight-glow": "0 0 15px -3px rgba(255, 0, 127, 0.4)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};
