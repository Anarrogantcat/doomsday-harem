import { useEffect, useRef } from "react";
import { REGIONS, TERRAIN_LABEL, effectiveDanger } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/**
 * 中央下侧栏 —— 像素场景条。
 *
 * 用 Canvas 程序化绘制当前地点的像素景观：
 * 天空渐变、地平线、地形剪影、角色剪影。
 * 无需素材文件，随地点/时间变化。
 */

/** 地形 → 剪影类型 */
function terrainShape(terrain: string): "urban" | "forest" | "mountain" | "flat" | "water" {
  if (terrain === "urban" || terrain === "residential" || terrain === "industrial" || terrain === "base") return "urban";
  if (terrain === "forest" || terrain === "rural") return "forest";
  if (terrain === "mountain") return "mountain";
  if (terrain === "coast") return "water";
  return "flat";
}

/** 时段 → 天空色 */
function skyColors(slot: string): [string, string, string] {
  switch (slot) {
    case "morning": return ["#2a3a5a", "#7a6a8a", "#d89a7a"];
    case "forenoon": return ["#3a5a8a", "#6a8ab0", "#a8c0d8"];
    case "noon": return ["#4a7ab0", "#7aa8d0", "#c0d8e8"];
    case "evening": return ["#3a3a6a", "#a05a6a", "#e0a070"];
    case "night": return ["#0a0e1a", "#1a2030", "#2a3040"];
    default: return ["#080a12", "#141824", "#20242e"];
  }
}

export function PixelStrip({ height = 150 }: { height?: number }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const ref = useRef<HTMLCanvasElement | null>(null);
  void version;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = cv.parentElement?.clientWidth ?? 600;
    const H = height;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const slot = session.slot;
    const here = session.here();
    const [c1, c2, c3] = skyColors(slot);
    const danger = here ? effectiveDanger(session.world, session.world.current) : 1;
    const shape = terrainShape(here?.terrain ?? "flat");

    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, c1);
    sky.addColorStop(0.6, c2);
    sky.addColorStop(1, c3);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 星星（夜间）
    if (slot === "night" || slot === "lateNight") {
      ctx.fillStyle = "rgba(255,255,255,.5)";
      for (let i = 0; i < 40; i++) {
        const x = ((i * 137) % W);
        const y = ((i * 71) % (H * 0.45));
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 太阳/月亮
    const isDay = slot === "morning" || slot === "forenoon" || slot === "noon" || slot === "evening";
    const bodyY = slot === "morning" || slot === "evening" ? H * 0.42 : slot === "noon" ? H * 0.18 : H * 0.22;
    ctx.fillStyle = isDay ? "#f0e0a0" : "#d8e0f0";
    ctx.beginPath();
    ctx.arc(W * 0.78, bodyY, 11, 0, Math.PI * 2);
    ctx.fill();

    // 远景层
    const horizon = H * 0.62;
    const far = "rgba(20,24,34,.55)";
    ctx.fillStyle = far;
    if (shape === "mountain") {
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      for (let i = 0; i <= 12; i++) {
        const x = (i / 12) * W;
        const h = 18 + Math.abs(Math.sin(i * 1.7)) * 42;
        ctx.lineTo(x, horizon - h);
      }
      ctx.lineTo(W, horizon);
      ctx.fill();
    } else if (shape === "urban") {
      for (let i = 0; i < 16; i++) {
        const bw = W / 16;
        const bh = 12 + ((i * 37) % 40);
        ctx.fillRect(i * bw, horizon - bh, bw - 1, bh);
      }
    } else if (shape === "forest") {
      for (let i = 0; i < 24; i++) {
        const x = (i / 24) * W;
        const th = 16 + ((i * 53) % 22);
        ctx.beginPath();
        ctx.moveTo(x, horizon);
        ctx.lineTo(x + 7, horizon - th);
        ctx.lineTo(x + 14, horizon);
        ctx.fill();
      }
    } else if (shape === "water") {
      ctx.fillRect(0, horizon - 6, W, 6);
    }

    // 近景地面
    ctx.fillStyle = danger >= 4 ? "#2a1a1a" : danger >= 3 ? "#2a2418" : "#1e2a1e";
    ctx.fillRect(0, horizon, W, H - horizon);

    // 地面纹理（像素块）
    for (let x = 0; x < W; x += 8) {
      for (let y = horizon; y < H; y += 8) {
        const v = ((x * 7 + y * 13) % 20) / 100;
        ctx.fillStyle = `rgba(255,255,255,${v})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // 角色剪影（主角 + 在队同伴，最多 5 个）
    const joined = session.joined().slice(0, 4);
    const total = joined.length + 1;
    const spacing = W / (total + 1);
    const baseY = horizon + 34;

    /** 画一个像素小人（比例接近真实，有胸腰腿区分） */
    const drawFigure = (x: number, scale: number, isHero: boolean, hue: number, pregnant: boolean, cup = 3) => {
      const H = 44 * scale;          // 总身高
      const headR = H * 0.088;
      const skin = `hsl(${hue}, 32%, 76%)`;
      const skinD = `hsl(${hue}, 26%, 62%)`;
      const cloth = `hsl(${(hue + 45) % 360}, 42%, 48%)`;
      const hair = `hsl(${(hue + 200) % 360}, 36%, 26%)`;

      const headY = baseY - H + headR;
      const neckY = headY + headR * 0.9;
      const shoulderY = neckY + H * 0.035;
      const chestY = shoulderY + H * 0.09;
      const waistY = shoulderY + H * 0.20;
      const hipY = shoulderY + H * 0.29;
      const kneeY = shoulderY + H * 0.55;
      const footY = baseY;

      const shoulderW = H * 0.175;
      const waistW = H * 0.125;
      const hipW = H * 0.200;

      // 腿（大腿 + 小腿）
      for (const side of [-1, 1]) {
        const lx = x + side * hipW * 0.28;
        ctx.fillStyle = cloth;
        ctx.fillRect(lx - H * 0.038, hipY, H * 0.076, kneeY - hipY);
        ctx.fillRect(lx - H * 0.030, kneeY, H * 0.060, footY - kneeY);
        // 脚
        ctx.fillStyle = "#2a2028";
        ctx.fillRect(lx - H * 0.042, footY - H * 0.022, H * 0.084, H * 0.022);
      }

      // 躯干（沙漏型）
      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(x - shoulderW * 0.5, shoulderY);
      ctx.lineTo(x - waistW * 0.5, waistY);
      ctx.lineTo(x - hipW * 0.5, hipY);
      ctx.lineTo(x + hipW * 0.5, hipY);
      ctx.lineTo(x + waistW * 0.5, waistY);
      ctx.lineTo(x + shoulderW * 0.5, shoulderY);
      ctx.closePath();
      ctx.fill();

      // 胸部（按罩杯）
      const bustR = H * (0.034 + cup * 0.007);
      ctx.fillStyle = isHero ? "#a8305a" : cloth;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + side * shoulderW * 0.22, chestY, bustR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 孕肚
      if (pregnant) {
        ctx.fillStyle = cloth;
        ctx.beginPath();
        ctx.arc(x, waistY + H * 0.03, hipW * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      // 臂
      ctx.fillStyle = cloth;
      for (const side of [-1, 1]) {
        ctx.fillRect(
          x + side * shoulderW * 0.46 - H * 0.028,
          shoulderY,
          H * 0.056,
          waistY - shoulderY + H * 0.02
        );
      }

      // 头
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(x, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      // 发
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(x, headY - headR * 0.18, headR * 1.05, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - headR * 1.05, headY - headR * 0.2, headR * 0.35, headR * 1.3);
      ctx.fillRect(x + headR * 0.70, headY - headR * 0.2, headR * 0.35, headR * 1.3);
      // 脸
      ctx.fillStyle = "#2a2028";
      ctx.fillRect(x - headR * 0.42, headY + headR * 0.05, headR * 0.20, headR * 0.20);
      ctx.fillRect(x + headR * 0.22, headY + headR * 0.05, headR * 0.20, headR * 0.20);
    };

    let idx = 0;
    // 主角（扶她，用主角色）
    let heroHue = 0;
    for (let i = 0; i < session.hero.identity.name.length; i++) {
      heroHue = (heroHue * 31 + session.hero.identity.name.charCodeAt(i)) >>> 0;
    }
    drawFigure(spacing, 1.35, true, heroHue % 360, session.hero.physiology.pregnant, 6);
    idx++;

    for (const c of joined) {
      let hue = 0;
      for (let i = 0; i < c.identity.name.length; i++) {
        hue = (hue * 31 + c.identity.name.charCodeAt(i)) >>> 0;
      }
      drawFigure(spacing * (idx + 1), 1.1, false, hue % 360, c.physiology.pregnant, 3);
      idx++;
    }

    // 地点名
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(6, 6, ctx.measureText(here?.name ?? "").width + 62, 20);
    ctx.fillStyle = "#e6e9ef";
    ctx.font = "12px 'Microsoft YaHei', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`${here?.name ?? "?"}　${here ? TERRAIN_LABEL[here.terrain] : ""}`, 12, 16);
  }, [session, version, height]);

  return (
    <div className="proto-pixelstrip">
      <canvas ref={ref} className="proto-pixelstrip-canvas" />
    </div>
  );
}