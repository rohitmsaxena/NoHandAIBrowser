import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Set the correct output format
    outDir: "dist-electron",
    target: "es2022",
    rollupOptions: {
      // List all native Node.js modules and external dependencies
      external: [
        "electron",
        "electron-squirrel-startup",
        "node-llama-cpp",
        "birpc",
        /node:.*/, // Catch all node: protocol imports
      ],
      output: {
        format: "esm", // Change to CommonJS output format
      },
    },
  },
  resolve: {
    // Help Vite properly resolve modules
    mainFields: ["module", "main", "browser"],
    conditions: ["node"],
  },
});
