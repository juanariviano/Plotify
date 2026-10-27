import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // libraries change rarely; keeping them in their own chunks means a deploy
        // only invalidates our code in the browser cache, not every dependency
        manualChunks: {
          react: ["react", "react-dom", "react-dom/client", "react-router", "react-router-dom"],
          clerk: ["@clerk/clerk-react"],
          motion: ["motion"],
          query: [
            "@tanstack/react-query",
            "@tanstack/react-query-persist-client",
            "@tanstack/query-sync-storage-persister",
            "axios",
          ],
        },
      },
    },
  },
});
