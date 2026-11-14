import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // PWA plugin would go here in production
    // For now we use manual service worker
  ],
  base: "/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react", "framer-motion"],
          charts: ["recharts"],
        },
      },
    },
  },
  // PWA configuration
  pwa: {
    manifestFilename: "manifest.json",
    workboxOptions: {
      globPatterns: ["**/*.{js,css,html,png,svg,json,ico,txt}"],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-stylesheets",
            expiration: {
              maxEntries: 10,
              maxAge: 60 * 60 * 24 * 365,
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "google-fonts",
            expiration: {
              maxEntries: 10,
              maxAge: 60 * 60 * 24 * 365,
            },
          },
        },
        {
          urlPattern: /\/api\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: {
              maxEntries: 50,
              maxAge: 60 * 60 * 24, // 24 hours
            },
            networkTimeoutSeconds: 10,
          },
        },
      ],
    },
  },
});