import { useMemo, useRef, useState } from "react";
import { renderScene, sceneLength, type DetailLevel, type Scene } from "@doomsday/core";
import { useGame } from "../store/game.ts";

const LEVELS: DetailLevel[] = ["brief", "standard", "detailed", "exhaustive"];
const LABEL: Record<DetailLevel, string> = {
  brief: "简洁", standard: "标准", detailed: "详细（默认）", exhaustive: "极详"
};

export function ScenePlayer() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const llm = useGame((s) => s.llm);
  const narrator = useGame((s) => s.narrator);
  void version;

  const [detail, setDetail] = useState<DetailLevel>("detailed");
  const [showTags, setShowTags] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [genText, setGenText] = useState("");
  const [source, setSource] = useState("");
  const abortRef = useRef(false);

  // 当前变量集下所有可触发的场景
  const available = useMemo(() => session.availableScenes(), [session, version]);

  // 当前场景：优先选中的，否则第一个可用的
  const scene: Scene | null = useMemo(() => {
    if (selected) return available.find((x) => x.id === selected) ?? null;
    return available[0] ?? null;
  }, [available, selected]);

  const text = useMemo(
    () => (scene ? renderScene(scene, { detail, showLayerTags: showTags }) : ""),
    [scene, detail, showTags]
  );
  const len = useMemo(
    () => (scene ? sceneLength(scene, { detail, showLayerTags: showTags }) : 0),
    [scene, detail, showTags]
  );

  async function generate() {
    if (!narrator) {
      setError("模型未启用，请先到「模型」标签页开启并测试连接");
      return;
    }
    if (!scene) return;
    setBusy(true);
    setError("");
    setGenText("");
    setSource("");
    abortRef.current = false;

    // 从场景参与人推断对话对象，构造提示词上下文
    const partnerName = scene.participants.find((p) => p !== "主角") ?? "";
    const partner = session.findCompanion(partnerName);

    try {
      const result = await narrator.narrateStream(
        {
          sceneId: scene.id,
          title: scene.title,
          tone: scene.tone,
          participants: [
            { name: "主角", title: "扶她御姐", physiology: session.hero.physiology.virgin ? "处女" : "" },
            partner
              ? {
                  name: partner.identity.name,
                  title: partner.identity.title,
                  relation: `好感 ${Math.round(partner.relationship.affection)} / 羁绊 Lv${partner.relationship.bond} / 欲情 ${Math.round(partner.lust.value)}`,
                  physiology: partner.physiology.virgin ? "初次" : ""
                }
              : { name: partnerName }
          ],
          props: (() => {
            const p = ["双头龙", "娱乐型扶她药"];
            if (partner) {
              const o = session.outfitOf(partner.id);
              if (o) p.push(`着装：${o.describe}（暴露度 ${o.exposure}）`);
            }
            return p;
          })(),
          direction: scene.tone,
          priorBeats: scene.beats.slice(0, 2).map((b) => b.lines[0]?.text ?? ""),
          time: `第${session.time.day}天`,
          location: "安全屋"
        },
        (delta) => {
          if (!abortRef.current) setGenText((t) => t + delta);
        },
        scene
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
      <h2>
        场景播放器　<span className="sub">
          当前可触发 {available.length} 个场景
        </span>
      </h2>

      {available.length === 0 ? (
        <p className="sub">（当前条件下没有可触发的场景。推进时间、提升好感或设置主线标志。）</p>
      ) : (
        <>
          <h3>选择场景</h3>
          <div className="controls">
            <select value={scene?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>
              {available.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}（{x.participants.join(" × ")}）
                </option>
              ))}
            </select>
          </div>

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
            <span className="sub">
              {scene?.beats.length ?? 0} 节拍 · {len} 字
            </span>
          </div>

          <pre className="scenetext">{text}</pre>

          <div className="controls" style={{ marginTop: 12 }}>
            <button onClick={generate} disabled={busy || !llm.enabled}>
              {busy ? "生成中…" : "用模型续写这一场"}
            </button>
            {busy && <button onClick={() => { abortRef.current = true; }}>停止</button>}
            {source && <span className={source === "model" ? "ok" : "sub"}>来源：{source}</span>}
            {!llm.enabled && <span className="sub">模型未启用（到「模型」标签页开启）</span>}
          </div>

          {error && <p className="warn">⚠ {error}</p>}

          {genText && (
            <pre className="scenetext" style={{ marginTop: 12, borderColor: "var(--accent)" }}>{genText}</pre>
          )}
        </>
      )}

      <p className="hint">
        场景由剧本条件实时筛选 —— 数值变化会立即改变可触发列表。
        像素／插画／Live2D 均为可选视图，订阅同一状态机。模型生成失败会自动回退到手写剧本。
      </p>
    </section>
  );
}