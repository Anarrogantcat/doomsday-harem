import { useEffect, useRef, useCallback } from "react";
import {
  REGIONS, neighbors, effectiveDanger, exposure,
  type SpriteSheet, type ViewConfig, DEFAULT_VIEW_CONFIG
} from "@doomsday/core";
import { CanvasSceneRenderer, layoutRegions, type RenderState, type DrawContext } from "../render/CanvasSceneRenderer.ts";
import { useGame } from "../store/game.ts";

const THEME = {
  accent: "#c8506e", warn: "#d99a3c", danger: "#c0392b",
  line: "#262b34", fg: "#e6e9ef", sub: "#8b94a3"
};

export function CanvasView({ mode }: { mode: "map" | "battle" | "scene" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasSceneRenderer | null>(null);
  const rafRef = useRef<number>(0);

  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const pixelCfg = useGame((s) => s.pixelConfig);
  const setPixelConfig = useGame((s) => s.setPixelConfig);
  void version;

  // 初始化渲染器
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new CanvasSceneRenderer(pixelCfg);
    }
    rendererRef.current.setViewConfig(pixelCfg);
  }, [pixelCfg]);

  // 构建渲染状态
  const buildState = useCallback((): RenderState => {
    const w = session.world;

    if (mode === "map") {
      // 布局：固定尺寸下计算，绘制时按画布尺寸缩放
      const layout = layoutRegions(
        REGIONS.map((r) => ({ id: r.id, danger: r.danger, links: r.links })),
        900, 520
      );
      return {
        mode: "map",
        theme: THEME,
        world: {
          current: w.current,
          regions: REGIONS.map((r) => {
            const pos = layout.get(r.id) ?? { x: 0, y: 0 };
            const st = w.regions[r.id];
            return {
              id: r.id,
              name: r.name,
              x: pos.x,
              y: pos.y,
              danger: effectiveDanger(w, r.id),
              discovered: st?.discovered ?? false,
              visited: st?.visited ?? false,
              links: r.links
            };
          })
        }
      };
    }

    if (mode === "scene") {
      const scenes = session.availableScenes();
      const first = scenes[0];
      const partner = first?.participants.find((p) => p !== "主角") ?? "";
      const c = session.findCompanion(partner);
      const exp = c ? exposure(c.wardrobe) : exposure(session.hero.wardrobe);
      return {
        mode: "scene",
        theme: THEME,
        world: { current: w.current, regions: [] },
        scene: first
          ? {
              title: first.title,
              participants: first.participants,
              beatIndex: 0,
              beatCount: first.beats.length,
              poseKey: first.beats[0]?.poseKey ?? "idle",
              exposure: exp
            }
          : undefined
      };
    }

    // battle：从防御事件推导一个演示布阵
    const joined = session.joined();
    return {
      mode: "battle",
      theme: THEME,
      world: { current: w.current, regions: [] },
      battle: {
        round: 1,
        party: [
          { name: "主角", hp: session.hero.survival.stamina, maxHp: 100, isHero: true },
          ...joined.slice(0, 3).map((c) => ({
            name: c.identity.name,
            hp: 80, maxHp: 100, isHero: false
          }))
        ],
        enemies: [
          { name: "变异体", hp: 60, maxHp: 60, kind: "mutant" },
          { name: "变异体", hp: 45, maxHp: 60, kind: "mutant" }
        ],
        log: [
          "战斗开始。",
          `主角挥刀击中变异体（-15）。`,
          "变异体朝你扑来。"
        ],
        active: true
      }
    };
  }, [session, mode]);

  // 绘制循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dc: DrawContext = { ctx, width: rect.width, height: rect.height, dpr };
      rendererRef.current?.draw(dc, buildState());
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [buildState]);

  const registerDemoSheet = () => {
    const sheet: SpriteSheet = {
      id: "demo_32",
      columns: 4,
      frameSize: 32,
      fallback: 0,
      frames: { push_down: 0, straddle: 1, sink: 2, slow: 3, faster: 4, climax: 5, afterglow: 6 }
    };
    rendererRef.current?.registerSheet(sheet);
    setPixelConfig({ ...pixelCfg, pixel: "keyframe" });
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 520, display: "block", borderRadius: 8, border: "1px solid var(--line)" }}
      />
      <div className="controls" style={{ marginTop: 8 }}>
        <button onClick={registerDemoSheet}>注册示例精灵表</button>
        {(["off", "keyframe", "full"] as ViewConfig["pixel"][]).map((m) => (
          <button
            key={m}
            className={pixelCfg.pixel === m ? "tab active" : "tab"}
            onClick={() => setPixelConfig({ ...pixelCfg, pixel: m })}
          >
            像素：{m === "off" ? "关闭" : m === "keyframe" ? "关键帧" : "全程"}
          </button>
        ))}
        <span className="sub">
          渲染后端：Canvas（实现 core 的 View 接口，可替换为 Phaser / Live2D）
        </span>
      </div>
    </div>
  );
}
