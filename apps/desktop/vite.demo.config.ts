import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Demo 构建配置 —— 产出一个可双击打开的单页 demo。
 *
 * 与主构建的区别：
 *  - base: "./" 资源走相对路径（file:// 也能加载）
 *  - 输出到 dist-demo/
 *  - 不生成 sourcemap（体积减半）
 */
export default defineConfig({
  plugins: [react()],
  base: "./",
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2022",
    outDir: "dist-demo",
    emptyOutDir: true,
    sourcemap: false
  }
});
