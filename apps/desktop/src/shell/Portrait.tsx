import { useMemo, useState } from "react";
/**
 * 程序化角色头像。
 *
 * 无美术资源时用 SVG 剪影；接入真实立绘后只需替换本组件，
 * 其余布局不动。外观参数来自角色数据（身高、体型、性格、心情）。
 */

/** 可用的像素头像数量（Kenney Roguelike Characters, CC0） */
export const AVATAR_COUNT = 14;

/** 像素头像路径 */
export function avatarPath(index: number): string {
  return `/assets/avatars/av${String((index % AVATAR_COUNT) + 1).padStart(2, "0")}.png`;
}

/** 按角色名稳定映射到某张头像 */
export function avatarFor(name: string): string {
  return avatarPath(hashHue(name) % AVATAR_COUNT);
}

import { rigToDataUri, buildFromText, activePlugin } from "@doomsday/core";
import type { Wardrobe } from "@doomsday/core";
import { GenPortrait } from "./GenPortrait.tsx";
import { useGame } from "../store/game.ts";

export interface PortraitProps {
  name: string;
  /** 心情 0-100，影响表情 */
  mood?: number;
  /** 是否怀孕，影响腹部轮廓 */
  pregnant?: boolean;
  /** 暴露度 0-100，影响衣着覆盖 */
  exposure?: number;
  /** 尺寸 */
  size?: number;
  /** 是否选中态 */
  active?: boolean;
  /** 使用真实像素头像（默认 true，加载失败时回退 SVG） */
  useSprite?: boolean;
  /** 显示模式：头像（方形裁切）或全身立绘 */
  mode?: "avatar" | "full";
  /** 着装（全身立绘用） */
  wardrobe?: Wardrobe | null;
  heightCm?: number;
  /** 体型：数值 0-1 或角色数据里的描述文字 */
  build?: number | string;
  pregnancyProgress?: number;
  lust?: number;
  personality?: string;
  futanari?: boolean;
  /** 角色 id（文生图需要） */
  companionId?: string;
  /** 罩杯 0-7 */
  cup?: number;
}

/** 按名字散列出稳定色相 */
function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Portrait({
  name, mood = 60, pregnant = false, exposure = 10, size = 96, active = false,
  useSprite = true, mode = "avatar", wardrobe = null, heightCm = 168, build = 0.5 as number | string,
  pregnancyProgress = 0, lust = 30, personality, futanari = false,
  companionId, cup
}: PortraitProps) {
  // 全身立绘模式：优先文生图，失败降级程序化
  const pluginCfg = useGame((s) => s.pluginConfig);
  const genAvailable = activePlugin(pluginCfg, "image") !== null;

  const buildNum = typeof build === "number" ? build : buildFromText(build);

  const uri = useMemo(
    () => rigToDataUri({
      name, heightCm, build: buildNum, pregnant, pregnancyProgress,
      wardrobe, exposure, mood, lust, personality, futanari,
      width: size, height: Math.round(size * 1.75)
    }),
    [name, heightCm, buildNum, pregnant, pregnancyProgress, wardrobe, exposure, mood, lust, personality, futanari, size]
  );

  const [genFailed, setGenFailed] = useState(false);

  if (mode === "full") {
    const h = Math.round(size * 1.75);

    // 文生图可用且未失败 → 用它
    if (genAvailable && !genFailed && companionId) {
      return (
        <div className={`rig-wrap ${active ? "active" : ""}`} style={{ width: size, height: h }}>
          <GenPortrait
            companionId={companionId}
            name={name}
            build={typeof build === "string" ? build : ""}
            cup={cup}
            heightCm={heightCm}
            futanari={futanari}
            pregnant={pregnant}
            exposure={exposure}
            moodText={moodTextFrom(mood, lust)}
            width={size}
            height={h}
            className="rig-img"
            onFail={() => setGenFailed(true)}
          />
        </div>
      );
    }

    return (
      <div className={`rig-wrap ${active ? "active" : ""}`} style={{ width: size, height: h }}>
        <img src={uri} alt={name} className="rig-img" style={{ width: size, height: h }} />
      </div>
    );
  }

  // 优先使用像素头像
  if (useSprite) {
    return (
      <div className="portrait-sprite-wrap" style={{ width: size, height: size }}>
        <img
          src={avatarFor(name)}
          alt={name}
          className={`portrait-sprite ${active ? "active" : ""}`}
          style={{ width: size, height: size }}
          onError={(e) => {
            // 加载失败时隐藏图片，露出底下的 SVG 兜底
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {pregnant && <span className="portrait-mark preg" title="怀孕">孕</span>}
        {exposure > 70 && <span className="portrait-mark nude" title="高暴露">裸</span>}
      </div>
    );
  }

  const hue = hashHue(name);
  const skin = `hsl(${hue}, 24%, 74%)`;
  const hair = `hsl(${(hue + 200) % 360}, 32%, 26%)`;
  // 暴露度越高，衣着越少
  const clothAlpha = Math.max(0.25, 1 - exposure / 130);
  const cloth = `hsl(${(hue + 40) % 360}, 42%, 44%)`;

  return (
    <svg viewBox="0 0 120 170" width={size} height={size * (170 / 120)} className="portrait-svg">
      <defs>
        <linearGradient id={`pb-${name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? "#3a2233" : "#241c2c"} />
          <stop offset="100%" stopColor="#14101a" />
        </linearGradient>
      </defs>
      <rect width="120" height="170" fill={`url(#pb-${name})`} />

      {/* 头 */}
      <ellipse cx="60" cy="42" rx="21" ry="25" fill={skin} />
      {/* 发 */}
      <path d="M39 42 Q58 10 81 42 Q83 26 74 17 Q60 5 46 17 Q37 26 39 42 Z" fill={hair} />
      {/* 颈 */}
      <rect x="54" y="62" width="12" height="10" fill={skin} />

      {/* 躯干 + 衣着 */}
      <path d="M60 72 Q42 76 38 100 L38 132 L82 132 L82 100 Q78 76 60 72 Z" fill={cloth} opacity={clothAlpha} />
      {/* 皮肤底色（衣着透明时透出） */}
      <path d="M60 72 Q42 76 38 100 L38 132 L82 132 L82 100 Q78 76 60 72 Z" fill={skin} opacity={0.35} />
      {/* 胸 */}
      <ellipse cx="50" cy="92" rx="10" ry="9" fill={cloth} opacity={clothAlpha} />
      <ellipse cx="70" cy="92" rx="10" ry="9" fill={cloth} opacity={clothAlpha} />

      {/* 怀孕隆起 */}
      {pregnant && <ellipse cx="60" cy="117" rx="21" ry="17" fill={cloth} opacity={clothAlpha * 0.95} />}

      {/* 腿 */}
      <rect x="44" y="132" width="12" height="30" fill={cloth} opacity={clothAlpha} />
      <rect x="64" y="132" width="12" height="30" fill={cloth} opacity={clothAlpha} />

      {/* 表情 */}
      <circle cx="52" cy="40" r="2.3" fill="#1a1420" />
      <circle cx="68" cy="40" r="2.3" fill="#1a1420" />
      <path
        d={mood > 65 ? "M53 50 Q60 56 67 50" : mood > 32 ? "M53 51 L67 51" : "M53 54 Q60 48 67 54"}
        stroke="#1a1420" strokeWidth="1.7" fill="none" strokeLinecap="round"
      />
      {/* 腮红（心情高或欲情高时） */}
      {mood > 70 && (
        <>
          <ellipse cx="46" cy="47" rx="4" ry="2.5" fill="#c8506e" opacity="0.28" />
          <ellipse cx="74" cy="47" rx="4" ry="2.5" fill="#c8506e" opacity="0.28" />
        </>
      )}
    </svg>
  );
}

/** 由心情值与欲情推断心情文字（供文生图提示词） */
function moodTextFrom(mood: number, lust: number): string {
  if (lust > 75) return "欲情";
  if (mood >= 80) return "开心";
  if (mood >= 60) return "温柔";
  if (mood >= 40) return "平静";
  if (mood >= 25) return "疲惫";
  return "紧张";
}
