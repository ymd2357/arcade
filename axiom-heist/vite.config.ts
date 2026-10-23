import { defineConfig } from "vite";

export default defineConfig({
  root: "axiom-heist",
  base: "/arcade/axiom-heist/",
  server: {
    host: true,
    port: 49294,
  },
  build: {
    rollupOptions: {
      input: "axiom-heist/index.html",
    },
  },
});
