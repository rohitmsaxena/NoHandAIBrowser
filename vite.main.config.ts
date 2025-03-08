import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        "node-llama-cpp",
        /^@node-llama-cpp\/.*/,
        "node:fs",
        "node:path",
        "node:os",
        "node:util",
        "node:stream",
        "node:buffer",
        "node:events",
      ],
    },
  },
});
