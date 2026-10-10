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

export function NarrationPanel({
  entries,
  index,
  onIndex,
  onGenerate,
  generating,
  streamText,
  embedded = false
}: {
  entries: NarrationEntry[];
  index: number;
  onIndex: (i: number) => void;
  onGenerate: () => void;
  generating: boolean;
  streamText: string;
  /** 嵌入中央舞台时去掉外框 */
  embedded?: boolean;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const entry = entries[index];
  const llmEnabled = useGame((s) => s.llm.enabled);
  const narrator = useGame((s) => s.narrator);

  // 切换条目时滚回顶部
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const tier = entry?.scene ? tierOfScene(entry.scene.id) : null;

  return (
    <section className={embedded ? "narration narration-embedded" : "narration"}>
      <header className="narration-head">
        <button
          className="navbtn"
          onClick={() => onIndex(Math.max(0, index - 1))}
          disabled={index <= 0}
        >
          ◀ Previous
        </button>
        <span className="narration-pos">
          {entries.length === 0 ? "—" : `${index + 1} / ${entries.length}`}
        </span>
        <button
          className="navbtn"
          onClick={() => onIndex(Math.min(entries.length - 1, index + 1))}
          disabled={index >= entries.length - 1}
        >
          Next ▶
        </button>
      </header>

      <div className="narration-body" ref={bodyRef}>
        {!entry && (
          <div className="narration-welcome">
            <div className="nw-title">末日生存·后宫</div>
            <div className="nw-body">
              <p>你是这世上唯一知道末日何时到来的人。</p>
              <p>三十天后，城市陷落。而你已经准备好了 —— 特殊 AI 写完了，安全屋建起来了，山体深处的避难所也已就位。</p>
              <p className="nw-hint">
                在右侧「行动」推进时间，或在「地图」前往其他区域，这里会出现叙事。
                按 <b>Tab</b> 切换到要塞剖面与战斗视图。
              </p>
            </div>
          </div>
        )}

        {entry && (
          <>
            {entry.title && (
              <div className="narration-title">
                {entry.title}
                {entry.meta && <span className="narration-meta">{entry.meta}</span>}
              </div>
            )}
            {entry.kind === "generated" && (
              <div className="narration-badge">本地模型生成</div>
            )}
            <div className="narration-text">{entry.text}</div>
            {tier && (
              <div className="narration-tier">分级：{describeTier(entry.scene!.id)}</div>
            )}
          </>
        )}

        {generating && (
          <div className="narration-stream">
            <div className="narration-badge">生成中…</div>
            <div className="narration-text">{streamText || "…"}</div>
          </div>
        )}
      </div>

      <footer className="narration-foot">
        {entry?.scene && (
          <button
            className="actbtn"
            onClick={onGenerate}
            disabled={generating || !llmEnabled || !narrator || tier === "critical"}
          >
            {generating
              ? "生成中…"
              : tier === "critical"
              ? "关键剧情（手写锁定）"
              : "用本地模型续写这一场"}
          </button>
        )}
        <span className="sub">
          共 {entries.length} 条记录
        </span>
      </footer>
    </section>
  );
}