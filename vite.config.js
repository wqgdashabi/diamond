// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 关键：强制排除 threepipe 和 three
    exclude: ["three", "threepipe", "@threepipe/webgi-plugins"],
  },
  // 添加 resolve 配置帮助找到 three
  resolve: {
    alias: {
      three: "/node_modules/three/build/three.module.js",
    },
  },
});
