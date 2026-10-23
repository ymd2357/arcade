import { defineConfig } from "vite";

export default defineConfig({
  root: "self-reference",
  base: "/arcade/self-reference/",
  server: {
    host: true,
    port: 49295,
  },
  build: {
    rollupOptions: {
      input: "self-reference/index.html",
    },
  },
});
