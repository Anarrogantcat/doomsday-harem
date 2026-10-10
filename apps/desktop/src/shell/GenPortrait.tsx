import { useEffect, useState } from "react";
import {
  buildPortraitPrompt, portraitCacheKey, activePlugin, mergedParams
} from "@doomsday/core";
import { generatePortrait, cacheGet, cacheSet } from "../plugins/runtime.ts";
import { useGame } from "../store/game.ts";

/**
 * 文生图立绘。
 *
 * 行为：
 *  - 未启用 / 插件离线 / 生成失败 → 返回 null，由调用方降级到程序化立绘
 *  - 命中缓存 → 立即显示，不发请求
 *  - 生成中显示占位与进度提示
 *  - 同一角色同一状态只生成一次
 */

export interface GenPortraitProps {
  companionId: string;
  name: string;
  /** 体型描述文字（来自角色数据） */
  build: string;
  cup?: number;
  heightCm: number;
  futanari: boolean;
  pregnant: boolean;
  exposure: number;
  /** 心情文字（如「温柔」「紧张」） */
  moodText: string;
  width: number;
  height: number;
  /** 生成失败时的回调 */
  onFail?: (reason: string) => void;
  className?: string;
}

export function GenPortrait(props: GenPortraitProps) {
  const {
    companionId, name, build, cup, heightCm, futanari, pregnant,
    exposure, moodText, width, height, onFail, className
  } = props;

  const cfg = useGame((s) => s.pluginConfig);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = portraitCacheKey({
    companionId, cup, pregnant, exposure, mood: moodText, futanari
  });

  useEffect(() => {
    let cancelled = false;

    const plugin = activePlugin(cfg, "image");
    if (!plugin) { setSrc(null); return; }

    // 1) 查缓存
    const cached = cacheGet(key);
    if (cached) { setSrc(cached); setErr(null); return; }

    // 2) 生成
    setBusy(true);
    setErr(null);

    const { prompt, negative } = buildPortraitPrompt({
      name, build, cup, height: heightCm,
      futanari, pregnant, exposure, mood: moodText
    });

    generatePortrait(
      plugin.endpoint,
      { companionId, prompt, negative, width, height, seed: hashSeed(key), tags: [] },
      mergedParams(plugin, cfg)
    ).then((r) => {
      if (cancelled) return;
      setBusy(false);
      if (r.ok && r.data) {
        setSrc(r.data);
        cacheSet(key, r.data, cfg.cacheMode === "disk");
      } else {
        setErr(r.error ?? "生成失败");
        onFail?.(r.error ?? "生成失败");
      }
    }).catch((e) => {
      if (cancelled) return;
      setBusy(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      onFail?.(msg);
    });

    return () => { cancelled = true; };
  }, [key, cfg, name, build, cup, heightCm, futanari, pregnant, exposure, moodText, width, height, onFail]);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={className ?? "gen-portrait"}
        style={{ width, height, objectFit: "cover" }}
      />
    );
  }

  if (busy) {
    return (
      <div className="gen-portrait-loading" style={{ width, height }}>
        <div className="gp-spinner" />
        <span className="gp-text">生成中…</span>
        <span className="gp-sub">{name}</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="gen-portrait-error" style={{ width, height }} title={err}>
        <span className="gp-text">生成失败</span>
        <span className="gp-sub">{err.slice(0, 40)}</span>
      </div>
    );
  }

  return null;
}

/** 由缓存键派生稳定种子（同状态复用同一张图） */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2147483647;
}