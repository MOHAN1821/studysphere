/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563EB",
          indigo: "#6366F1",
          purple: "#7C3AED",
          cyan: "#06B6D4",
          teal: "#14B8A6",
          violet: "#8B5CF6",
          pink: "#EC4899",
          orange: "#F97316",
          green: "#22C55E",
          red: "#EF4444",
          amber: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI Variable", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Inter", "Segoe UI Variable", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "slide-up": "slideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scaleIn 0.2s ease-out both",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        blink: "blink 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        blink: { "0%, 80%, 100%": { opacity: "0.25" }, "40%": { opacity: "1" } },
      },
      boxShadow: {
        soft: "0 2px 12px -3px rgba(15, 23, 42, 0.08), 0 8px 24px -12px rgba(15, 23, 42, 0.12)",
        "soft-lg": "0 18px 50px -18px rgba(15, 23, 42, 0.25)",
        accent: "0 12px 30px -12px rgba(var(--accent), 0.55)",
        "accent-lg": "0 20px 50px -18px rgba(var(--accent), 0.5)",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(circle at 15% 10%, rgba(99,102,241,0.13), transparent 32%), radial-gradient(circle at 85% 0%, rgba(6,182,212,0.12), transparent 30%), radial-gradient(circle at 60% 90%, rgba(236,72,153,0.08), transparent 35%)",
        "mesh-dark":
          "radial-gradient(circle at 15% 10%, rgba(99,102,241,0.2), transparent 34%), radial-gradient(circle at 85% 0%, rgba(6,182,212,0.14), transparent 32%), radial-gradient(circle at 60% 90%, rgba(236,72,153,0.1), transparent 36%)",
      },
    },
  },
  plugins: [],
}