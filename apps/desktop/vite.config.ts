import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  /**
   * base 必须是相对路径。
   *
   * Electron 用 file:// 协议加载 dist/index.html，
   * 默认的 '/' 会让资源指向磁盘根（file:///assets/...）→ 白屏。
   */
  base: "./",
  server: { port: 5173, strictPort: true },
  envPrefix: ["VITE_"],
  build: { target: "es2022", sourcemap: true }
});
