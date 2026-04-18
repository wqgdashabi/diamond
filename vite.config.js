import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // 强制所有 three 导入都指向 threepipe 内置版本
    alias: {
      three: "threepipe/three",
    },
  },
});
