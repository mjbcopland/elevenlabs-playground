import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: process.env.PROXY_TARGET || "http://localhost:8080",
        rewrite: (path) => path.replace(/^\/api\//, "/xi/"),
      },
    },
  },
});
