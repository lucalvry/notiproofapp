import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" ? componentTagger() : null,
    mode !== "development" && process.env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org: "notiproof",
          project: "notiproof-web",
          authToken: process.env.SENTRY_AUTH_TOKEN,
          telemetry: false,
        })
      : null,
  ],
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
}));
