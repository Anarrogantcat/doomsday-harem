import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
// 原型 UI 样式（docs/ui-prototype.html 移植）
import "./styles-proto.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
