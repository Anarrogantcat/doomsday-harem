/**
 * 画布渲染器 —— 实现 core 的 View 接口。
 *
 * 为什么不引入 Phaser：
 *  - 本项目 90% 的呈现是文字（核心成人内容层），视觉只是可选增强
 *  - Phaser 压缩后约 1MB，而当前整包才 367KB
 *  - 原生 Canvas 已足够实现像素精灵、地图节点、战斗布阵
 *
 * 保留接口一致性：实现 View 的 onBeat / onSceneEnd，
 * 因此切换渲染后端（含未来的 Phaser / Live2D）无需改动上层。
 */
import {
  PixelRenderer, type SceneViewState, type ViewConfig,
  type SpriteSheet, DEFAULT_VIEW_CONFIG
} from "@doomsday/core";

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** 设备像素比，用于高清屏 */
  dpr: number;
}

/** 场景渲染器的统一接口 */
export interface SceneRenderer {
  readonly id: string;
  /** 每帧绘制 */
  draw(dc: DrawContext, state: RenderState): void;
  /** 设置像素视图配置 */
  setViewConfig(cfg: ViewConfig): void;
  /** 注册精灵表 */
  registerSheet(sheet: SpriteSheet): void;
  /** 文本节拍回调（实现 View） */
  onBeat(state: SceneViewState): void;
  onSceneEnd(sceneId: string): void;
}

/** 渲染所需的全部状态 */
export interface RenderState {
  /** 当前视图模式 */
  mode: "map" | "battle" | "scene";
  /** 世界地图 */
  world: {
    current: string;
    regions: Array<{
      id: string; name: string; x: number; y: number;
      danger: number; discovered: boolean; visited: boolean;
      links: Array<{ to: string; km: number }>;
    }>;
  };
  /** 战斗状态 */
  battle?: {
    round: number;
    party: Array<{ name: string; hp: number; maxHp: number; isHero: boolean }>;
    enemies: Array<{ name: string; hp: number; maxHp: number; kind: string }>;
    log: string[];
    active: boolean;
  };
  /** 场景节拍 */
  scene?: {
    title: string;
    participants: string[];
    beatIndex: number;
    beatCount: number;
    poseKey: string;
    exposure: number;
  };
  /** 主题色 */
  theme: { accent: string; warn: string; danger: string; line: string; fg: string; sub: string };
}

const DEFAULT_THEME = {
  accent: "#c8506e", warn: "#d99a3c", danger: "#c0392b",
  line: "#262b34", fg: "#e6e9ef", sub: "#8b94a3"
};

/** 危险度配色 */
const DANGER_COLOR = ["#3a5f45", "#4a6b3f", "#8a7a3a", "#a86a35", "#a0453a", "#6b1f1f"];

export class CanvasSceneRenderer implements SceneRenderer {
  readonly id = "canvas";
  private pixel: PixelRenderer;
  private lastBeat: SceneViewState | null = null;

  constructor(cfg: ViewConfig = DEFAULT_VIEW_CONFIG) {
    this.pixel = new PixelRenderer(cfg);
  }

  setViewConfig(cfg: ViewConfig): void {
    this.pixel.setConfig(cfg);
  }

  registerSheet(sheet: SpriteSheet): void {
    this.pixel.registerSheet(sheet);
  }

  onBeat(state: SceneViewState): void {
    this.pixel.onBeat(state);
    this.lastBeat = state;
  }

  onSceneEnd(sceneId: string): void {
    this.pixel.onSceneEnd(sceneId);
  }

  get lastBeatState(): SceneViewState | null {
    return this.lastBeat;
  }

  draw(dc: DrawContext, state: RenderState): void {
    const { ctx, width, height, dpr } = dc;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    switch (state.mode) {
      case "map": this.drawMap(dc, state); break;
      case "battle": this.drawBattle(dc, state); break;
      case "scene": this.drawScene(dc, state); break;
    }
    ctx.restore();
  }

  // ---------- 世界地图 ----------

  private drawMap(dc: DrawContext, state: RenderState): void {
    const { ctx, width, height } = dc;
    const theme = state.theme;

    // 背景
    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, width, height);

    // 网格
    ctx.strokeStyle = "#1a1d23";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const byId = new Map(state.world.regions.map((r) => [r.id, r]));

    // 连线
    ctx.lineWidth = 2;
    for (const r of state.world.regions) {
      if (!r.discovered) continue;
      for (const link of r.links) {
        const t = byId.get(link.to);
        if (!t || !t.discovered) continue;
        ctx.strokeStyle = r.id === state.world.current || t.id === state.world.current
          ? "rgba(200,80,110,0.55)" : "rgba(139,148,163,0.18)";
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        // 距离标注
        const mx = (r.x + t.x) / 2;
        const my = (r.y + t.y) / 2;
        ctx.fillStyle = "rgba(139,148,163,0.5)";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`${link.km}km`, mx, my - 3);
      }
    }

    // 节点
    for (const r of state.world.regions) {
      if (!r.discovered) {
        // 未发现：只画问号
        ctx.fillStyle = "#1a1d23";
        ctx.beginPath(); ctx.arc(r.x, r.y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3a4048";
        ctx.font = "12px system-ui";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("?", r.x, r.y);
        continue;
      }

      const isCurrent = r.id === state.world.current;
      const radius = isCurrent ? 20 : 15;

      // 危险度光晕
      const glow = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, radius * 2.4);
      const dcol = DANGER_COLOR[Math.min(5, Math.max(0, r.danger))];
      glow.addColorStop(0, dcol + "cc");
      glow.addColorStop(1, dcol + "00");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(r.x, r.y, radius * 2.4, 0, Math.PI * 2); ctx.fill();

      // 本体
      ctx.fillStyle = isCurrent ? theme.accent : dcol;
      ctx.beginPath(); ctx.arc(r.x, r.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = isCurrent ? "#fff" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = isCurrent ? 3 : 1.5;
      ctx.stroke();

      // 已访问标记
      if (r.visited && !isCurrent) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(r.x + radius * 0.7, r.y - radius * 0.7, 3, 0, Math.PI * 2); ctx.fill();
      }

      // 名称
      ctx.fillStyle = theme.fg;
      ctx.font = isCurrent ? "bold 12px system-ui" : "11px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(r.name, r.x, r.y + radius + 4);
    }

    // 图例
    ctx.fillStyle = theme.sub;
    ctx.font = "11px system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("危险度：", 12, 12);
    const labels = ["安全", "低危", "中危", "高危", "极危", "死地"];
    let lx = 60;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = DANGER_COLOR[i];
      ctx.fillRect(lx, 13, 12, 10);
      ctx.fillStyle = theme.sub;
      ctx.fillText(labels[i], lx + 15, 12);
      lx += 52;
    }
  }

  // ---------- 战斗 ----------

  private drawBattle(dc: DrawContext, state: RenderState): void {
    const { ctx, width, height } = dc;
    const theme = state.theme;
    const b = state.battle;
    if (!b) return;

    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, width, height);

    // 地面
    ctx.fillStyle = "#15181d";
    ctx.fillRect(0, height * 0.62, width, height * 0.38);
    ctx.strokeStyle = "#22262e";
    ctx.beginPath(); ctx.moveTo(0, height * 0.62); ctx.lineTo(width, height * 0.62); ctx.stroke();

    // 回合数
    ctx.fillStyle = theme.sub;
    ctx.font = "12px system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`第 ${b.round} 回合${b.active ? "" : "（已结束）"}`, 12, 12);

    // 敌人（上半）
    const enemyY = height * 0.34;
    const ecw = Math.min(120, (width - 40) / Math.max(1, b.enemies.length));
    b.enemies.forEach((e, i) => {
      const x = (width - ecw * b.enemies.length) / 2 + ecw * i + ecw / 2;
      this.drawUnit(ctx, x, enemyY, e, theme.danger, true);
    });

    // 我方（下半）
    const partyY = height * 0.78;
    const pcw = Math.min(120, (width - 40) / Math.max(1, b.party.length));
    b.party.forEach((p, i) => {
      const x = (width - pcw * b.party.length) / 2 + pcw * i + pcw / 2;
      this.drawUnit(ctx, x, partyY, p, p.isHero ? theme.accent : "#4a7fa8", false);
    });

    // 日志
    const logH = 90;
    ctx.fillStyle = "rgba(13,15,18,0.92)";
    ctx.fillRect(0, height - logH, width, logH);
    ctx.strokeStyle = theme.line;
    ctx.beginPath(); ctx.moveTo(0, height - logH); ctx.lineTo(width, height - logH); ctx.stroke();

    ctx.font = "11px system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    const shown = b.log.slice(-5);
    shown.forEach((line, i) => {
      ctx.fillStyle = i === shown.length - 1 ? theme.fg : theme.sub;
      ctx.fillText(line.slice(0, 80), 12, height - logH + 8 + i * 16);
    });
  }

  private drawUnit(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    u: { name: string; hp: number; maxHp: number },
    color: string,
    isEnemy: boolean
  ): void {
    const size = 34;

    // 身体（三角形，朝向）
    ctx.fillStyle = color;
    ctx.beginPath();
    if (isEnemy) {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size * 0.7, y + size * 0.5);
      ctx.lineTo(x + size * 0.7, y + size * 0.5);
    } else {
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size * 0.7, y - size * 0.5);
      ctx.lineTo(x + size * 0.7, y - size * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 血条
    const barW = 60;
    const ratio = u.maxHp > 0 ? Math.max(0, u.hp / u.maxHp) : 0;
    const barY = isEnemy ? y + size * 0.7 : y - size * 0.9;
    ctx.fillStyle = "#22262e";
    ctx.fillRect(x - barW / 2, barY, barW, 5);
    ctx.fillStyle = ratio > 0.6 ? "#6cc07a" : ratio > 0.3 ? "#d99a3c" : "#c0392b";
    ctx.fillRect(x - barW / 2, barY, barW * ratio, 5);

    // 名称
    ctx.fillStyle = "#e6e9ef";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = isEnemy ? "bottom" : "top";
    ctx.fillText(u.name, x, isEnemy ? barY - 3 : barY + 8);
    ctx.fillStyle = "#8b94a3";
    ctx.font = "10px system-ui";
    ctx.fillText(`${Math.max(0, Math.round(u.hp))}/${Math.round(u.maxHp)}`, x, isEnemy ? barY + 8 : barY + 22);
  }

  // ---------- 场景（像素层） ----------

  private drawScene(dc: DrawContext, state: RenderState): void {
    const { ctx, width, height } = dc;
    const theme = state.theme;
    const s = state.scene;
    if (!s) return;

    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, width, height);

    // 中央像素区
    const boxSize = Math.min(width * 0.5, height * 0.5, 320);
    const bx = (width - boxSize) / 2;
    const by = height * 0.12;

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxSize, boxSize);

    // 尝试解析像素帧
    const frame = this.pixel.currentFrame(s.poseKey);
    if (frame) {
      // 有精灵表：绘制帧（此处以占位色块代替，接入真实图集后替换为 drawImage）
      const cols = Math.max(1, Math.round(boxSize / 32));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < cols; j++) {
          const alpha = ((i * 7 + j * 13 + frame.index) % 5) / 12;
          ctx.fillStyle = `rgba(200,80,110,${0.06 + alpha})`;
          ctx.fillRect(bx + i * (boxSize / cols), by + j * (boxSize / cols), boxSize / cols - 1, boxSize / cols - 1);
        }
      }
      ctx.fillStyle = theme.accent;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`帧 ${frame.index}（${frame.size}px）`, bx + boxSize / 2, by + boxSize / 2);
    } else {
      // 无精灵表：显示姿势占位
      ctx.fillStyle = theme.sub;
      ctx.font = "13px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`姿势：${s.poseKey}`, bx + boxSize / 2, by + boxSize / 2 - 12);
      ctx.fillStyle = theme.line;
      ctx.font = "11px system-ui";
      ctx.fillText("（未注册精灵表）", bx + boxSize / 2, by + boxSize / 2 + 12);
    }

    // 节拍信息
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = theme.fg;
    ctx.font = "bold 14px system-ui";
    ctx.fillText(s.title, 20, by + boxSize + 16);

    ctx.fillStyle = theme.sub;
    ctx.font = "12px system-ui";
    ctx.fillText(`节拍 ${s.beatIndex + 1}/${s.beatCount}`, 20, by + boxSize + 38);
    ctx.fillText(`参与：${s.participants.join(" × ")}`, 20, by + boxSize + 56);

    // 暴露度条
    const barW = Math.min(240, width - 40);
    ctx.fillStyle = "#22262e";
    ctx.fillRect(20, by + boxSize + 78, barW, 8);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(20, by + boxSize + 78, barW * (s.exposure / 100), 8);
    ctx.fillStyle = theme.sub;
    ctx.font = "11px system-ui";
    ctx.fillText(`暴露度 ${s.exposure}%`, 20, by + boxSize + 90);
  }
}

/** 为世界地图生成布局坐标（力导向的简化版：按区域 id 散列到网格） */
export function layoutRegions(
  regions: Array<{ id: string; danger: number; links: Array<{ to: string }> }>,
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const n = regions.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const padX = width * 0.12;
  const padY = height * 0.15;
  const cw = (width - padX * 2) / Math.max(1, cols - 1);
  const ch = (height - padY * 2) / Math.max(1, rows - 1);

  regions.forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // 用 id 的哈希做轻微抖动，避免完全对齐
    let h = 0;
    for (let k = 0; k < r.id.length; k++) h = (h * 31 + r.id.charCodeAt(k)) >>> 0;
    const jx = ((h % 17) - 8) * 1.6;
    const jy = (((h >> 4) % 17) - 8) * 1.6;
    out.set(r.id, {
      x: padX + col * cw + jx,
      y: padY + row * ch + jy
    });
  });
  return out;
}
