import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  esbuild: {
    jsx: "automatic",
  },
  build: {
    outDir: "ui/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "ui/graph-view/main.jsx",
      output: {
        entryFileNames: "graph-view.js",
        format: "es",
      },
    },
  },
});
