import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "/arcade/mirror-horde/",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, "index.html")
    }
  }
});
