// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["three", "threepipe", "@threepipe/webgi-plugins"],
  },
  resolve: {
    alias: {
      three: "/node_modules/three/build/three.module.js",
      // 修复 stats.js 导入
      "stats.js": resolve(
        __dirname,
        "node_modules/stats.js/build/stats.module.js",
      ),
    },
  },
});
