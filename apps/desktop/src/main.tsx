import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";
// 原型 UI 样式（docs/ui-prototype.html 移植）
// 与 styles.css 类名零重叠，可安全共存
import "./styles-proto.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
