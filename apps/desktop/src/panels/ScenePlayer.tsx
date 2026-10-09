import { useMemo, useRef, useState } from "react";
import sceneData from "@doomsday/core/data/scenes/sister_first.json";
import {
  renderScene, sceneLength,
  type Scene, type DetailLevel,
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

const LEVELS: DetailLevel[] = ["brief", "standard", "detailed", "exhaustive"];
const LABEL: Record<DetailLevel, string> = {
  brief: "简洁", standard: "标准", detailed: "详细（默认）", exhaustive: "极详"
};

export function ScenePlayer() {
  const [detail, setDetail] = useState<DetailLevel>("detailed");
  const [showTags, setShowTags] = useState(false);
  const [source, setSource] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [genText, setGenText] = useState<string>("");
  const abortRef = useRef(false);

  const llm = useGame((s) => s.llm);
  const narrator = useGame((s) => s.narrator);

  const scripted = sceneData as unknown as Scene;
  const text = useMemo(
    () => renderScene(scripted, { detail, showLayerTags: showTags }),
    [detail, showTags, scripted]
  );
  const len = useMemo(
    () => sceneLength(scripted, { detail, showLayerTags: showTags }),
    [detail, showTags, scripted]
  );

  async function generate() {
    if (!narrator) {
      setError("模型未启用，请先到「模型」标签页开启并测试连接");
      return;
    }
    setBusy(true);
    setError("");
    setGenText("");
    abortRef.current = false;
    try {
      const result = await narrator.narrateStream(
        {
          sceneId: "sister_first",
          title: scripted.title,
          tone: scripted.tone,
          participants: [
            { name: "主角", title: "扶她御姐", physiology: "处女" },
            { name: "姐姐", title: "项目经理", relation: "好感 60 / 羁绊 Lv3 / 欲情 92" }
          ],
          props: ["双头龙"],
          direction: "姐姐主导，互相破处",
          priorBeats: ["姐姐把你按在床沿"],
          time: "第1天 22:00",
          location: "安全屋卧室"
        },
        (delta) => {
          if (!abortRef.current) setGenText((t) => t + delta);
        },
        scripted
      );
      setSource(result.source);
      if (result.error) setError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>场景播放器　<span className="sub">纯文本为主呈现层</span></h2>

      <div className="controls">
        {LEVELS.map((l) => (
          <button key={l} className={detail === l ? "tab active" : "tab"} onClick={() => setDetail(l)}>
            {LABEL[l]}
          </button>
        ))}
        <label className="chk">
          <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} />
          显示层次标签
        </label>
        <span className="sub">字数 {len}</span>
      </div>

      <pre className="scenetext">{text}</pre>

      <div className="controls" style={{ marginTop: 12 }}>
        <button onClick={generate} disabled={busy || !llm.enabled}>
          {busy ? "生成中…" : "用模型生成这一场"}
        </button>
        {busy && <button onClick={() => { abortRef.current = true; }}>停止</button>}
        {source && <span className={source === "model" ? "ok" : "sub"}>来源：{source}</span>}
        {!llm.enabled && <span className="sub">模型未启用（到「模型」标签页开启）</span>}
      </div>

      {error && <p className="warn">⚠ {error}</p>}

      {genText && (
        <pre className="scenetext" style={{ marginTop: 12, borderColor: "var(--accent)" }}>{genText}</pre>
      )}

      <p className="hint">
        像素／插画／Live2D 均为可选视图，订阅同一状态机；关闭后文本照常输出。
        模型生成失败会自动回退到左侧手写剧本。
      </p>
    </section>
  );
}
