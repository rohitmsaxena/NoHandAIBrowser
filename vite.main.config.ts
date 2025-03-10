import { defineConfig } from "vite";

const externalModules = ["node-llama-cpp"];

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: externalModules,
    },
  },
});
