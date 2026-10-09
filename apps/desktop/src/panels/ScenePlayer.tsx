import { useMemo, useState } from "react";
import sceneData from "@doomsday/core/data/scenes/sister_first.json";
import {
  renderScene, sceneLength,
  type Scene, type DetailLevel,
} from "@doomsday/core";

const LEVELS: DetailLevel[] = ["brief", "standard", "detailed", "exhaustive"];
const LABEL: Record<DetailLevel, string> = {
  brief: "简洁", standard: "标准", detailed: "详细（默认）", exhaustive: "极详"
};

export function ScenePlayer() {
  const [detail, setDetail] = useState<DetailLevel>("detailed");
  const [showTags, setShowTags] = useState(false);
  const scene = sceneData as unknown as Scene;

  const text = useMemo(() => renderScene(scene, { detail, showLayerTags: showTags }), [detail, showTags]);
  const len = useMemo(() => sceneLength(scene, { detail, showLayerTags: showTags }), [detail, showTags]);

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
      <p className="hint">像素／插画／Live2D 均为可选视图，订阅同一状态机；关闭后文本照常输出。</p>
    </section>
  );
}
