/**
 * 中栏舞台（原型 UI 移植）。
 *
 * 严格对应原型 `docs/ui-prototype.html` 的 `.stage`：
 *   .stitle   标题
 *   .smeta    参与者 × 场景调性
 *   .beat     每个节拍
 *     .bnum   节拍编号（—— 节拍 1/4 ——）
 *     .ln     普通行
 *     .ln mind   心理活动（紫色）
 *     .ln speech 对白（带 .sp 说话人）
 */
import { useEffect, useRef } from "react";
import { renderScene, tierOfScene, describeTier, type Scene } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 单条叙事记录 */
export interface NarrationEntry {
  id: number;
  kind: "narration" | "event" | "system" | "generated";
  title?: string;
  text: string;
  meta?: string;
  scene?: Scene;
}

/** 把一段文本切成节拍行 */
interface Line { type: "text" | "mind" | "speech"; text: string; sp?: string }

function toBeats(entry: NarrationEntry): Array<{ num: string; lines: Line[] }> {
  // 场景渲染后通常自带「—— 节拍 N/M ——」分隔
  const raw = entry.text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const beats: Array<{ num: string; lines: Line[] }> = [];
  let cur: { num: string; lines: Line[] } | null = null;
  let idx = 0;
  for (const line of raw) {
    const m = line.match(/^[—–-]{1,}\s*节拍\s*(\d+)\s*\/\s*(\d+)\s*[—–-]{1,}$/);
    if (m) {
      if (cur) beats.push(cur);
      cur = { num: `—— 节拍 ${m[1]}/${m[2]} ——`, lines: [] };
      continue;
    }
    if (!cur) cur = { num: "", lines: [] };
    // 对白：「名字」内容 或 名字：内容
    // 对白识别：`名字：「内容」` / `名字：内容` / `「内容」`
    const sp = line.match(/^(.{1,12}?)[：:]\s*[「『]?(.+?)[」』]?$/);
    const speech = /[：:]\s*[「『]/.test(line) || /^[「『]/.test(line) || /[」』]$/.test(line);
    if (speech && sp) {
      cur.lines.push({ type: "speech", sp: sp[1], text: sp[2] });
    } else if (/^（|^\*|心理|想/.test(line)) {
      cur.lines.push({ type: "mind", text: line });
    } else {
      cur.lines.push({ type: "text", text: line });
    }
    idx++;
  }
  if (cur) beats.push(cur);
  return beats.length > 0 ? beats : [{ num: "", lines: [{ type: "text", text: entry.text }] }];
}

export function Stage({
  entries,
  index,
  generating,
  streamText
}: {
  entries: NarrationEntry[];
  index: number;
  generating: boolean;
  streamText: string;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const entry = entries[index];
  const llmEnabled = useGame((s) => s.llm.enabled);
  const narrator = useGame((s) => s.narrator);
  const onGenerate = useGame((s) => s.refresh); // 占位：续写由父层驱动
  void llmEnabled; void narrator; void onGenerate;

  // 切换条目时滚回顶部
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const beats = entry ? toBeats(entry) : [];
  const tier = entry?.scene ? tierOfScene(entry.scene.id) : null;

  return (
    <div className="proto-stage" ref={bodyRef}>
      {!entry ? (
        <>
          <div className="proto-stitle">末日生存 · 后宫</div>
          <div className="proto-smeta">你是这世上唯一知道末日何时到来的人</div>
          <div className="proto-beat">
            <div className="proto-ln">三十天后，城市陷落。而你已经准备好了 —— 特殊 AI 写完了，安全屋建起来了，山体深处的避难所也已就位。</div>
            <div className="proto-ln proto-mind">在右侧推进时间，或在地图前往其他区域。</div>
          </div>
        </>
      ) : (
        <>
          <div className="proto-stitle">{entry.title ?? "叙事"}</div>
          {entry.meta ? <div className="proto-smeta">{entry.meta}</div> : null}
          {entry.kind === "generated" ? (
            <div className="proto-ln" style={{ color: "var(--accent-lt)", fontSize: ".78em" }}>本地模型生成</div>
          ) : null}

          {beats.map((b, bi) => (
            <div className="proto-beat" key={bi}>
              {b.num ? <div className="proto-bnum">{b.num}</div> : null}
              {b.lines.map((l, li) =>
                l.type === "speech" ? (
                  <div className="proto-ln proto-speech" key={li}>
                    {l.sp ? <span className="proto-sp">{l.sp}</span> : null}
                    「{l.text}」
                  </div>
                ) : (
                  <div className={"proto-ln" + (l.type === "mind" ? " proto-mind" : "")} key={li}>
                    {l.text}
                  </div>
                )
              )}
            </div>
          ))}

          {tier ? <div className="proto-ln" style={{ color: "var(--dim)", fontSize: ".78em" }}>分级：{describeTier(entry.scene!.id)}</div> : null}
        </>
      )}

      {generating ? (
        <div className="proto-beat">
          <div className="proto-bnum">—— 生成中 ——</div>
          <div className="proto-ln">{streamText || "…"}</div>
        </div>
      ) : null}
    </div>
  );
}

/** 中栏舞台标签（原型 .ctabs：只有 叙事 / 战斗） */
export type CenterTab = "narration" | "combat";

export function CenterTabs({
  tab,
  onTab,
  combat
}: {
  tab: CenterTab;
  onTab: (t: CenterTab) => void;
  combat: boolean;
}) {
  return (
    <div className="proto-ctabs">
      <button className={"proto-ctab" + (tab === "narration" ? " proto-on" : "")} onClick={() => onTab("narration")}>叙事</button>
      <button className={"proto-ctab" + (tab === "combat" ? " proto-on" : "")} onClick={() => onTab("combat")}>
        战斗{combat ? " ●" : ""}
      </button>
      <span className="proto-chint">视图随操作自动切换</span>
    </div>
  );
}
