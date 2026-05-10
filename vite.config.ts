import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, "public/index.html")
    }
  }
});
