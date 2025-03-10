import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      external: [
        "electron",
        "electron-squirrel-startup",
        "node-llama-cpp",
        "birpc",
        /node:.*/, // Catch all node: protocol imports
      ],
      output: {
        format: "esm",
      },
    },
  },
  resolve: {
    mainFields: ["module", "main", "browser"],
    conditions: ["node"],
  },
});
