import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      external: ["electron", "node-llama-cpp"],
      output: {
        format: "esm", // Ensure ESM output
      },
    },
  },
});
